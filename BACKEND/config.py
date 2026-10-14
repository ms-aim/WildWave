import os

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "uploads"
)

PROCESSED_DIR = os.path.join(
    BASE_DIR,
    "processed"
)

MAX_FILE_SIZE = 50 * 1024 * 1024

ALLOWED_AUDIO_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".ogg",
    ".flac",
    ".m4a",
    ".aac"
}