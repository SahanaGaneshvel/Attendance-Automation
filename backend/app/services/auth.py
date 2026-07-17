"""
Authentication service - JWT token management and password verification.
"""
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import hashlib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

from app.db import get_db
from app.models import User

# Configuration from environment
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hash.
    Supports both sha256 (dev) and bcrypt (production).
    """
    # Try sha256 first (used in seed data)
    sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
    if sha256_hash == hashed_password:
        return True

    # Try bcrypt if sha256 didn't match
    try:
        import bcrypt
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def hash_password(password: str) -> str:
    """
    Hash password using sha256 for dev (bcrypt has version issues).
    In production, use bcrypt.
    """
    return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token with expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and validate JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Get current user from JWT token. Raises 401 if invalid."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception

    return user


def get_current_user_optional(
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)),
    db: Session = Depends(get_db)
) -> User | None:
    """Get current user if token provided, otherwise None."""
    if not token:
        return None

    payload = decode_token(token)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    return db.get(User, int(user_id))


def require_role(allowed_roles: list[str]):
    """Dependency that requires user to have one of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return current_user
    return role_checker


def require_scope(scope_type: str, scope_id: int):
    """
    Dependency that requires user to have access to a specific scope.
    Admin always has access. Others need matching scope.
    """
    def scope_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == "admin":
            return current_user

        if scope_type == "section":
            if current_user.scope_section_id != scope_id:
                # HODs can access sections in their department
                if current_user.role == "hod":
                    from app.models import Section
                    from app.db import SessionLocal
                    db = SessionLocal()
                    section = db.get(Section, scope_id)
                    if section and section.department_id == current_user.scope_department_id:
                        db.close()
                        return current_user
                    db.close()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to this section",
                )

        elif scope_type == "department":
            if current_user.scope_department_id != scope_id:
                # Deans can access departments in their school
                if current_user.role == "dean":
                    from app.models import Department
                    from app.db import SessionLocal
                    db = SessionLocal()
                    dept = db.get(Department, scope_id)
                    if dept and dept.school_id == current_user.scope_school_id:
                        db.close()
                        return current_user
                    db.close()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to this department",
                )

        elif scope_type == "school":
            if current_user.scope_school_id != scope_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to this school",
                )

        return current_user
    return scope_checker
