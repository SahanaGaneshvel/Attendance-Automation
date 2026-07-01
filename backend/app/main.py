from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import attendance, ingest

attendance_app = FastAPI(
    title="First-Hour Attendance Dashboard",
    description="Backend API for the attendance dashboard",
    version="1.0.0",
)

attendance_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

attendance_app.include_router(attendance.router)
attendance_app.include_router(ingest.router)

@attendance_app.get("/")
def root():
    return {"status": "ok", "message": "Attendance API is running"}