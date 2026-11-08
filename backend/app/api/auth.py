import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from app.db.mongodb import db_manager
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.schemas.user import UserRegister, UserLogin, UserResponse, Token

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


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        full_name=current_user["full_name"],
        avatar_url=current_user.get("avatar_url"),
        created_at=current_user.get("created_at")
    )

