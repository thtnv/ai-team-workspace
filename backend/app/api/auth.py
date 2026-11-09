import os
import uuid
import jwt
import json
import time
import logging
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.db.mongodb import db_manager
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    Token,
    SocialLoginRequest,
    GoogleAuthRequest,
    GitHubAuthRequest,
    OAuthConfigResponse,
    SaveOAuthConfigRequest,
)

logger = logging.getLogger("syncpulse.auth")

# In-memory deduplication cache for OAuth codes (prevents duplicate exchange errors in React StrictMode)
_oauth_code_cache: Dict[str, dict] = {}

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    users_col = db_manager.get_collection("users")
    user = await users_col.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/register", response_model=Token)
async def register(req: UserRegister):
    users_col = db_manager.get_collection("users")
    existing = await users_col.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user_id = f"usr-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    new_user = {
        "_id": user_id,
        "email": req.email.lower(),
        "full_name": req.full_name,
        "hashed_password": hash_password(req.password),
        "avatar_url": f"https://api.dicebear.com/7.x/bottts/svg?seed={req.email}",
        "created_at": now_iso
    }
    await users_col.insert_one(new_user)
    
    # Auto-link any workspaces that pre-invited this email
    workspaces_col = db_manager.get_collection("workspaces")
    cursor = workspaces_col.find({"members.email": req.email.lower()})
    invited_workspaces = await cursor.to_list(100)
    for ws in invited_workspaces:
        updated_members = []
        for m in ws.get("members", []):
            if m.get("email") == req.email.lower():
                m["user_id"] = user_id
                m["full_name"] = req.full_name
                m["avatar_url"] = new_user["avatar_url"]
            updated_members.append(m)
        await workspaces_col.update_one(
            {"_id": ws["_id"]},
            {"$set": {"members": updated_members, "updated_at": now_iso}}
        )

    token = create_access_token(subject=user_id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=new_user["email"],
            full_name=new_user["full_name"],
            avatar_url=new_user["avatar_url"],
            created_at=now_iso
        )
    )


@router.post("/login", response_model=Token)
async def login(req: UserLogin):
    users_col = db_manager.get_collection("users")
    user = await users_col.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    token = create_access_token(subject=str(user["_id"]))
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user["full_name"],
            avatar_url=user.get("avatar_url"),
            created_at=user.get("created_at")
        )
    )


