from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserCreate, UserOut, Token
from pydantic import BaseModel, Field, field_validator
from app.crud.user import get_user_by_email, create_user
from app.core.security import verify_password, create_access_token, hash_password
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.services.notifications_external import send_email

from datetime import datetime, timedelta
import random
import string


router = APIRouter()


# ==========================================
# SIGNUP
# ==========================================

@router.post(
    "/signup",
    response_model=UserOut
)
def signup(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):

    existing_user = get_user_by_email(
        db,
        user_in.email
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = create_user(
        db=db,
        email=user_in.email,
        password=user_in.password,
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=user_in.role
    )

    return user


class OTPVerifyRequest(BaseModel):
    email: str
    otp_code: str


# ==========================================
# LOGIN (Step 1 - Send OTP)
# ==========================================

@router.post(
    "/login"
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    # Find user by email
    user = get_user_by_email(
        db,
        form_data.username
    )

    # User doesn't exist
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    # Verify password
    if not verify_password(
        form_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    # Generate OTP
    otp_code = ''.join(random.choices(string.digits, k=6))
    user.otp_code = otp_code
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Send OTP via email
    send_email(
        to_email=user.email,
        subject="Your FleetFlow Login Code",
        html_content=f"Your login code is {otp_code}. It expires in 10 minutes."
    )

    return {
        "message": "OTP sent to email",
        "email": user.email
    }


# ==========================================
# VERIFY OTP (Step 2 - Issue JWT)
# ==========================================

@router.post(
    "/verify-otp",
    response_model=Token
)
def verify_otp(
    req: OTPVerifyRequest,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, req.email)
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or OTP")
        
    if user.otp_code != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    if user.otp_expires_at and datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP code expired")
        
    # Clear OTP
    # Clear OTP
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    # Convert role to string
    role = (
        user.role.value
        if hasattr(user.role, "value")
        else str(user.role)
    )

    # Issue JWT
    access_token = create_access_token(
        data={"sub": user.email, "role": role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ==========================================
# FORGOT PASSWORD
# ==========================================

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, req.email)
    if not user:
        # Generic response to prevent email enumeration
        return {"message": "If an account with that email exists, a recovery code has been sent."}

    # Generate OTP
    otp_code = ''.join(random.choices(string.digits, k=6))
    user.otp_code = otp_code
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Send recovery email
    send_email(
        to_email=user.email,
        subject="Your FleetFlow Password Reset Code",
        html_content=f"Your password reset code is {otp_code}. It expires in 10 minutes."
    )

    return {"message": "If an account with that email exists, a recovery code has been sent."}


class ResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one number")
        special_chars = "!@#$%^&*(),.?\":{}|<>"
        if not any(char in special_chars for char in v):
            raise ValueError("Password must contain at least one special character")
        return v

@router.post("/reset-password")
def reset_password(
    req: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, req.email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or OTP")
    
    if user.otp_code != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if not user.otp_expires_at or user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    # Valid OTP, reset password
    user.password = hash_password(req.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    
    return {"message": "Password successfully reset."}


# ==========================================
# CURRENT USER
# ==========================================

@router.get(
    "/me",
    response_model=UserOut
)
def get_me(
    current_user: User = Depends(get_current_user)
):

    return current_user


# ==========================================
# ADMIN ONLY - RBAC TEST
# ==========================================

@router.get("/admin-only")
def admin_only(
    current_user: User = Depends(
        require_roles("Admin")
    )
):

    return {
        "message": "Admin access granted",
        "user": current_user.email,
        "role": current_user.role.value
    }


# ==========================================
# ADMIN + FLEET MANAGER - RBAC TEST
# ==========================================

@router.get("/management")
def management_access(
    current_user: User = Depends(
        require_roles(
            "Admin",
            "FleetManager"
        )
    )
):

    return {
        "message": "Management access granted",
        "user": current_user.email,
        "role": current_user.role.value
    }


# ==========================================
# ADMIN + FLEET MANAGER + DISPATCHER
# ==========================================

@router.get("/dispatch")
def dispatch_access(
    current_user: User = Depends(
        require_roles(
            "Admin",
            "FleetManager",
            "Dispatcher"
        )
    )
):

    return {
        "message": "Dispatch access granted",
        "user": current_user.email,
        "role": current_user.role.value
    }