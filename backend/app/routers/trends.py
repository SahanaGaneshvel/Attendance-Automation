from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date as date_type, timedelta

from app.db import get_db
from app.models import Section
from app.services.metrics import section_trend, department_avg, college_avg
from app.schemas.trends import TrendResponse

router = APIRouter(tags=["trends"])


@router.get("/trends", response_model=TrendResponse)
def get_trends(
    scope: str = Query(..., pattern="^(college|dept|section)$"),
    id: int | None = Query(None),
    from_: date_type = Query(..., alias="from"),
    to: date_type = Query(...),
    db: Session = Depends(get_db),
):
    if scope == "section":
        if id is None:
            raise HTTPException(status_code=400, detail="id is required for section scope")
        section = db.get(Section, id)
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        data = section_trend(db, id, from_, to)

    elif scope == "dept":
        if id is None:
            raise HTTPException(status_code=400, detail="id is required for dept scope")
        data = []
        current = from_
        while current <= to:
            pct = department_avg(db, id, current)
            if pct is not None:
                data.append({"date": current.isoformat(), "pct": pct})
            current += timedelta(days=1)

    else:  # college
        data = []
        current = from_
        while current <= to:
            pct = college_avg(db, current)
            if pct is not None:
                data.append({"date": current.isoformat(), "pct": pct})
            current += timedelta(days=1)

    return {
        "scope": scope,
        "id": id,
        "from_date": from_.isoformat(),
        "to_date": to.isoformat(),
        "data": data,
    }