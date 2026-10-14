from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Recording, Detection, User
from auth import get_current_user

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total recordings belonging to the logged-in user
    total_recordings = (
        db.query(Recording)
        .filter(Recording.user_id == current_user.id)
        .count()
    )

    # Total bird detections in this user's recordings
    total_detections = (
        db.query(Detection)
        .join(
            Recording,
            Detection.recording_id == Recording.id
        )
        .filter(Recording.user_id == current_user.id)
        .count()
    )

    # Number of unique detected species for this user
    unique_species = (
        db.query(Detection.species_name)
        .join(
            Recording,
            Detection.recording_id == Recording.id
        )
        .filter(Recording.user_id == current_user.id)
        .distinct()
        .count()
    )

    # Average confidence for this user's detections
    average_confidence = (
        db.query(func.avg(Detection.confidence))
        .join(
            Recording,
            Detection.recording_id == Recording.id
        )
        .filter(Recording.user_id == current_user.id)
        .scalar()
    )

    # Top 10 species detected in this user's recordings
    top_species = (
        db.query(
            Detection.species_name,
            func.count(Detection.id).label("detection_count")
        )
        .join(
            Recording,
            Detection.recording_id == Recording.id
        )
        .filter(Recording.user_id == current_user.id)
        .group_by(Detection.species_name)
        .order_by(
            func.count(Detection.id).desc()
        )
        .limit(10)
        .all()
    )

    species_distribution = [
        {
            "species_name": species,
            "detection_count": count
        }
        for species, count in top_species
    ]

    return {
        "total_recordings": total_recordings,
        "total_detections": total_detections,
        "unique_species": unique_species,
        "average_confidence": round(
            (average_confidence or 0) * 100,
            2
        ),
        "species_distribution": species_distribution
    }