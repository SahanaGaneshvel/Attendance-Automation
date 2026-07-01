from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import AttendanceRecord, Section
import pandas as pd
import io

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/csv")
async def ingest_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Only accept CSV files
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    contents = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV file")

    # Expected columns: section_id | date | absent_count
    required_columns = {"section_id", "date", "absent_count"}
    if not required_columns.issubset(df.columns):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must have these columns: {required_columns}"
        )

    processed = 0
    errors = []

    for i, row in df.iterrows():
        try:
            section_id = int(row["section_id"])
            date = pd.to_datetime(row["date"]).date()
            absent_count = int(row["absent_count"])

            section = db.get(Section, section_id)
            if not section:
                errors.append(f"Row {i+1}: section_id {section_id} not found")
                continue

            if absent_count < 0 or absent_count > section.strength:
                errors.append(f"Row {i+1}: absent_count {absent_count} invalid for section {section.name}")
                continue

            # Upsert
            record = db.query(AttendanceRecord).filter_by(
                section_id=section_id,
                date=date
            ).first()

            if record:
                record.absent_count = absent_count
                record.source = "erp"
            else:
                record = AttendanceRecord(
                    section_id=section_id,
                    date=date,
                    absent_count=absent_count,
                    source="erp",
                )
                db.add(record)

            processed += 1

        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")
            continue

    db.commit()

    return {
        "message": "CSV processed",
        "rows_processed": processed,
        "errors": errors,
    }