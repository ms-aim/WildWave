import os
import shutil
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session

from database import get_db
from models import Recording, Detection, User
from auth import get_current_user
from services.audio_service import prepare_audio
from services.birdnet_service import analyze_audio

router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"]
)

UPLOAD_DIR = "uploads"
PROCESSED_DIR = "processed"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)


@router.post("/detect-birds/")
async def detect_birds(
    file: UploadFile = File(...),
    location_name: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    habitat: Optional[str] = Form(None),
    recorded_at: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    # Validate GPS coordinates

    if latitude is not None and not -90 <= latitude <= 90:
        raise HTTPException(
            status_code=400,
            detail="Latitude must be between -90 and 90"
        )

    if longitude is not None and not -180 <= longitude <= 180:
        raise HTTPException(
            status_code=400,
            detail="Longitude must be between -180 and 180"
        )

    # Latitude and longitude must be provided together
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=400,
        detail="Latitude and longitude must be provided together"
        )

    file_id = str(uuid.uuid4())

    original_extension = os.path.splitext(
        file.filename
    )[1].lower()

    input_filename = f"{file_id}{original_extension}"
    processed_filename = f"{file_id}.wav"

    input_path = os.path.join(
        UPLOAD_DIR,
        input_filename
    )

    processed_path = os.path.join(
        PROCESSED_DIR,
        processed_filename
    )

    try:
        # Save uploaded audio
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        # Prepare audio
        audio_info = prepare_audio(
            input_path,
            processed_path
        )

        # Convert recording date if provided
        recording_datetime = None

        if recorded_at:
            try:
                recording_datetime = datetime.fromisoformat(
                    recorded_at.replace("Z", "+00:00")
                )
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid recorded_at format"
                )

        # BirdNET analysis
        detections = analyze_audio(
            processed_path,
            latitude=latitude,
            longitude=longitude,
            recorded_at=recording_datetime
        )

        # Save recording metadata
        recording = Recording(
            user_id=current_user.id,
            filename=file.filename,
            location_name=location_name,
            latitude=latitude,
            longitude=longitude,
            habitat=habitat,
            recorded_at=recording_datetime,
            duration=audio_info["duration"],
            sample_rate=audio_info["sample_rate"],
            channels=audio_info["channels"]
        )

        db.add(recording)
        db.commit()
        db.refresh(recording)

        results = []

        # Save detections
        for detection in detections:
            species_name = detection.get(
                "common_name",
                "Unknown"
            )

            confidence = detection.get(
                "confidence",
                0
            )

            db_detection = Detection(
                recording_id=recording.id,
                species_name=species_name,
                confidence=confidence
            )

            db.add(db_detection)

            results.append({
                "name": species_name,
                "confidence": round(
                    confidence * 100,
                    2
                )
            })

        db.commit()

        return {
            "recording_id": recording.id,
            "filename": file.filename,

            "location": {
                "name": location_name,
                "latitude": latitude,
                "longitude": longitude,
                "habitat": habitat
            },

            "recorded_at": recording_datetime,

            "duration": audio_info["duration"],

            "total_detections": len(results),

            "birds": results
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Bird analysis failed: {str(e)}"
        )

    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

        if os.path.exists(processed_path):
            os.remove(processed_path)