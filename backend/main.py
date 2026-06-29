from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import os
from postgrest.exceptions import APIError

from routers import (
    restaurants,
    checklists,
    temperatures,
    violations,
    nyc_data,
    payments,
    sensors,
    notifications,
    analytics,
)

from routers.extras import (
    staff_router,
    docs_router,
    corrective_router,
    visits_router,
    chatbot_router,
    pest_router,
)

from routers.custom_checklist import custom_router, photo_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("GradeA API v2 starting...")
    try:
        from services.storage_setup import ensure_checklist_photos_bucket
        ensure_checklist_photos_bucket()
        print("Storage bucket ready: checklist-photos")
    except Exception as exc:
        print(f"Warning: could not ensure checklist-photos bucket: {exc}")
    yield
    print("Shutting down...")


app = FastAPI(
    title="GradeA API",
    description="NYC Restaurant Health Inspection Prep",
    version="2.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://gradea.app",
        "https://www.gradea.app",
        "https://grade-a-gamma.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handler
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    if getattr(exc, "code", None) == "PGRST205":
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Supabase table is not available yet. Please run the schema SQL in your Supabase project.",
                "error": str(exc),
            },
        )

    return JSONResponse(
        status_code=502,
        content={
            "detail": "Supabase request failed",
            "error": str(exc),
        },
    )


# Root Routes
@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "GradeA API",
        "version": "2.0.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# Main Routers
app.include_router(restaurants.router, prefix="/api/restaurants", tags=["Restaurants"])
app.include_router(checklists.router, prefix="/api/checklists", tags=["Checklists"])
app.include_router(temperatures.router, prefix="/api/temperatures", tags=["Temperatures"])
app.include_router(violations.router, prefix="/api/violations", tags=["Violations"])
app.include_router(nyc_data.router, prefix="/api/nyc", tags=["NYC Data"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(sensors.router, prefix="/api/sensors", tags=["IoT Sensors"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


# Extra Routers
app.include_router(staff_router, prefix="/api/staff", tags=["Staff"])
app.include_router(docs_router, prefix="/api/documents", tags=["Documents"])
app.include_router(corrective_router, prefix="/api/corrective", tags=["Corrective"])
app.include_router(visits_router, prefix="/api/visits", tags=["Visits"])
app.include_router(chatbot_router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(pest_router, prefix="/api/pest", tags=["Pest Control"])


# Custom Checklist + Photos
app.include_router(custom_router, prefix="/api/custom-checklist", tags=["Custom Checklist"])
app.include_router(photo_router, prefix="/api/photos", tags=["Photo Upload"])


# Railway Startup
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
    )