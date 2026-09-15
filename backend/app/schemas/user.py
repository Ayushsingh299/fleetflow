from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from typing import Optional
import re

from app.models.user import RoleEnum



class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: RoleEnum = RoleEnum.Driver

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserOut(BaseModel):
    user_id: UUID
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: RoleEnum

    class Config:
        from_attributes = True



class Token(BaseModel):
    access_token: str
    token_type: str