from birdnetlib.analyzer import Analyzer
from birdnetlib.main import Recording
from datetime import datetime


# Load BirdNET analyzer once
analyzer = Analyzer()


def analyze_audio(
    audio_path,
    latitude=None,
    longitude=None,
    recorded_at=None
):
    """
    Analyze an audio file using BirdNET.
    """

    recording = Recording(
        analyzer,
        audio_path,
        lat=latitude,
        lon=longitude,
        date=recorded_at or datetime.now(),
        min_conf=0.5
    )

    recording.analyze()

    return recording.detections