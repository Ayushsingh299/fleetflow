from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud.user import get_user_by_email
from app.core.security import SECRET_KEY, ALGORITHM
from app.models.user import User, RoleEnum


# =========================================================
# OAuth2
# =========================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="auth/login"
)


# =========================================================
# GET CURRENT USER
# =========================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = get_user_by_email(
        db,
        email
    )

    if user is None:
        raise credentials_exception

    return user


# =========================================================
# ROLE-BASED ACCESS CONTROL
# =========================================================

def require_roles(*allowed_roles):
    roles = []
    for r in allowed_roles:
        if isinstance(r, (list, tuple)):
            roles.extend(r)
        else:
            roles.append(r)

    def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:

        if current_user.role not in roles:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )

        return current_user

    return role_checker


# =========================================================
# ROLE HELPERS
# =========================================================

def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:

    if current_user.role != RoleEnum.Admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def require_fleet_manager_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:

    if current_user.role not in [
        RoleEnum.Admin,
        RoleEnum.FleetManager
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Fleet Manager access required"
        )

    return current_user


def require_dispatcher_or_above(
    current_user: User = Depends(get_current_user)
) -> User:

    if current_user.role not in [
        RoleEnum.Admin,
        RoleEnum.FleetManager,
        RoleEnum.Dispatcher
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dispatcher, Fleet Manager, or Admin access required"
        )

    return current_user


def require_driver(
    current_user: User = Depends(get_current_user)
) -> User:

    if current_user.role != RoleEnum.Driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Driver access required"
        )

    return current_user