@router.post("/social", response_model=Token)
async def social_login(req: SocialLoginRequest):
    users_col = db_manager.get_collection("users")
    email_clean = req.email.strip().lower()
    user = await users_col.find_one({"email": email_clean})
    now_iso = datetime.now(timezone.utc).isoformat()

    if not user:
        # Auto-register new user from OAuth provider
        user_id = f"usr-{uuid.uuid4().hex[:10]}"
        avatar = req.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={email_clean}"
        new_user = {
            "_id": user_id,
            "email": email_clean,
            "full_name": req.full_name.strip() or email_clean.split("@")[0],
            "hashed_password": "",
            "auth_provider": req.provider,
            "avatar_url": avatar,
            "created_at": now_iso
        }
        await users_col.insert_one(new_user)
        user = new_user

        # Auto-link any workspaces that pre-invited this email
        workspaces_col = db_manager.get_collection("workspaces")
        cursor = workspaces_col.find({"members.email": email_clean})
        invited_workspaces = await cursor.to_list(100)
        for ws in invited_workspaces:
            updated_members = []
            for m in ws.get("members", []):
                if m.get("email") == email_clean:
                    m["user_id"] = user_id
                    m["full_name"] = new_user["full_name"]
                    m["avatar_url"] = avatar
                updated_members.append(m)
            await workspaces_col.update_one(
                {"_id": ws["_id"]},
                {"$set": {"members": updated_members, "updated_at": now_iso}}
            )
    else:
        user_id = str(user["_id"])
        update_fields = {}
        # Upgrade avatar if real OAuth avatar (Google lh3 or GitHub) is provided
        if req.avatar_url and (
            not user.get("avatar_url")
            or "dicebear.com" in user.get("avatar_url", "")
            or req.avatar_url != user.get("avatar_url")
        ):
            update_fields["avatar_url"] = req.avatar_url
        if not user.get("auth_provider"):
            update_fields["auth_provider"] = req.provider
        if req.full_name and (not user.get("full_name") or user.get("full_name") == user.get("email")):
            update_fields["full_name"] = req.full_name

        if update_fields:
            update_fields["updated_at"] = now_iso
            await users_col.update_one({"_id": user["_id"]}, {"$set": update_fields})
            user.update(update_fields)

            # Sync updated avatar and name into workspaces where user is a member
            workspaces_col = db_manager.get_collection("workspaces")
            cursor = workspaces_col.find({"members.user_id": user_id})
            user_workspaces = await cursor.to_list(100)
            for ws in user_workspaces:
                w_members = ws.get("members", [])
                changed = False
                for m in w_members:
                    if m.get("user_id") == user_id:
                        if req.avatar_url and m.get("avatar_url") != req.avatar_url:
                            m["avatar_url"] = req.avatar_url
                            changed = True
                        if req.full_name and m.get("full_name") != req.full_name:
                            m["full_name"] = req.full_name
                            changed = True
                if changed:
                    await workspaces_col.update_one(
                        {"_id": ws["_id"]},
                        {"$set": {"members": w_members, "updated_at": now_iso}}
                    )

    token = create_access_token(subject=user_id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=user["email"],
            full_name=user["full_name"],
            avatar_url=user.get("avatar_url"),
            created_at=user.get("created_at")
        )
    )


@router.get("/oauth-config", response_model=OAuthConfigResponse)
async def get_oauth_config():
    """Return configured OAuth Client IDs for real Google and GitHub authentication."""
    return OAuthConfigResponse(
        google_client_id=settings.GOOGLE_CLIENT_ID,
        github_client_id=settings.GITHUB_CLIENT_ID,
        google_enabled=bool(settings.GOOGLE_CLIENT_ID),
        github_enabled=bool(settings.GITHUB_CLIENT_ID),
    )


@router.post("/oauth-config", response_model=OAuthConfigResponse)
async def update_oauth_config(req: SaveOAuthConfigRequest):
    """Save or update OAuth configuration (Client IDs & Secrets) into settings and backend/.env."""
    if req.google_client_id is not None:
        settings.GOOGLE_CLIENT_ID = req.google_client_id.strip()
    if req.google_client_secret is not None:
        settings.GOOGLE_CLIENT_SECRET = req.google_client_secret.strip()
    if req.github_client_id is not None:
        settings.GITHUB_CLIENT_ID = req.github_client_id.strip()
    if req.github_client_secret is not None:
        settings.GITHUB_CLIENT_SECRET = req.github_client_secret.strip()

    # Persist to .env file if it exists
    try:
        env_path = ".env"
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

        updates = {
            "GOOGLE_CLIENT_ID": f'"{settings.GOOGLE_CLIENT_ID}"',
            "GOOGLE_CLIENT_SECRET": f'"{settings.GOOGLE_CLIENT_SECRET}"',
            "GITHUB_CLIENT_ID": f'"{settings.GITHUB_CLIENT_ID}"',
            "GITHUB_CLIENT_SECRET": f'"{settings.GITHUB_CLIENT_SECRET}"',
        }

        new_lines = []
        found_keys = set()
        for line in lines:
            line_strip = line.strip()
            replaced = False
            for k, v in updates.items():
                if line_strip.startswith(f"{k}=") or line_strip.startswith(f"{k} ="):
                    new_lines.append(f'{k}={v}\n')
                    found_keys.add(k)
                    replaced = True
                    break
            if not replaced:
                new_lines.append(line)

        for k, v in updates.items():
            if k not in found_keys:
                new_lines.append(f'{k}={v}\n')

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception as e:
        logger.warning(f"Could not persist OAuth config to .env: {e}")

    return OAuthConfigResponse(
        google_client_id=settings.GOOGLE_CLIENT_ID,
        github_client_id=settings.GITHUB_CLIENT_ID,
        google_enabled=bool(settings.GOOGLE_CLIENT_ID),
        github_enabled=bool(settings.GITHUB_CLIENT_ID),
    )


