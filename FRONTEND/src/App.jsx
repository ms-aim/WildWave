import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";
import BiodiversityMap from "./components/BiodiversityMap";

const API_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wildwave_access_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


const authInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #d7e1da",
  borderRadius: "9px",
  fontSize: "14px",
  outlineColor: "#1f6b48",
};

const downloadCSV = (filename, headers, rows) => {
  const escapeCSV = (value) => {
    let text = value == null ? "" : String(value);

    // Prevent spreadsheet formula execution for untrusted text.
    if (/^[\s]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\r\n");

  // BOM helps Excel display text correctly.
  const blob = new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [token, setToken] = useState(
    () => localStorage.getItem("wildwave_access_token") || ""
  );
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wildwave_user") || "null");
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [stats, setStats] = useState({
    recordings: 0,
    detections: 0,
    species: 0,
  });

  const [recordings, setRecordings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [habitat, setHabitat] = useState("");
  const [recordedAt, setRecordedAt] = useState("");

  const [selectedRecording, setSelectedRecording] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [biodiversity, setBiodiversity] = useState({
    habitats: [],
    locations: [],
    species: []
  });

  const [biodiversityLoading, setBiodiversityLoading] = useState(false);

  useEffect(() => {
    if (token) {
      loadRecordings();
    } else {
      setRecordings([]);
      setStats({ recordings: 0, detections: 0, species: 0 });
      setAnalytics(null);
      setBiodiversity({
        habitats: [],
        locations: [],
        species: [],
      });
      setSelectedRecording(null);
    }
  }, [token]);

  const loadRecordings = async () => {
    try {
      setLoadingHistory(true);

      // Load recording list for History and Map
      const recordingsResponse = await api.get(
        "/recordings/"
      );

      const data = recordingsResponse.data.recordings || [];

      setRecordings(data);

      // Load dashboard statistics from Analytics API
      const analyticsResponse = await api.get(
        "/analytics/summary"
      );

      const analyticsData = analyticsResponse.data;

      setStats({
        recordings: analyticsData.total_recordings || 0,
        detections: analyticsData.total_detections || 0,
        species: analyticsData.unique_species || 0,
      });
    } catch (err) {
      console.error("Failed to load recordings or analytics:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  
const exportRecordingData = () => {
  const headers = [
    "Recording ID",
    "Filename",
    "Location",
    "Habitat",
    "Recorded Date",
    "Duration (seconds)",
    "Sample Rate (Hz)",
    "Channels",
    "Latitude",
    "Longitude",
  ];

  const rows = recordings.map((recording) => [
    recording.id,
    recording.filename,
    recording.location_name || "Unknown",
    recording.habitat || "Not specified",
    recording.created_at || "",
    recording.duration ?? "",
    recording.sample_rate ?? "",
    recording.channels ?? "",
    recording.latitude ?? "",
    recording.longitude ?? "",
  ]);

  if (rows.length === 0) {
    alert("No recording data available to export.");
    return;
  }

  downloadCSV(
    "wildwave_recording_data.csv",
    headers,
    rows
  );
};


const exportSpeciesAnalysis = () => {
  const headers = [
    "Rank",
    "Species Name",
    "Detection Count",
    "Average Confidence (%)",
  ];

  const rows = biodiversity.species.map((item, index) => [
    index + 1,
    item.species_name,
    item.detection_count,
    item.average_confidence,
  ]);

  if (rows.length === 0) {
    alert("No species analysis data available to export.");
    return;
  }

  downloadCSV(
    "wildwave_species_analysis.csv",
    headers,
    rows
  );
};
  // Analytics API function
  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setBiodiversityLoading(true);

      const [analyticsResponse, habitatsResponse, locationsResponse, speciesResponse] =
        await Promise.all([
          api.get("/analytics/summary"),
          api.get("/biodiversity/habitats"),
          api.get("/biodiversity/locations"),
          api.get("/biodiversity/species")
        ]);

      setAnalytics(analyticsResponse.data);

      setBiodiversity({
        habitats: habitatsResponse.data.habitats || [],
        locations: locationsResponse.data.locations || [],
        species: speciesResponse.data.species || []
      });

    } catch (error) {
      console.error("Failed to load biodiversity analytics:", error);

      setAnalytics(null);

      setBiodiversity({
        habitats: [],
        locations: [],
        species: []
      });

    } finally {
      setAnalyticsLoading(false);
      setBiodiversityLoading(false);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith("audio/")) {
      setFile(selectedFile);
      setResults(null);
      setError("");
    } else {
      setFile(null);
      setError("Please upload a valid audio file.");
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];

    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    setError("Geolocation is not supported by your browser.");
    return;
  }

  setError("");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude: currentLatitude, longitude: currentLongitude } =
        position.coords;

      setLatitude(currentLatitude.toFixed(6));
      setLongitude(currentLongitude.toFixed(6));

      try {
        const response = await axios.get(
          "https://nominatim.openstreetmap.org/reverse",
          {
            params: {
              lat: currentLatitude,
              lon: currentLongitude,
              format: "json",
              zoom: 10,
              addressdetails: 1,
            },
            headers: {
              Accept: "application/json",
            },
          }
        );

        const address = response.data?.address;

        const location =
          address?.village ||
          address?.town ||
          address?.city ||
          address?.municipality ||
          address?.suburb ||
          address?.county ||
          "";

        if (location) {
          setLocationName(location);
        }
      } catch (error) {
        console.error("Failed to get location name:", error);
      }
    },

    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setError(
          "Location permission was denied. Please allow location access in your browser."
        );
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setError("Your current location could not be determined.");
      } else if (error.code === error.TIMEOUT) {
        setError("Location request timed out. Please try again.");
      } else {
        setError("Unable to get your current location.");
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};



  const uploadFile = async () => {
    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    if (locationName.trim()) {
      formData.append("location_name", locationName.trim());
    }

    if (latitude !== "") {
      formData.append("latitude", latitude);
    }

    if (longitude !== "") {
      formData.append("longitude", longitude);
    }

    if (habitat) {
      formData.append("habitat", habitat);
    }

    if (recordedAt) {
      formData.append("recorded_at", recordedAt);
    }

    setLoadingAnalysis(true);
    setError("");
    setResults(null);

    try {
      const response = await api.post(
        "/analysis/detect-birds/",
        formData
      );

      setResults(response.data);

      await loadRecordings();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Analysis failed. Please check that the WildWave backend is running."
      );
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const viewRecording = async (recordingId) => {
    try {
      setLoadingDetails(true);

      const response = await api.get(
        `/recordings/${recordingId}`
      );

      setSelectedRecording(response.data);
    } catch (err) {
      console.error(err);
      alert("Unable to load recording details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const deleteRecording = async (recordingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this recording?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/recordings/${recordingId}`);

      setSelectedRecording(null);

      await loadRecordings();
    } catch (err) {
      console.error(err);
      alert("Unable to delete recording.");
    }
  };

  const getConfidenceClass = (confidence) => {
    if (confidence >= 80) return "confidence-high";
    if (confidence >= 60) return "confidence-medium";
    return "confidence-low";
  };

  const formatDate = (date) => {
    if (!date) return "Unknown";

    return new Date(date).toLocaleString();
  };

  const formatDuration = (duration) => {
    if (!duration) return "0 sec";

    if (duration < 60) {
      return `${duration.toFixed(1)} sec`;
    }

    const minutes = Math.floor(duration / 60);
    const seconds = Math.round(duration % 60);

    return `${minutes}m ${seconds}s`;
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    try {
      if (authMode === "register") {
        await api.post("/auth/register", {
          name: authName.trim(),
          email: authEmail.trim(),
          password: authPassword,
        });

        setAuthMode("login");
        setAuthPassword("");
        setAuthMessage("Account created successfully. Please log in.");
      } else {
        const response = await api.post("/auth/login", {
          email: authEmail.trim(),
          password: authPassword,
        });

        const accessToken = response.data.access_token;
        const user = response.data.user;

        localStorage.setItem("wildwave_access_token", accessToken);
        localStorage.setItem("wildwave_user", JSON.stringify(user));

        setCurrentUser(user);
        setToken(accessToken);
        setAuthPassword("");
        setAuthMessage("");
      }
    } catch (err) {
      setAuthError(
        err.response?.data?.detail ||
          "Authentication failed. Please check your details and try again."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wildwave_access_token");
    localStorage.removeItem("wildwave_user");

    setToken("");
    setCurrentUser(null);
    setAuthMode("login");
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthError("");
    setAuthMessage("");
    setActivePage("dashboard");
    setFile(null);
    setResults(null);
    setError("");
    setAnalytics(null);
    setSelectedRecording(null);
  };

  const renderAuthPage = () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(135deg, #edf7f1 0%, #f5f7fb 100%)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#ffffff",
          border: "1px solid #e3e9e5",
          borderRadius: "18px",
          padding: "32px",
          boxShadow: "0 18px 50px rgba(26, 54, 42, 0.10)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div style={{ fontSize: "42px", marginBottom: "8px" }}>🦜</div>
          <h1 style={{ margin: "0 0 8px", color: "#173c2c" }}>WildWave</h1>
          <p style={{ margin: 0, color: "#64746b" }}>
            Bird Intelligence Platform
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthError("");
              setAuthMessage("");
            }}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "9px",
              border: "1px solid #d7e3db",
              background: authMode === "login" ? "#1f6b48" : "#ffffff",
              color: authMode === "login" ? "#ffffff" : "#315342",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("register");
              setAuthError("");
              setAuthMessage("");
            }}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "9px",
              border: "1px solid #d7e3db",
              background: authMode === "register" ? "#1f6b48" : "#ffffff",
              color: authMode === "register" ? "#ffffff" : "#315342",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleAuthSubmit}>
          {authMode === "register" && (
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="auth-name"
                style={{
                  display: "block",
                  marginBottom: "7px",
                  color: "#34483c",
                  fontWeight: 600,
                }}
              >
                Full name
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={authName}
                onChange={(event) => setAuthName(event.target.value)}
                placeholder="Enter your name"
                style={authInputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="auth-email"
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#34483c",
                fontWeight: 600,
              }}
            >
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              maxLength={150}
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="you@example.com"
              style={authInputStyle}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label
              htmlFor="auth-password"
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#34483c",
                fontWeight: 600,
              }}
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              required
              minLength={authMode === "register" ? 8 : undefined}
              maxLength={128}
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder={
                authMode === "register"
                  ? "At least 8 characters"
                  : "Enter your password"
              }
              style={authInputStyle}
            />
          </div>

          {authError && (
            <div
              role="alert"
              style={{
                marginBottom: "14px",
                padding: "11px 12px",
                borderRadius: "8px",
                background: "#fff0f0",
                color: "#a32929",
                fontSize: "14px",
              }}
            >
              {authError}
            </div>
          )}

          {authMessage && (
            <div
              role="status"
              style={{
                marginBottom: "14px",
                padding: "11px 12px",
                borderRadius: "8px",
                background: "#edf8f0",
                color: "#23623b",
                fontSize: "14px",
              }}
            >
              {authMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "9px",
              background: authLoading ? "#8ca99a" : "#1f6b48",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "15px",
              cursor: authLoading ? "wait" : "pointer",
            }}
          >
            {authLoading
              ? "Please wait..."
              : authMode === "register"
                ? "Create Account"
                : "Login to WildWave"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#7b8980",
            fontSize: "12px",
            lineHeight: 1.5,
            margin: "20px 0 0",
          }}
        >
          Your account keeps your WildWave recordings and biodiversity analytics
          separate from other users.
        </p>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const latestRecording = recordings[0];

    return (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">WILDLIFE ACOUSTIC MONITORING</p>
            <h1>Dashboard</h1>
            <p>
              Monitor bird activity and analyze biodiversity through acoustic
              data.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => setActivePage("analysis")}
          >
            + New Analysis
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎙️</div>
            <div>
              <span>Total Recordings</span>
              <strong>{stats.recordings}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🐦</div>
            <div>
              <span>Total Detections</span>
              <strong>{stats.detections}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🌿</div>
            <div>
              <span>Species Detected</span>
              <strong>{stats.species}</strong>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Latest Recording</h2>
                <p>Your most recent acoustic analysis</p>
              </div>

              <button
                className="text-button"
                onClick={() => setActivePage("history")}
              >
                View All
              </button>
            </div>

            {latestRecording ? (
              <div className="latest-recording">
                <div className="recording-icon">🎵</div>

                <div className="recording-main">
                  <h3>{latestRecording.filename}</h3>

                  <p>
                    📍 {latestRecording.location_name || "Unknown location"}
                  </p>

                  <p>🕒 {formatDate(latestRecording.created_at)}</p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => viewRecording(latestRecording.id)}
                >
                  Details
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <div>🎧</div>
                <h3>No recordings yet</h3>
                <p>
                  Upload an audio recording to start your first bird analysis.
                </p>

                <button
                  className="primary-button"
                  onClick={() => setActivePage("analysis")}
                >
                  Start Analysis
                </button>
              </div>
            )}
          </div>

          <div className="panel system-panel">
            <div className="panel-header">
              <div>
                <h2>System Status</h2>
                <p>WildWave services</p>
              </div>

              <span className="status-dot">● Online</span>
            </div>

            <div className="system-item">
              <span>FastAPI Backend</span>
              <strong>Connected</strong>
            </div>

            <div className="system-item">
              <span>BirdNET Engine</span>
              <strong>Ready</strong>
            </div>

            <div className="system-item">
              <span>Database</span>
              <strong>SQLite</strong>
            </div>

            <div className="system-item">
              <span>Audio Processing</span>
              <strong>FFmpeg</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalysis = () => {
    return (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">AI SPECIES IDENTIFICATION</p>
            <h1>New Analysis</h1>
            <p>
              Upload an audio recording and let BirdNET analyze the detected
              species.
            </p>
          </div>
        </div>

        <div className="analysis-layout">
          <div className="panel metadata-panel">
            <div className="panel-header">
              <div>
                <h2>Recording Information</h2>
                <p>Add location and habitat details for biodiversity analysis.</p>
              </div>
            </div>

            <div className="metadata-grid">

              <div className="form-group">
                <label>Location Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pimpalner"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Habitat</label>
                <select
                  value={habitat}
                  onChange={(e) => setHabitat(e.target.value)}
                >
                  <option value="">Select habitat</option>
                  <option value="Forest">Forest</option>
                  <option value="Grassland">Grassland</option>
                  <option value="Wetland">Wetland</option>
                  <option value="River">River</option>
                  <option value="Agricultural">Agricultural</option>
                  <option value="Urban">Urban</option>
                  <option value="Hill">Hill</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 20.0000"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 74.0000"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>

              <div className="form-group">
  <label>GPS Location</label>

  <button
    type="button"
    className="location-button"
    onClick={getCurrentLocation}
  >
    📍 Use My Location
  </button>
</div>

              <div className="form-group">
                <label>Recording Date & Time</label>
                <input
                  type="datetime-local"
                  value={recordedAt}
                  onChange={(e) => setRecordedAt(e.target.value)}
                />
              </div>

            </div>
          </div>
          <div className="panel analysis-panel">
            <div
              className={`upload-zone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""
                }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              <input
                type="file"
                id="fileInput"
                accept="audio/*"
                onChange={(event) =>
                  handleFileChange(event.target.files[0])
                }
                hidden
              />

              <label htmlFor="fileInput" className="drop-label">
                <div className="large-upload-icon">
                  {file ? "🎵" : "☁️"}
                </div>

                {file ? (
                  <>
                    <strong>{file.name}</strong>
                    <span>Audio file selected</span>
                  </>
                ) : (
                  <>
                    <strong>Upload an audio recording</strong>
                    <span>
                      Drag and drop your audio file here or click to browse
                    </span>
                  </>
                )}
              </label>
            </div>

            {file && (
              <div className="selected-file">
                <div>
                  <strong>{file.name}</strong>
                  <span>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>

                <button
                  className="remove-button"
                  onClick={() => {
                    setFile(null);
                    setResults(null);
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button
              className="primary-button analysis-button"
              onClick={uploadFile}
              disabled={!file || loadingAnalysis}
            >
              {loadingAnalysis ? (
                <>
                  <span className="spinner"></span>
                  Analyzing Audio...
                </>
              ) : (
                "🔍 Identify Bird Species"
              )}
            </button>
          </div>

          {results && (
            <div className="panel results-panel">
              <div className="panel-header">
                <div>
                  <h2>Analysis Results</h2>
                  <p>{results.filename}</p>
                </div>

                <span className="result-count">
                  {results.total_detections} detections
                </span>
              </div>

              <div className="result-summary">
                <div>
                  <span>Recording Duration</span>
                  <strong>{formatDuration(results.duration)}</strong>
                </div>

                <div>
                  <span>Unique Analysis Results</span>
                  <strong>{results.birds?.length || 0}</strong>
                </div>
              </div>

              <div className="bird-results">
                {results.birds?.length > 0 ? (
                  results.birds.map((bird, index) => (
                    <div className="bird-result" key={index}>
                      <div className="bird-rank">#{index + 1}</div>

                      <div className="bird-info">
                        <strong>{bird.name}</strong>
                        <span>BirdNET detection</span>
                      </div>

                      <div
                        className={`confidence ${getConfidenceClass(
                          bird.confidence
                        )}`}
                      >
                        {bird.confidence}%
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-results">
                    No bird detections were found in this recording.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMap = () => {
    return (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SPATIAL BIODIVERSITY MONITORING</p>
            <h1>Biodiversity Map</h1>
            <p>
              Explore acoustic recordings and monitoring locations
              across the study area.
            </p>
          </div>
        </div>

        <div className="panel map-panel">
          <div className="panel-header">
            <div>
              <h2>Recording Locations</h2>
              <p>{recordings.length} monitoring recordings</p>
            </div>

            <span className="result-count">OpenStreetMap</span>
          </div>

          <div className="map-wrapper">
            <BiodiversityMap recordings={recordings} />
          </div>
        </div>
      </div>
    );
  };
  // Analytics page
  const renderAnalytics = () => {
    if (analyticsLoading) {
      return (
        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">BIODIVERSITY INSIGHTS</p>
              <h1>Analytics</h1>
              <p>Bird detection and biodiversity insights.</p>
            </div>
          </div>

          <div className="panel">
            <div className="loading-state">
              <span className="spinner dark"></span>
              Loading analytics...
            </div>
          </div>
        </div>
      );
    }

    if (!analytics) {
      return (
        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">BIODIVERSITY INSIGHTS</p>
              <h1>Analytics</h1>
              <p>Bird detection and biodiversity insights.</p>
            </div>
          </div>

          <div className="panel">
            <div className="empty-state">
              <div>📊</div>
              <h3>No analytics data available</h3>
              <p>
                Analytics data could not be loaded from the WildWave backend.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="page-content">
        
<div className="page-heading">
  <div>
    <p className="eyebrow">BIODIVERSITY INSIGHTS</p>
    <h1>Analytics</h1>
    <p>
      Bird detection and biodiversity insights from your recordings.
    </p>
  </div>

  <div
    style={{
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >
    <button
      className="secondary-button"
      onClick={exportRecordingData}
    >
      ↓ Export Recording Data
    </button>

    <button
      className="primary-button"
      onClick={exportSpeciesAnalysis}
    >
      ↓ Export Species Analysis
    </button>
  </div>
</div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎙️</div>
            <div>
              <span>Total Recordings</span>
              <strong>{analytics.total_recordings}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🐦</div>
            <div>
              <span>Total Detections</span>
              <strong>{analytics.total_detections}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🌿</div>
            <div>
              <span>Unique Species</span>
              <strong>{analytics.unique_species}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div>
              <span>Avg. Detection Confidence</span>
              <strong>{analytics.average_confidence}%</strong>
            </div>
          </div>
        </div>

        {/* SPECIES DISTRIBUTION */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Species Detection Distribution</h2>
              <p>Most frequently detected bird species</p>
            </div>
          </div>

          {analytics.species_distribution &&
            analytics.species_distribution.length > 0 ? (
            <div style={{ width: "100%", height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={analytics.species_distribution}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 70,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="species_name"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />

                  <YAxis allowDecimals={false} />

                  <Tooltip />

                  <Bar
                    dataKey="detection_count"
                    name="Detections"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              <div>🐦</div>
              <h3>No species detection data</h3>
              <p>
                Species distribution will appear here after bird detections
                are available.
              </p>
            </div>
          )}
        </div>

        {/* HABITAT ANALYSIS */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Habitat Analysis</h2>
              <p>
                Bird detections and species diversity across recorded habitats.
              </p>
            </div>
          </div>

          {/* LOCATION ANALYSIS */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Location Analysis</h2>
                <p>
                  Bird activity and species diversity across recorded locations.
                </p>
              </div>
            </div>

            {biodiversityLoading ? (
              <div className="empty-state">
                Loading location analysis...
              </div>
            ) : biodiversity.locations.length === 0 ? (
              <div className="empty-state">
                No geolocated analysis data available yet.
              </div>
            ) : (
              <div className="table-container">
                <table className="recordings-table">
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Habitat</th>
                      <th>Detections</th>
                      <th>Unique Species</th>
                      <th>Coordinates</th>
                    </tr>
                  </thead>

                  <tbody>
                    {biodiversity.locations.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <strong>
                            {item.location_name || "Unknown"}
                          </strong>
                        </td>

                        <td>
                          {item.habitat || "Not specified"}
                        </td>

                        <td>
                          {item.detection_count}
                        </td>

                        <td>
                          {item.species_count}
                        </td>

                        <td>
                          {item.latitude.toFixed(4)},{" "}
                          {item.longitude.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SPECIES ANALYSIS */}

<div className="panel">
  <div className="panel-header">
    <div>
      <h2>Species Analysis</h2>
      <p>
        Detection frequency and average confidence for identified bird species.
      </p>
    </div>
  </div>

  {biodiversityLoading ? (
    <div className="empty-state">
      Loading species analysis...
    </div>
  ) : biodiversity.species.length === 0 ? (
    <div className="empty-state">
      No species analysis data available yet.
    </div>
  ) : (
    <div className="table-container">
      <table className="recordings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Species</th>
            <th>Detections</th>
            <th>Average Detection Confidence</th>
          </tr>
        </thead>

        <tbody>
          {biodiversity.species.map((item, index) => (
            <tr key={index}>
              <td>
                <strong>#{index + 1}</strong>
              </td>

              <td>
                <strong>{item.species_name}</strong>
              </td>

              <td>
                {item.detection_count}
              </td>

              <td>
                {item.average_confidence}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

          {biodiversityLoading ? (
            <div className="empty-state">
              Loading habitat analysis...
            </div>
          ) : biodiversity.habitats.length === 0 ? (
            <div className="empty-state">
              No habitat data available yet.
            </div>
          ) : (
            <div className="table-container">
              <table className="recordings-table">
                <thead>
                  <tr>
                    <th>Habitat</th>
                    <th>Detections</th>
                    <th>Unique Species</th>
                  </tr>
                </thead>

                <tbody>
                  {biodiversity.habitats.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{item.habitat}</strong>
                      </td>

                      <td>
                        {item.detection_count}
                      </td>

                      <td>
                        {item.species_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">RECORDING DATABASE</p>
            <h1>Recording History</h1>
            <p>
              Review previous acoustic recordings and their BirdNET
              detections.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => setActivePage("analysis")}
          >
            + New Analysis
          </button>
        </div>

        <div className="panel history-panel">
          <div className="panel-header">
            <div>
              <h2>All Recordings</h2>
              <p>{recordings.length} recordings stored in WildWave</p>
            </div>
          </div>

          {loadingHistory ? (
            <div className="loading-state">
              <span className="spinner dark"></span>
              Loading recordings...
            </div>
          ) : recordings.length === 0 ? (
            <div className="empty-state">
              <div>📂</div>
              <h3>No recordings found</h3>
              <p>Your analyzed audio files will appear here.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Recording</th>
                    <th>Location</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {recordings.map((recording) => (
                    <tr key={recording.id}>
                      <td>
                        <div className="table-file">
                          <span>🎵</span>
                          <strong>{recording.filename}</strong>
                        </div>
                      </td>

                      <td>
                        📍 {recording.location_name || "Unknown"}
                      </td>

                      <td>{formatDate(recording.created_at)}</td>

                      <td>{formatDuration(recording.duration)}</td>

                      <td>
                        <button
                          className="table-button"
                          onClick={() => viewRecording(recording.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedRecording) return null;

    const recording = selectedRecording.recording;

    return (
      <div
        className="modal-overlay"
        onClick={() => setSelectedRecording(null)}
      >
        <div
          className="details-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <div>
              <p className="eyebrow">RECORDING DETAILS</p>
              <h2>{recording.filename}</h2>
            </div>

            <button
              className="close-button"
              onClick={() => setSelectedRecording(null)}
            >
              ×
            </button>
          </div>

          <div className="detail-grid">
            <div>
              <span>Location</span>
              <strong>
                {recording.location_name || "Unknown"}
              </strong>
            </div>

            <div>
              <span>Duration</span>
              <strong>{formatDuration(recording.duration)}</strong>
            </div>

            <div>
              <span>Sample Rate</span>
              <strong>{recording.sample_rate || "-"} Hz</strong>
            </div>

            <div>
              <span>Channels</span>
              <strong>{recording.channels || "-"}</strong>
            </div>

            <div>
              <span>Latitude</span>
              <strong>{recording.latitude || "-"}</strong>
            </div>

            <div>
              <span>Longitude</span>
              <strong>{recording.longitude || "-"}</strong>
            </div>
          </div>

          <div className="detections-section">
            <div className="panel-header">
              <div>
                <h3>Bird Detections</h3>
                <p>
                  {selectedRecording.total_detections} detections found
                </p>
              </div>
            </div>

            {selectedRecording.detections?.length > 0 ? (
              <div className="modal-detections">
                {selectedRecording.detections.map((detection) => (
                  <div
                    className="modal-detection"
                    key={detection.id}
                  >
                    <span>🐦</span>

                    <div>
                      <strong>{detection.species_name}</strong>
                      <small>BirdNET species detection</small>
                    </div>

                    <strong className="detection-confidence">
                      {detection.confidence}%
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>No detections available.</p>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="danger-button"
              onClick={() => deleteRecording(recording.id)}
            >
              Delete Recording
            </button>

            <button
              className="secondary-button"
              onClick={() => setSelectedRecording(null)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!token) {
    return renderAuthPage();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🦜</div>

          <div>
            <h2>WildWave</h2>
            <span>Bird Intelligence</span>
          </div>
        </div>

        <nav className="navigation">
          <button
            className={activePage === "dashboard" ? "active" : ""}
            onClick={() => setActivePage("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={activePage === "analysis" ? "active" : ""}
            onClick={() => setActivePage("analysis")}
          >
            <span>🎙</span>
            New Analysis
          </button>

          <button
            className={activePage === "history" ? "active" : ""}
            onClick={() => setActivePage("history")}
          >
            <span>▤</span>
            Recording History
          </button>

          <div className="nav-divider"></div>

          <button
            className={activePage === "map" ? "active" : ""}
            onClick={() => setActivePage("map")}
          >
            <span>🗺</span>
            Biodiversity Map
          </button>

          {/* Analytics */}
          <button
            className={activePage === "analytics" ? "active" : ""}
            onClick={() => {
              setActivePage("analytics");
              loadAnalytics();
            }}
          >
            <span>📊</span>
            Analytics
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="ai-status">
            <span className="online-dot"></span>
            <div>
              <strong>AI Engine Online</strong>
              <small>BirdNET ready</small>
            </div>
          </div>

          <p>WildWave v1.0</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="topbar-label">
              WILDLIFE MONITORING PLATFORM
            </span>
          </div>

          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {currentUser?.name && (
              <span style={{ color: "#42564a", fontSize: "14px" }}>
                {currentUser.name}
              </span>
            )}
            <span className="api-status">
              <span></span>
              API Connected
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {activePage === "dashboard" && renderDashboard()}
        {activePage === "analysis" && renderAnalysis()}
        {activePage === "history" && renderHistory()}
        {activePage === "map" && renderMap()}
        {activePage === "analytics" && renderAnalytics()}
      </main>

      {loadingDetails && (
        <div className="modal-overlay">
          <div className="loading-modal">
            <span className="spinner dark"></span>
            Loading recording...
          </div>
        </div>
      )}

      {selectedRecording && renderDetails()}
    </div>
  );
}

export default App;
