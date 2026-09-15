from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.schemas.user import UserOut
from app.core.deps import get_current_user, require_roles


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# ============================================================
# SCHEMAS
# ============================================================

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserEmailUpdate(BaseModel):
    email: str


class UserPasswordUpdate(BaseModel):
    old_password: str
    new_password: str


class UserRoleUpdate(BaseModel):
    role: RoleEnum


# ============================================================
# GET ALL USERS — Admin only
# ============================================================

@router.get(
    "/",
    response_model=list[UserOut],
)
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(RoleEnum.Admin, RoleEnum.FleetManager)
    ),
):
    return (
        db.query(User)
        .order_by(User.created_at.desc())
        .all()
    )


# ============================================================
# GET CURRENT USER PROFILE
# ============================================================

@router.get(
    "/me",
    response_model=UserOut,
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


# ============================================================
# UPDATE CURRENT USER PROFILE
# ============================================================

@router.put(
    "/me",
    response_model=UserOut,
)
def update_my_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name

    if profile_data.phone is not None:
        current_user.phone = profile_data.phone

    db.commit()
    db.refresh(current_user)

    return current_user


# ============================================================
# UPDATE CURRENT USER EMAIL
# ============================================================

@router.put(
    "/me/email",
    response_model=UserOut,
)
def update_my_email(
    email_data: UserEmailUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if email is already taken
    existing = db.query(User).filter(User.email == email_data.email).first()
    if existing and str(existing.user_id) != str(current_user.user_id):
        raise HTTPException(status_code=400, detail="Email is already registered to another user")

    current_user.email = email_data.email
    db.commit()
    db.refresh(current_user)

    return current_user


# ============================================================
# CHANGE CURRENT USER PASSWORD
# ============================================================

from app.core.security import verify_password, hash_password

@router.put(
    "/me/password",
)
def change_my_password(
    password_data: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(password_data.old_password, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    current_user.password = hash_password(password_data.new_password)
    db.commit()

    return {"message": "Password updated successfully"}


# ============================================================
# GET USER BY ID — Admin only
# ============================================================

@router.get(
    "/{user_id}",
    response_model=UserOut,
)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(RoleEnum.Admin)
    ),
):
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# ============================================================
# UPDATE USER ROLE — Admin only
# ============================================================

@router.put(
    "/{user_id}/role",
    response_model=UserOut,
)
def update_user_role(
    user_id: UUID,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(RoleEnum.Admin)
    ),
):
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role_data.role.value
    db.commit()
    db.refresh(user)

    return user


# ============================================================
# DELETE USER — Admin only
# ============================================================

@router.delete(
    "/{user_id}",
)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(RoleEnum.Admin)
    ),
):
    if str(user_id) == str(current_user.user_id):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account",
        )

    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}