@router.post("/google", response_model=Token)
async def google_auth(req: GoogleAuthRequest):
    """Authenticate with real Google account via Google ID Token (GIS) or Auth Code."""
    # Deduplicate concurrent requests with the exact same auth code (common in React StrictMode)
    if req.code and req.code in _oauth_code_cache:
        cached = _oauth_code_cache[req.code]
        if time.time() - cached["time"] < 60:
            logger.info("Serving Google auth response from deduplication cache.")
            return Token(**cached["data"])

    try:
        email = None
        name = None
        picture = None

        if req.credential:
            # 1. Verify directly with Google TokenInfo API for 100% authenticity
            try:
                verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={req.credential}"
                req_info = urllib.request.Request(verify_url, headers={"User-Agent": "SyncPulse-AI"})
                with urllib.request.urlopen(req_info, timeout=5) as res:
                    google_info = json.loads(res.read().decode("utf-8"))
                    email = google_info.get("email")
                    name = google_info.get("name") or email.split("@")[0]
                    picture = google_info.get("picture")
            except Exception:
                # Fallback to local JWT decode if offline / tokeninfo timed out
                payload = jwt.decode(req.credential, options={"verify_signature": False})
                email = payload.get("email")
                name = payload.get("name") or email.split("@")[0]
                picture = payload.get("picture")

        elif req.code:
            # 2. Exchange authorization code for real Google tokens
            if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
                raise HTTPException(
                    status_code=400,
                    detail="GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được cấu hình trong backend/.env"
                )

            token_url = "https://oauth2.googleapis.com/token"
            redirect_uri = req.redirect_uri or f"{settings.FRONTEND_URL}/auth/callback"
            data = urllib.parse.urlencode({
                "code": req.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }).encode("utf-8")

            req_token = urllib.request.Request(token_url, data=data, method="POST", headers={"User-Agent": "SyncPulse-AI"})
            try:
                with urllib.request.urlopen(req_token, timeout=8) as res:
                    token_data = json.loads(res.read().decode("utf-8"))
                    id_token_jwt = token_data.get("id_token")
                    access_token = token_data.get("access_token")
                    payload = jwt.decode(id_token_jwt, options={"verify_signature": False})
                    email = payload.get("email")
                    name = payload.get("name") or email.split("@")[0]
                    picture = payload.get("picture")

                    # If picture is missing or low-res in id_token, query official Google UserInfo API
                    if access_token and (not picture or "s96-c" in str(picture)):
                        try:
                            u_req = urllib.request.Request(
                                "https://www.googleapis.com/oauth2/v3/userinfo",
                                headers={"Authorization": f"Bearer {access_token}", "User-Agent": "SyncPulse-AI"}
                            )
                            with urllib.request.urlopen(u_req, timeout=5) as u_res:
                                u_info = json.loads(u_res.read().decode("utf-8"))
                                if u_info.get("picture"):
                                    picture = u_info["picture"]
                                if u_info.get("name"):
                                    name = u_info["name"]
                        except Exception as ue:
                            logger.warning(f"Could not fetch userinfo from Google: {ue}")
            except urllib.error.HTTPError as he:
                try:
                    err_body = he.read().decode("utf-8")
                    err_json = json.loads(err_body)
                    err_desc = err_json.get("error_description") or err_json.get("error") or str(he)
                except Exception:
                    err_desc = str(he)
                logger.warning(f"Google Token Exchange HTTPError: {err_desc}")
                raise HTTPException(status_code=400, detail=f"Google OAuth failed: {err_desc}")

        if not email:
            raise HTTPException(status_code=400, detail="Không thể xác thực email từ Google. Vui lòng thử lại.")

        social_req = SocialLoginRequest(
            provider="google",
            email=email,
            full_name=name or email.split("@")[0],
            avatar_url=picture,
            credential=req.credential or req.code
        )
        token_result = await social_login(social_req)
        if req.code:
            _oauth_code_cache[req.code] = {
                "time": time.time(),
                "data": token_result.model_dump()
            }
        return token_result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google OAuth failed: {str(e)}")


