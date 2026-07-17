from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import attendance, ingest, overview, departments, sections, trends, auth, stats, calendar, schools, export

attendance_app = FastAPI(
    title="First-Hour Attendance Dashboard",
    description="Backend API for the attendance dashboard",
    version="2.0.0",
)

# CORS - restrict in production
attendance_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
attendance_app.include_router(attendance.router)
attendance_app.include_router(ingest.router)

# Read endpoints (dashboard)
attendance_app.include_router(overview.router)
attendance_app.include_router(departments.router)
attendance_app.include_router(sections.router)
attendance_app.include_router(trends.router)
attendance_app.include_router(stats.router)
attendance_app.include_router(calendar.router)

# Auth
attendance_app.include_router(auth.router)

# Schools (Dean dashboard)
attendance_app.include_router(schools.router)

# Export (CSV downloads)
attendance_app.include_router(export.router)


@attendance_app.get("/")
def root():
    return {"status": "ok", "message": "Attendance API is running", "version": "2.0.0"}


@attendance_app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}
