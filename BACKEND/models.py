from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text
)

from sqlalchemy.orm import relationship

from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(String(255), nullable=False)

    role = Column(
        String(20),
        default="user",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    recordings = relationship(
        "Recording",
        back_populates="user"
    )


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    filename = Column(
        String(255),
        nullable=False
    )

    location_name = Column(
        String(255),
        nullable=True
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )

    habitat = Column(
        String(100),
        nullable=True
    )

    recorded_at = Column(
        DateTime,
        nullable=True
    )

    duration = Column(
        Float,
        nullable=True
    )

    sample_rate = Column(
        Integer,
        nullable=True
    )

    channels = Column(
        Integer,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="recordings"
    )

    detections = relationship(
        "Detection",
        back_populates="recording",
        cascade="all, delete-orphan"
    )


class Species(Base):
    __tablename__ = "species"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    common_name = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    scientific_name = Column(
        String(255),
        nullable=True
    )

    family = Column(
        String(255),
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    detections = relationship(
        "Detection",
        back_populates="species"
    )


class Detection(Base):
    __tablename__ = "detections"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    recording_id = Column(
        Integer,
        ForeignKey("recordings.id"),
        nullable=False
    )

    species_id = Column(
        Integer,
        ForeignKey("species.id"),
        nullable=True
    )

    species_name = Column(
        String(255),
        nullable=False
    )

    confidence = Column(
        Float,
        nullable=False
    )

    start_time = Column(
        Float,
        nullable=True
    )

    end_time = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    recording = relationship(
        "Recording",
        back_populates="detections"
    )

    species = relationship(
        "Species",
        back_populates="detections"
    )