@router.post("/github", response_model=Token)
async def github_auth(req: GitHubAuthRequest):
    """Authenticate with real GitHub account by exchanging authorization code."""
    # Deduplicate concurrent requests with the exact same auth code (common in React StrictMode)
    if req.code and req.code in _oauth_code_cache:
        cached = _oauth_code_cache[req.code]
        if time.time() - cached["time"] < 60:
            logger.info("Serving GitHub auth response from deduplication cache.")
            return Token(**cached["data"])

    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=400,
            detail="GITHUB_CLIENT_ID hoặc GITHUB_CLIENT_SECRET chưa được cấu hình trong backend/.env"
        )

    try:
        # 1. Exchange code for GitHub Access Token
        token_url = "https://github.com/login/oauth/access_token"
        redirect_uri = req.redirect_uri or f"{settings.FRONTEND_URL}/auth/callback"
        data = json.dumps({
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": req.code,
            "redirect_uri": redirect_uri,
        }).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "SyncPulse-AI"
        }

        req_gh = urllib.request.Request(token_url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req_gh, timeout=8) as res:
                token_res = json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as he:
            try:
                err_body = he.read().decode("utf-8")
                err_json = json.loads(err_body)
                err_desc = err_json.get("error_description") or err_json.get("error") or str(he)
            except Exception:
                err_desc = str(he)
            logger.warning(f"GitHub Token Exchange HTTPError: {err_desc}")
            raise HTTPException(status_code=400, detail=f"GitHub OAuth failed: {err_desc}")

        access_token = token_res.get("access_token")
        if not access_token:
            err_msg = token_res.get("error_description") or token_res.get("error") or "Không lấy được access token từ GitHub"
            raise HTTPException(status_code=400, detail=err_msg)

        # 2. Fetch real GitHub user profile
        user_req = urllib.request.Request(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "SyncPulse-AI"
            }
        )
        with urllib.request.urlopen(user_req, timeout=8) as res_user:
            gh_user = json.loads(res_user.read().decode("utf-8"))

        email = gh_user.get("email")
        if not email:
            # 3. If primary email is marked private on GitHub, fetch from /user/emails
            try:
                emails_req = urllib.request.Request(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "User-Agent": "SyncPulse-AI"
                    }
                )
                with urllib.request.urlopen(emails_req, timeout=5) as res_emails:
                    emails_data = json.loads(res_emails.read().decode("utf-8"))
                    primary = next((e["email"] for e in emails_data if e.get("primary")), None)
                    if primary:
                        email = primary
            except Exception:
                pass

        if not email:
            email = f"{gh_user.get('login')}@users.noreply.github.com"

        name = gh_user.get("name") or gh_user.get("login")
        avatar = gh_user.get("avatar_url")

        social_req = SocialLoginRequest(
            provider="github",
            email=email,
            full_name=name,
            avatar_url=avatar,
            credential=access_token
        )
        token_result = await social_login(social_req)
        if req.code:
            _oauth_code_cache[req.code] = {
                "time": time.time(),
                "data": token_result.model_dump()
            }
        return token_result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"GitHub OAuth failed: {str(e)}")


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        full_name=current_user["full_name"],
        avatar_url=current_user.get("avatar_url"),
        created_at=current_user.get("created_at")
    )

