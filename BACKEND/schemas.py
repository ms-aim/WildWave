from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserBase(BaseModel):
    name: str
    email: str


class RecordingBase(BaseModel):
    filename: str
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    habitat: Optional[str] = None
    recorded_at: Optional[datetime] = None
    duration: Optional[float] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None


class DetectionResponse(BaseModel):
    id: int
    species_name: str
    confidence: float
    start_time: Optional[float] = None
    end_time: Optional[float] = None

    class Config:
        from_attributes = True


class RecordingResponse(RecordingBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True