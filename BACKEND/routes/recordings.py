from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Recording, Detection, User
from auth import get_current_user

router = APIRouter(
    prefix="/recordings",
    tags=["Recordings"]
)


# Get only the logged-in user's recordings
@router.get("/")
def get_recordings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recordings = (
        db.query(Recording)
        .filter(Recording.user_id == current_user.id)
        .order_by(Recording.created_at.desc())
        .all()
    )

    return {
        "total_recordings": len(recordings),
        "recordings": [
            {
                "id": recording.id,
                "filename": recording.filename,
                "location_name": recording.location_name,
                "latitude": recording.latitude,
                "longitude": recording.longitude,
                "habitat": recording.habitat,
                "duration": recording.duration,
                "sample_rate": recording.sample_rate,
                "channels": recording.channels,
                "created_at": recording.created_at
            }
            for recording in recordings
        ]
    }


# Get one recording belonging to the logged-in user
@router.get("/{recording_id}")
def get_recording(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recording = (
        db.query(Recording)
        .filter(
            Recording.id == recording_id,
            Recording.user_id == current_user.id
        )
        .first()
    )

    if not recording:
        raise HTTPException(
            status_code=404,
            detail="Recording not found"
        )

    detections = (
        db.query(Detection)
        .filter(
            Detection.recording_id == recording.id
        )
        .order_by(
            Detection.confidence.desc()
        )
        .all()
    )

    return {
        "recording": {
            "id": recording.id,
            "filename": recording.filename,
            "location_name": recording.location_name,
            "latitude": recording.latitude,
            "longitude": recording.longitude,
            "habitat": recording.habitat,
            "duration": recording.duration,
            "sample_rate": recording.sample_rate,
            "channels": recording.channels,
            "created_at": recording.created_at
        },
        "total_detections": len(detections),
        "detections": [
            {
                "id": detection.id,
                "species_name": detection.species_name,
                "confidence": round(
                    detection.confidence * 100,
                    2
                ),
                "start_time": detection.start_time,
                "end_time": detection.end_time
            }
            for detection in detections
        ]
    }


# Delete only a recording belonging to the logged-in user
@router.delete("/{recording_id}")
def delete_recording(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recording = (
        db.query(Recording)
        .filter(
            Recording.id == recording_id,
            Recording.user_id == current_user.id
        )
        .first()
    )

    if not recording:
        raise HTTPException(
            status_code=404,
            detail="Recording not found"
        )

    db.delete(recording)
    db.commit()

    return {
        "message": "Recording deleted successfully",
        "recording_id": recording_id
    }