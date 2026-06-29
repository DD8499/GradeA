from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from routers import (
    restaurants, checklists, temperatures,
    violations, nyc_data, payments, sensors,
    notifications, analytics,
)
from routers.extras import (
    staff_router, docs_router, corrective_router,
    visits_router, chatbot_router, pest_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("GradeA API v2 starting...")
    yield
    print("Shutting down...")


app = FastAPI(
    title="GradeA API",
    description="NYC Restaurant Health Inspection Prep",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://gradea.app","https://www.gradea.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurants.router,   prefix="/api/restaurants",   tags=["Restaurants"])
app.include_router(checklists.router,    prefix="/api/checklists",    tags=["Checklists"])
app.include_router(temperatures.router,  prefix="/api/temperatures",  tags=["Temperatures"])
app.include_router(violations.router,    prefix="/api/violations",    tags=["Violations"])
app.include_router(nyc_data.router,      prefix="/api/nyc",           tags=["NYC Data"])
app.include_router(payments.router,      prefix="/api/payments",      tags=["Payments"])
app.include_router(sensors.router,       prefix="/api/sensors",       tags=["IoT Sensors"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(analytics.router,     prefix="/api/analytics",     tags=["Analytics"])
app.include_router(staff_router,         prefix="/api/staff",         tags=["Staff"])
app.include_router(docs_router,          prefix="/api/documents",     tags=["Documents"])
app.include_router(corrective_router,    prefix="/api/corrective",    tags=["Corrective"])
app.include_router(visits_router,        prefix="/api/visits",        tags=["Visits"])
app.include_router(chatbot_router,       prefix="/api/chat",          tags=["AI Chat"])
app.include_router(pest_router,          prefix="/api/pest",          tags=["Pest Control"])


@app.get("/")
def root():
    return {"status": "ok", "service": "GradeA API", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# V3 additions — append to existing imports and app
from routers.custom_checklist import custom_router, photo_router

app.include_router(custom_router, prefix="/api/custom-checklist", tags=["Custom Checklist"])
app.include_router(photo_router,  prefix="/api/photos",           tags=["Photo Upload"])
