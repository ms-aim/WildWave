from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import models

from routes.health import router as health_router
from routes.analysis import router as analysis_router
from routes.recordings import router as recordings_router
from routes.analytics import router as analytics_router
from routes.biodiversity import router as biodiversity_router
from auth import router as auth_router

# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="WildWave API",
    description="AI-Powered Bird Acoustic Monitoring and Biodiversity Analysis System",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(analysis_router)
app.include_router(recordings_router)
app.include_router(analytics_router)
app.include_router(biodiversity_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to WildWave API",
        "status": "running",
        "version": "1.0.0"
    }