from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Recording, Detection, User
from auth import get_current_user

router = APIRouter(
    prefix="/biodiversity",
    tags=["Biodiversity"]
)


# Habitat analysis for the logged-in user
@router.get("/habitats")
def get_habitat_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Recording.habitat,
            func.count(Detection.id).label("detection_count"),
            func.count(
                func.distinct(Detection.species_name)
            ).label("species_count")
        )
        .join(
            Detection,
            Recording.id == Detection.recording_id
        )
        .filter(
            Recording.user_id == current_user.id,
            Recording.habitat.isnot(None)
        )
        .group_by(Recording.habitat)
        .order_by(func.count(Detection.id).desc())
        .all()
    )

    return {
        "habitats": [
            {
                "habitat": habitat,
                "detection_count": detection_count,
                "species_count": species_count
            }
            for habitat, detection_count, species_count in results
        ]
    }


# Location analysis for the logged-in user
@router.get("/locations")
def get_location_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Recording.location_name,
            Recording.latitude,
            Recording.longitude,
            Recording.habitat,
            func.count(Detection.id).label("detection_count"),
            func.count(
                func.distinct(Detection.species_name)
            ).label("species_count")
        )
        .join(
            Detection,
            Recording.id == Detection.recording_id
        )
        .filter(
            Recording.user_id == current_user.id,
            Recording.latitude.isnot(None),
            Recording.longitude.isnot(None)
        )
        .group_by(
            Recording.location_name,
            Recording.latitude,
            Recording.longitude,
            Recording.habitat
        )
        .all()
    )

    return {
        "locations": [
            {
                "location_name": location_name,
                "latitude": latitude,
                "longitude": longitude,
                "habitat": habitat,
                "detection_count": detection_count,
                "species_count": species_count
            }
            for (
                location_name,
                latitude,
                longitude,
                habitat,
                detection_count,
                species_count
            ) in results
        ]
    }


# Species analysis for the logged-in user
@router.get("/species")
def get_species_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Detection.species_name,
            func.count(Detection.id).label("detection_count"),
            func.avg(Detection.confidence).label("average_confidence")
        )
        .join(
            Recording,
            Detection.recording_id == Recording.id
        )
        .filter(Recording.user_id == current_user.id)
        .group_by(Detection.species_name)
        .order_by(func.count(Detection.id).desc())
        .all()
    )

    return {
        "species": [
            {
                "species_name": species_name,
                "detection_count": detection_count,
                "average_confidence": round(
                    (average_confidence or 0) * 100,
                    2
                )
            }
            for (
                species_name,
                detection_count,
                average_confidence
            ) in results
        ]
    }


# Details for a location, restricted to the logged-in user's recordings
@router.get("/location/{location_name}")
def get_location_details(
    location_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recordings = (
        db.query(Recording)
        .filter(
            Recording.location_name == location_name,
            Recording.user_id == current_user.id
        )
        .all()
    )

    if not recordings:
        return {
            "location_name": location_name,
            "total_recordings": 0,
            "total_detections": 0,
            "species_count": 0,
            "average_confidence": 0,
            "species": []
        }

    recording_ids = [recording.id for recording in recordings]

    detections = (
        db.query(Detection)
        .filter(Detection.recording_id.in_(recording_ids))
        .all()
    )

    species_data = (
        db.query(
            Detection.species_name,
            func.count(Detection.id).label("detection_count"),
            func.avg(Detection.confidence).label("average_confidence")
        )
        .filter(Detection.recording_id.in_(recording_ids))
        .group_by(Detection.species_name)
        .order_by(func.count(Detection.id).desc())
        .all()
    )

    average_confidence = (
        sum(detection.confidence for detection in detections)
        / len(detections)
        if detections else 0
    )

    return {
        "location_name": location_name,
        "total_recordings": len(recordings),
        "total_detections": len(detections),
        "species_count": len(species_data),
        "average_confidence": round(average_confidence * 100, 2),
        "species": [
            {
                "species_name": species_name,
                "detection_count": detection_count,
                "average_confidence": round(
                    (average_confidence or 0) * 100,
                    2
                )
            }
            for (
                species_name,
                detection_count,
                average_confidence
            ) in species_data
        ]
    }
