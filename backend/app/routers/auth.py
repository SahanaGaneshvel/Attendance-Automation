from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, Section, Department, School
from app.schemas.auth import TokenResponse, UserResponse, ScopeInfo
from app.services.auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2 compatible token login.
    Accepts form-urlencoded: username (email) and password.
    """
    user = db.query(User).filter_by(email=form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user info with scope details."""
    scope = ScopeInfo()

    # Build scope info based on role
    if current_user.role == "teacher" and current_user.scope_section_id:
        section = db.get(Section, current_user.scope_section_id)
        if section:
            scope.section_id = section.id
            scope.section_name = f"{section.stream} Year {section.year} {section.name}"
            dept = db.get(Department, section.department_id)
            if dept:
                scope.department_id = dept.id
                scope.department_name = dept.name
                school = db.get(School, dept.school_id)
                if school:
                    scope.school_id = school.id
                    scope.school_name = school.name

    elif current_user.role == "hod" and current_user.scope_department_id:
        dept = db.get(Department, current_user.scope_department_id)
        if dept:
            scope.department_id = dept.id
            scope.department_name = dept.name
            school = db.get(School, dept.school_id)
            if school:
                scope.school_id = school.id
                scope.school_name = school.name

    elif current_user.role == "dean" and current_user.scope_school_id:
        school = db.get(School, current_user.scope_school_id)
        if school:
            scope.school_id = school.id
            scope.school_name = school.name

    elif current_user.role == "admin":
        # Admin has full access - populate top-level school for context
        school = db.query(School).first()
        if school:
            scope.school_id = school.id
            scope.school_name = school.name

    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        scope=scope
    )