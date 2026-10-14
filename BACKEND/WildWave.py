from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from birdnetlib.analyzer import Analyzer
from birdnetlib.main import Recording
from datetime import datetime
from pydub import AudioSegment
import os
import shutil

app = FastAPI()

# Allow React/Vite frontend to communicate with FastAPI
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


def prepare_audio(input_path, output_path):
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_frame_rate(48000).set_channels(1)
    audio.export(output_path, format="wav")


@app.post("/detect-birds/")
async def detect_birds(file: UploadFile = File(...)):
    input_path = f"temp_{file.filename}"
    processed_path = f"processed_{file.filename}.wav"

    # Save uploaded audio
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Prepare audio for BirdNET
        prepare_audio(input_path, processed_path)

        # Load BirdNET analyzer
        analyzer = Analyzer()

        # Create BirdNET recording
        recording = Recording(
            analyzer,
            processed_path,
            lat=19.9975,
            lon=73.7898,
            date=datetime.now(),
            min_conf=0.5
        )

        # Analyze audio
        recording.analyze()

        # Keep only the highest confidence for each bird
        unique_birds = {}

        for d in recording.detections:
            name = d["common_name"]
            confidence = d["confidence"]

            if name not in unique_birds or confidence > unique_birds[name]:
                unique_birds[name] = confidence

        return {
            "total_unique_birds": len(unique_birds),
            "birds": [
                {
                    "name": bird,
                    "confidence": round(conf * 100, 2)
                }
                for bird, conf in unique_birds.items()
            ]
        }

    finally:
        # Remove temporary files
        if os.path.exists(input_path):
            os.remove(input_path)

        if os.path.exists(processed_path):
            os.remove(processed_path)


# Start FastAPI server when running:
# python WildWave.py
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )