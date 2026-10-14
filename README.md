# WildWave — AI-Powered Bird Sound Analysis and Biodiversity Monitoring

WildWave is an MCA project that uses artificial intelligence to analyze bird sounds and support biodiversity monitoring. It provides a web-based interface where users can upload audio recordings, analyze bird sounds, review detection history, and explore biodiversity information through an interactive map and analytics dashboard.

## Features

- **AI-Based Bird Detection:** Analyze audio recordings to identify bird species using BirdNET.
- **Audio Upload and Analysis:** Upload audio files through the web interface for analysis.
- **Recording History:** View previous analyses and access saved recording details.
- **Biodiversity Map:** Explore recorded bird detections and their geographical locations.
- **Species Filtering:** Filter map results by detected species and available location or habitat filters.
- **Analytics Dashboard:** View summaries of recordings, detections, species, and biodiversity information.
- **Recording Management:** View recording details and delete recordings when required.
- **REST API:** Use a FastAPI backend to connect the frontend with the audio-analysis functionality.
- **Database Integration:** Store recording and detection information using SQLite.

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Axios
- Leaflet and React Leaflet
- Recharts

### Backend
- Python
- FastAPI
- BirdNET / birdnetlib
- SQLite
- FFmpeg
- Pydub

## Project Structure

```text
WildWave/
├── BACKEND/
│   ├── backend/
│   ├── routes/
│   ├── services/
│   ├── uploads/
│   └── main.py
├── FRONTEND/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── index.html
├── README.md
└── .gitignore
```

*Note: The directory structure above is illustrative. Adjust it to match the actual files and folders in your project.*

## Requirements

Before running WildWave, install the following:

- Python 3.11
- Node.js and npm
- Git
- FFmpeg

The backend Python packages and frontend npm packages must also be installed.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ms-aim/WildWave.git
cd WildWave
```

### 2. Set Up the Backend

Open a terminal in the backend directory containing `main.py`.

Create and activate a Python virtual environment on Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the required Python packages using your project's dependency file, if available:

```powershell
pip install -r requirements.txt
```

If a `requirements.txt` file has not yet been created, add one containing the project's actual Python dependencies before using the command above.

Start the FastAPI server:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open the interactive API documentation:

http://127.0.0.1:8000/docs

### 3. Set Up the Frontend

Open another terminal in the frontend directory containing `package.json`.

Install the frontend dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open the local URL displayed in the terminal, usually:

http://localhost:5173

*Important: Run the backend and frontend in separate terminals. Adjust directory paths and commands if your project structure differs.*

## API Endpoints

The backend currently includes endpoints for the following operations:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/analysis/detect-birds/` | Analyze an uploaded audio recording |
| GET | `/recordings/` | Retrieve recording history |
| GET | `/recordings/{id}` | Retrieve a recording's details |
| DELETE | `/recordings/{id}` | Delete a recording |
| GET | `/analytics/summary` | Retrieve analytics summary |

For the complete request and response details, run the backend and visit `/docs`.

## How It Works

1. The user uploads a bird-audio recording through the frontend.
2. The frontend sends the audio file to the backend API.
3. The backend prepares the audio for analysis and uses the bird-detection model.
4. Detection results and recording information are made available to the application.
5. Users can review the results, explore recording history, view map information, and examine analytics.

## Project Objectives

- Explore the use of AI in bird sound identification.
- Build a web application that connects audio analysis with data visualization.
- Organize bird detection records for further review.
- Provide geographical and analytical views of recorded biodiversity observations.
- Demonstrate the integration of machine learning, backend APIs, databases, and frontend technologies.

## Limitations

- Detection accuracy depends on audio quality, environmental noise, and model performance.
- A predicted species should not automatically be treated as a confirmed ecological observation.
- Reliable geographical analysis depends on accurate recording coordinates and associated metadata.
- The application supports biodiversity exploration but does not replace expert field validation.

## Future Enhancements

- Improve model evaluation using labeled audio datasets.
- Add more detailed habitat-based biodiversity comparisons.
- Support larger collections of audio recordings.
- Improve reporting and export capabilities.
- Validate predicted detections against expert-reviewed observations.

## Academic Project

**Project Name:** WildWave  
**Project Type:** MCA Project  
**Domain:** Artificial Intelligence, Machine Learning, Audio Processing, and Biodiversity Monitoring

## License

No license has been specified yet. Please add an appropriate license if you intend to permit others to reuse, modify, or distribute this project.
