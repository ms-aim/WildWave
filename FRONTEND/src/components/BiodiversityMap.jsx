
import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Send the logged-in user's token only with WildWave backend requests.
const API_URL = "http://localhost:8000";

const fetchWithAuth = (url, options = {}) => {
  const token = localStorage.getItem("wildwave_access_token");

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Automatically adjust map view based on filtered recordings
function MapViewUpdater({ recordings }) {
  const map = useMap();

  useEffect(() => {
    if (recordings.length === 0) {
      return;
    }

    const bounds = recordings.map((recording) => [
      Number(recording.latitude),
      Number(recording.longitude),
    ]);

    map.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: 13,
    });
  }, [recordings, map]);

  return null;
}

// Biodiversity information inside popup
function BiodiversityPopupContent({ locationName }) {
  const [locationDetails, setLocationDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!locationName) {
      setLocationDetails(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;

    const loadLocationDetails = async () => {
      try {
        setLoading(true);
        setError(false);
        setLocationDetails(null);

        const response = await fetchWithAuth(
          `${API_URL}/biodiversity/location/${encodeURIComponent(
            locationName
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to load location details");
        }

        const data = await response.json();

        if (!cancelled) {
          setLocationDetails(data);
        }
      } catch (error) {
        console.error(
          "Failed to load biodiversity information:",
          error
        );

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLocationDetails();

    return () => {
      cancelled = true;
    };
  }, [locationName]);

  if (loading) {
    return <p>🔄 Loading biodiversity information...</p>;
  }

  if (error) {
    return <p>❌ Failed to load biodiversity information.</p>;
  }

  if (!locationDetails) {
    return <p>No biodiversity information available.</p>;
  }

  return (
    <>
      <p>
        🐦 Species Detected:{" "}
        <strong>{locationDetails.species_count ?? 0}</strong>
      </p>

      <p>
        🔊 Total Detections:{" "}
        <strong>{locationDetails.total_detections ?? 0}</strong>
      </p>

      <p>
        🎯 Avg Confidence:{" "}
        <strong>
          {locationDetails.average_confidence ?? 0}%
        </strong>
      </p>

      <hr />

      <p>
        <strong>🐦 Detected Species</strong>
      </p>

      {locationDetails.species &&
      locationDetails.species.length > 0 ? (
        <div className="popup-species-list">
          {locationDetails.species.map((species, index) => (
            <div
              key={`${species.species_name}-${index}`}
              className="popup-species-item"
            >
              <div>
                <strong>{species.species_name}</strong>
              </div>

              <div className="popup-species-stats">
                🔊 {species.detection_count} detections
                {" • "}
                🎯 {species.average_confidence}%
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No species detected.</p>
      )}
    </>
  );
}

function BiodiversityMap({ recordings = [] }) {
  // Filter states
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedHabitat, setSelectedHabitat] = useState("All");
  const [selectedSpecies, setSelectedSpecies] = useState("All");

  // Species detected at each location
  const [speciesByLocation, setSpeciesByLocation] = useState({});
  const [speciesLoading, setSpeciesLoading] = useState(false);

  // Default map location: Nashik
  const defaultPosition = [19.9975, 73.7898];

  // Keep only recordings with valid GPS coordinates
  const validRecordings = recordings.filter((recording) => {
    if (
      recording.latitude === null ||
      recording.latitude === undefined ||
      recording.latitude === "" ||
      recording.longitude === null ||
      recording.longitude === undefined ||
      recording.longitude === ""
    ) {
      return false;
    }

    const latitude = Number(recording.latitude);
    const longitude = Number(recording.longitude);

    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  });

  // Stable list of unique location names
  const locationsKey = JSON.stringify(
    [
      ...new Set(
        validRecordings
          .map((recording) => recording.location_name?.trim())
          .filter(Boolean)
      ),
    ].sort()
  );

  // Load species data for all unique locations
  useEffect(() => {
    const locationNames = JSON.parse(locationsKey);
    let cancelled = false;

    const loadSpecies = async () => {
      if (locationNames.length === 0) {
        setSpeciesByLocation({});
        setSpeciesLoading(false);
        return;
      }

      setSpeciesLoading(true);

      try {
        const results = await Promise.all(
          locationNames.map(async (locationName) => {
            try {
              const response = await fetchWithAuth(
                `${API_URL}/biodiversity/location/${encodeURIComponent(
                  locationName
                )}`
              );

              if (!response.ok) {
                return [locationName, []];
              }

              const data = await response.json();

              const speciesNames = [
                ...new Set(
                  (data.species || [])
                    .map((item) => item.species_name)
                    .filter(Boolean)
                ),
              ];

              return [locationName, speciesNames];
            } catch (error) {
              console.error(
                `Failed to load species for ${locationName}:`,
                error
              );

              return [locationName, []];
            }
          })
        );

        if (!cancelled) {
          setSpeciesByLocation(Object.fromEntries(results));
        }
      } finally {
        if (!cancelled) {
          setSpeciesLoading(false);
        }
      }
    };

    loadSpecies();

    return () => {
      cancelled = true;
    };
  }, [locationsKey]);

  // Unique location options
  const locations = [
    ...new Set(
      validRecordings
        .map((recording) => recording.location_name?.trim())
        .filter(Boolean)
    ),
  ].sort();

  // Unique habitat options
  const habitats = [
    ...new Set(
      validRecordings
        .map((recording) => recording.habitat?.trim())
        .filter(Boolean)
    ),
  ].sort();

  // Unique bird species options
  const speciesOptions = [
    ...new Set(
      Object.values(speciesByLocation).flat()
    ),
  ].sort();

  // Apply location, habitat, and species filters together
  const filteredRecordings = validRecordings.filter((recording) => {
    const locationName = recording.location_name?.trim();

    const matchesLocation =
      selectedLocation === "All" ||
      locationName === selectedLocation;

    const matchesHabitat =
      selectedHabitat === "All" ||
      recording.habitat?.trim() === selectedHabitat;

    const locationSpecies =
      speciesByLocation[locationName] || [];

    const matchesSpecies =
      selectedSpecies === "All" ||
      locationSpecies.includes(selectedSpecies);

    return (
      matchesLocation &&
      matchesHabitat &&
      matchesSpecies
    );
  });

  // Reset a selected option if it no longer exists
  useEffect(() => {
    if (
      selectedLocation !== "All" &&
      !locations.includes(selectedLocation)
    ) {
      setSelectedLocation("All");
    }
  }, [locationsKey, selectedLocation]);

  useEffect(() => {
    if (
      selectedHabitat !== "All" &&
      !habitats.includes(selectedHabitat)
    ) {
      setSelectedHabitat("All");
    }
  }, [JSON.stringify(habitats), selectedHabitat]);

  useEffect(() => {
    if (
      selectedSpecies !== "All" &&
      !speciesOptions.includes(selectedSpecies) &&
      !speciesLoading
    ) {
      setSelectedSpecies("All");
    }
  }, [
    JSON.stringify(speciesOptions),
    selectedSpecies,
    speciesLoading,
  ]);

  // Center map on the first filtered recording
  const center =
    filteredRecordings.length > 0
      ? [
          Number(filteredRecordings[0].latitude),
          Number(filteredRecordings[0].longitude),
        ]
      : defaultPosition;

  return (
    <div className="map-container">
      {/* Location, habitat, and species filters */}
      <div className="map-filters">
        <div className="map-filter-group">
          <label htmlFor="map-location-filter">
            Location
          </label>

          <select
            id="map-location-filter"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="All">All Locations</option>

            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <div className="map-filter-group">
          <label htmlFor="map-habitat-filter">
            Habitat
          </label>

          <select
            id="map-habitat-filter"
            value={selectedHabitat}
            onChange={(e) => setSelectedHabitat(e.target.value)}
          >
            <option value="All">All Habitats</option>

            {habitats.map((habitat) => (
              <option key={habitat} value={habitat}>
                {habitat}
              </option>
            ))}
          </select>
        </div>

        <div className="map-filter-group">
          <label htmlFor="map-species-filter">
            Bird Species
          </label>

          <select
            id="map-species-filter"
            value={selectedSpecies}
            onChange={(e) => setSelectedSpecies(e.target.value)}
          >
            <option value="All">All Species</option>

            {speciesOptions.map((species) => (
              <option key={species} value={species}>
                {species}
              </option>
            ))}
          </select>

          {speciesLoading && (
            <small>Loading species...</small>
          )}
        </div>

        <button
          type="button"
          className="map-filter-reset"
          onClick={() => {
            setSelectedLocation("All");
            setSelectedHabitat("All");
            setSelectedSpecies("All");
          }}
        >
          Reset Filters
        </button>

        <span className="map-filter-count">
          Showing {filteredRecordings.length} of{" "}
          {validRecordings.length} recordings
        </span>
      </div>

      {/* Leaflet map */}
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        {/* Automatically fit map to filtered locations */}
        <MapViewUpdater recordings={filteredRecordings} />

        {/* Free OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Recording markers */}
        {filteredRecordings.map((recording) => (
          <Marker
            key={recording.id}
            position={[
              Number(recording.latitude),
              Number(recording.longitude),
            ]}
          >
            <Popup>
              <div className="map-popup">
                <strong>
                  {recording.location_name || "Unknown Location"}
                </strong>

                <p>
                  🎙️ Recording: {recording.filename || "Unknown"}
                </p>

                <p>
                  🌿 Habitat:{" "}
                  {recording.habitat || "Not specified"}
                </p>

                <p>
                  🕒 Recorded:{" "}
                  {recording.created_at
                    ? new Date(recording.created_at).toLocaleString()
                    : "Unknown date"}
                </p>

                <p>
                  🎵 Duration:{" "}
                  {recording.duration
                    ? `${Number(recording.duration).toFixed(1)} sec`
                    : "Unknown"}
                </p>

                <p>
                  📍 Coordinates:{" "}
                  {Number(recording.latitude).toFixed(4)},{" "}
                  {Number(recording.longitude).toFixed(4)}
                </p>

                <hr />

                {/* Existing biodiversity API popup */}
                <BiodiversityPopupContent
                  locationName={recording.location_name}
                />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Empty-state message */}
      {filteredRecordings.length === 0 && (
        <div className="map-empty-message">
          <strong>No matching recordings</strong>

          <span>
            Try changing the location, habitat, or species filters.
          </span>
        </div>
      )}
    </div>
  );
}

export default BiodiversityMap;