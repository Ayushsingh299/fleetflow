import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ================================================================
// CONSTANTS
// ================================================================

const DESTINATION = [28.6200, 77.2190];
const GEOFENCE_RADIUS = 500;
const WS_BASE = `ws://${window.location.hostname}:8000`;

// ================================================================
// NUMBERED VEHICLE ICON (SVG label with reg number)
// ================================================================

function makeVehicleIcon(label, isSelected) {
  const bg = isSelected ? "#6366f1" : "#22c55e";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52">
      <rect x="2" y="2" width="40" height="28" rx="6" ry="6"
        fill="${bg}" stroke="white" stroke-width="2"/>
      <text x="22" y="20" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="11" font-weight="bold"
        fill="white">${label}</text>
      <polygon points="14,29 30,29 22,44" fill="${bg}"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -54],
  });
}

function makeDotIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

const startIcon = makeDotIcon("#ef4444"); // Red
const endIcon = makeDotIcon("#10b981"); // Green

const destinationIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// ================================================================
// MAP AUTO-FIT — fits all vehicle markers in view
// ================================================================

function MapFitter({ positions, focusPosition }) {
  const map = useMap();

  useEffect(() => {
    if (focusPosition) {
      map.setView(focusPosition, 16, { animate: true });
      return;
    }
    const pts = Object.values(positions).filter(
      (p) => p?.latitude != null && p?.longitude != null
    );
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView([pts[0].latitude, pts[0].longitude], 15, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(
      pts.map((p) => [p.latitude, p.longitude])
    );
    map.fitBounds(bounds, { padding: [60, 60], animate: true });
  }, [positions, focusPosition, map]);

  return null;
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function LiveTracking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected vehicle ID (from URL param or user click)
  const [selectedId, setSelectedId] = useState(
    searchParams.get("vehicle_id") || null
  );

  // All vehicles from API
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // GPS data keyed by vehicle_id
  const [gpsMap, setGpsMap] = useState({});

  // WebSocket refs keyed by vehicle_id
  const socketsRef = useRef({});
  const timersRef = useRef({});
  const mountedRef = useRef(true);

  // ============================================================
  // LOAD ALL VEHICLES
  // ============================================================

  useEffect(() => {
    Promise.all([
      api.get("/vehicles/"),
      api.get("/trips/")
    ])
      .then(([vRes, tRes]) => {
        setVehicles(vRes.data);
        setTrips(tRes.data);
        setLoadingVehicles(false);
      })
      .catch(() => setLoadingVehicles(false));
  }, []);

  // ============================================================
  // CONNECT / DISCONNECT WS PER VEHICLE
  // ============================================================

  const connectWs = useCallback((vehicle) => {
    const vid = vehicle.vehicle_id;
    if (!mountedRef.current) return;

    const existing = socketsRef.current[vid];
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const url = `${WS_BASE}/ws/tracking/${vid}`;
    const ws = new WebSocket(url);
    socketsRef.current[vid] = ws;

    ws.onopen = () => {
      console.log(`✅ WS connected: ${vehicle.registration_number}`);
    };

    ws.onmessage = (evt) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(evt.data);
        if (!data.error) {
          setGpsMap((prev) => ({ ...prev, [vid]: data }));
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      console.warn(`WS error: ${vehicle.registration_number}`);
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      socketsRef.current[vid] = null;
      // Auto-reconnect after 3s
      timersRef.current[vid] = setTimeout(
        () => connectWs(vehicle),
        3000
      );
    };
  }, []);

  // Open WS for every vehicle when list loads
  useEffect(() => {
    if (vehicles.length === 0) return;
    mountedRef.current = true;
    vehicles.forEach((v) => connectWs(v));

    return () => {
      mountedRef.current = false;
      Object.values(timersRef.current).forEach(clearTimeout);
      Object.values(socketsRef.current).forEach((ws) => {
        if (ws) {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          if (
            ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING
          ) {
            ws.close();
          }
        }
      });
    };
  }, [vehicles, connectWs]);

  // ============================================================
  // DERIVED HELPERS
  // ============================================================

  const selectedVehicle = vehicles.find(
    (v) => v.vehicle_id === selectedId
  );
  const selectedGps = selectedId ? gpsMap[selectedId] : null;

  const connectedCount = Object.values(gpsMap).filter(
    (d) => d?.latitude != null
  ).length;

  // Map focus: if vehicle selected + has GPS → centre on it
  const focusPos =
    selectedGps?.latitude != null
      ? [selectedGps.latitude, selectedGps.longitude]
      : null;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div style={styles.page}>

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Live Fleet Tracking</h1>
          <p style={styles.subtitle}>
            Real-time GPS for all {vehicles.length} vehicle
            {vehicles.length !== 1 ? "s" : ""} ·{" "}
            <span style={{ color: "#22c55e", fontWeight: 600 }}>
              {connectedCount} live
            </span>
          </p>
        </div>

        <div style={styles.legendRow}>
          <span style={styles.legendDot("#22c55e")} /> Active GPS
          <span style={{ ...styles.legendDot("#6366f1"), marginLeft: 16 }} />
          Selected
          <span style={{ ...styles.legendDot("#94a3b8"), marginLeft: 16 }} />
          No signal
        </div>
      </div>

      {/* ====================================================== */}
      {/* FLEET OVERVIEW STATS */}
      {/* ====================================================== */}

      <div style={styles.statsRow}>
        <StatBubble
          value={vehicles.length}
          label="Total"
          color="#6366f1"
        />
        <StatBubble
          value={connectedCount}
          label="Live GPS"
          color="#22c55e"
        />
        <StatBubble
          value={
            vehicles.filter((v) => v.status === "In Transit").length
          }
          label="In Transit"
          color="#f59e0b"
        />
        <StatBubble
          value={
            vehicles.filter((v) => v.status === "Available").length
          }
          label="Available"
          color="#3b82f6"
        />
        <StatBubble
          value={
            vehicles.filter((v) => v.status === "Maintenance").length
          }
          label="Maintenance"
          color="#ef4444"
        />
      </div>

      <div style={styles.body}>

        {/* ================================================== */}
        {/* LEFT — VEHICLE LIST PANEL */}
        {/* ================================================== */}

        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            Fleet Vehicles
            {loadingVehicles && (
              <span style={styles.loadingDot}>Loading…</span>
            )}
          </div>

          {vehicles.length === 0 && !loadingVehicles && (
            <div style={styles.emptyMsg}>
              No vehicles found. Register a vehicle first.
            </div>
          )}

          {vehicles.map((v, idx) => {
            const gps = gpsMap[v.vehicle_id];
            const hasGps = gps?.latitude != null;
            const isSelected = v.vehicle_id === selectedId;

            return (
              <div
                key={v.vehicle_id}
                style={{
                  ...styles.vehicleItem,
                  ...(isSelected ? styles.vehicleItemSelected : {}),
                }}
                onClick={() =>
                  setSelectedId(isSelected ? null : v.vehicle_id)
                }
              >
                {/* Number badge */}
                <div
                  style={{
                    ...styles.numBadge,
                    background: isSelected ? "#6366f1" : hasGps ? "#22c55e" : "#94a3b8",
                  }}
                >
                  {idx + 1}
                </div>

                <div style={styles.vehicleInfo}>
                  <div style={styles.vehicleReg}>
                    {v.registration_number}
                  </div>
                  <div style={styles.vehicleType}>
                    {v.vehicle_type} · {v.brand}
                  </div>
                  <div
                    style={{
                      ...styles.vehicleStatus,
                      color: statusColor(v.status),
                    }}
                  >
                    {v.status}
                  </div>
                </div>

                <div style={styles.gpsPill(hasGps)}>
                  {hasGps ? "● LIVE" : "○ Wait"}
                </div>
              </div>
            );
          })}
        </div>

        {/* ================================================== */}
        {/* RIGHT — MAP + DETAIL */}
        {/* ================================================== */}

        <div style={styles.mainPanel}>

          {/* MAP */}
          <div style={styles.mapCard}>
            <div style={styles.mapHeader}>
              <h2 style={styles.mapTitle}>
                {selectedVehicle
                  ? `Tracking: ${selectedVehicle.registration_number}`
                  : "Fleet Overview Map"}
              </h2>
              <p style={styles.mapSubtitle}>
                {selectedVehicle
                  ? "Click the map sidebar entry to deselect"
                  : "Click a vehicle in the list to focus"}
              </p>
            </div>

            <MapContainer
              center={DESTINATION}
              zoom={13}
              style={styles.map}
            >
              <TileLayer
                attribution="© OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapFitter
                positions={gpsMap}
                focusPosition={focusPos}
              />

              {/* Destination geofence */}
              <Circle
                center={DESTINATION}
                radius={GEOFENCE_RADIUS}
                pathOptions={{
                  color: "#6366f1",
                  fillColor: "#6366f1",
                  fillOpacity: 0.08,
                  weight: 2,
                }}
              />
              <Marker position={DESTINATION} icon={destinationIcon}>
                <Popup>
                  <strong>FleetFlow HQ / Destination</strong>
                  <br />
                  Geofence: {GEOFENCE_RADIUS} m
                </Popup>
              </Marker>

              {/* Route Overlay */}
              {selectedVehicle && (() => {
                const activeTrip = trips.find(t => 
                  t.vehicle_id === selectedVehicle.vehicle_id && t.status === "In Transit"
                ) || trips.find(t => 
                  t.vehicle_id === selectedVehicle.vehicle_id && t.status === "Scheduled"
                );
                
                if (activeTrip?.route_geometry) {
                  try {
                    const geo = typeof activeTrip.route_geometry === "string" 
                      ? JSON.parse(activeTrip.route_geometry)
                      : activeTrip.route_geometry;
                      
                    if (geo && geo.coordinates) {
                      // OSRM returns [lon, lat], Leaflet Polyline expects [lat, lon]
                      const latLngs = geo.coordinates.map(coord => [coord[1], coord[0]]);
                      const startPos = latLngs[0];
                      const endPos = latLngs[latLngs.length - 1];

                      return (
                        <>
                          <Polyline 
                            positions={latLngs} 
                            pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }} 
                          />
                          <Marker position={startPos} icon={startIcon}>
                            <Popup>Route Source</Popup>
                          </Marker>
                          <Marker position={endPos} icon={endIcon}>
                            <Popup>Route Destination</Popup>
                          </Marker>
                        </>
                      );
                    }
                  } catch (e) {
                    console.error("Failed to parse route_geometry", e);
                  }
                }
                return null;
              })()}

              {/* All vehicles with GPS */}
              {vehicles.map((v, idx) => {
                const gps = gpsMap[v.vehicle_id];
                if (!gps?.latitude || !gps?.longitude) return null;
                const isSelected = v.vehicle_id === selectedId;

                // Short label: last 6 chars of reg or just number
                const label =
                  v.registration_number?.slice(-6) || `V${idx + 1}`;

                return (
                  <Marker
                    key={v.vehicle_id}
                    position={[gps.latitude, gps.longitude]}
                    icon={makeVehicleIcon(label, isSelected)}
                    eventHandlers={{
                      click: () => setSelectedId(v.vehicle_id),
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <h3 style={{ margin: "0 0 6px" }}>
                          {v.registration_number}
                        </h3>
                        <table style={{ width: "100%", fontSize: 12 }}>
                          <tbody>
                            <tr>
                              <td><b>Type</b></td>
                              <td>{v.vehicle_type}</td>
                            </tr>
                            <tr>
                              <td><b>Status</b></td>
                              <td style={{ color: statusColor(v.status) }}>
                                {v.status}
                              </td>
                            </tr>
                            <tr>
                              <td><b>Speed</b></td>
                              <td>{gps.speed} km/h</td>
                            </tr>
                            <tr>
                              <td><b>Distance</b></td>
                              <td>{gps.distance_to_destination ?? "--"} m</td>
                            </tr>
                            <tr>
                              <td><b>Geofence</b></td>
                              <td>
                                {gps.inside_geofence ? "✅ Inside" : "Outside"}
                              </td>
                            </tr>
                            <tr>
                              <td><b>Lat</b></td>
                              <td>{gps.latitude}</td>
                            </tr>
                            <tr>
                              <td><b>Lon</b></td>
                              <td>{gps.longitude}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* SELECTED VEHICLE DETAIL PANEL */}
          {selectedVehicle ? (
            <div style={styles.detailCard}>
              <h2 style={styles.detailTitle}>
                {selectedVehicle.registration_number} — Live Detail
              </h2>
              
              {selectedGps?.event && selectedGps.event.includes("Deviation") && (
                <div style={{ padding: "12px", backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: "8px", marginBottom: "16px", fontWeight: "bold" }}>
                  ⚠️ Route Deviation Detected. Recalculating...
                </div>
              )}

              {!selectedGps ? (
                <div style={styles.waiting}>
                  ⏳ Waiting for GPS signal from{" "}
                  {selectedVehicle.registration_number}…
                  <br />
                  <small>
                    Run the GPS simulator:{" "}
                    <code>python gps_simulator.py</code>
                  </small>
                </div>
              ) : (
                <div style={styles.detailGrid}>
                  <DetailItem label="Speed" value={`${selectedGps.speed} km/h`} />
                  <DetailItem
                    label="Distance to Dest."
                    value={
                      selectedGps.distance_to_destination != null
                        ? `${selectedGps.distance_to_destination} m`
                        : "--"
                    }
                  />
                  <DetailItem
                    label="ETA"
                    value={selectedGps.formatted_eta || "--"}
                  />
                  <DetailItem
                    label="Geofence"
                    value={
                      selectedGps.inside_geofence
                        ? "✅ Inside (Arrived)"
                        : "Outside"
                    }
                  />
                  <DetailItem
                    label="Status"
                    value={selectedGps.status || selectedVehicle.status}
                  />
                  <DetailItem label="Latitude" value={selectedGps.latitude} />
                  <DetailItem label="Longitude" value={selectedGps.longitude} />
                  <DetailItem
                    label="Event"
                    value={selectedGps.event || "GPS update"}
                  />
                  <DetailItem
                    label="Recorded"
                    value={
                      selectedGps.recorded_time
                        ? new Date(selectedGps.recorded_time).toLocaleTimeString()
                        : "--"
                    }
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={styles.hintCard}>
              <span style={{ fontSize: 32 }}>🗺️</span>
              <p>
                Select a vehicle from the left panel to view its live
                GPS detail
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ================================================================
// SUB-COMPONENTS
// ================================================================

function StatBubble({ value, label, color }) {
  return (
    <div style={styles.statBubble}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={styles.detailItem}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value ?? "--"}</div>
    </div>
  );
}

// ================================================================
// HELPERS
// ================================================================

function statusColor(status) {
  switch (status) {
    case "Available":  return "#22c55e";
    case "In Transit": return "#f59e0b";
    case "Assigned":   return "#3b82f6";
    case "Maintenance":return "#ef4444";
    default:           return "#94a3b8";
  }
}

// ================================================================
// STYLES
// ================================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: "24px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "4px 0 0",
  },

  legendRow: {
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    color: "#64748b",
    gap: 4,
  },

  legendDot: (color) => ({
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: color,
    marginRight: 4,
  }),

  statsRow: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  statBubble: {
    background: "white",
    borderRadius: 12,
    padding: "12px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,.08)",
    minWidth: 80,
    textAlign: "center",
  },

  statValue: {
    fontSize: 28,
    fontWeight: 700,
  },

  statLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  body: {
    display: "flex",
    gap: 20,
    alignItems: "flex-start",
  },

  sidebar: {
    width: 280,
    flexShrink: 0,
    background: "white",
    borderRadius: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,.08)",
    overflow: "hidden",
  },

  sidebarHeader: {
    padding: "14px 16px",
    fontWeight: 700,
    fontSize: 14,
    color: "#0f172a",
    background: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  loadingDot: {
    fontSize: 11,
    color: "#94a3b8",
  },

  emptyMsg: {
    padding: 20,
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
  },

  vehicleItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s",
  },

  vehicleItemSelected: {
    background: "#eef2ff",
    borderLeft: "3px solid #6366f1",
  },

  numBadge: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    color: "white",
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  vehicleInfo: {
    flex: 1,
    minWidth: 0,
  },

  vehicleReg: {
    fontWeight: 700,
    fontSize: 13,
    color: "#0f172a",
  },

  vehicleType: {
    fontSize: 11,
    color: "#94a3b8",
  },

  vehicleStatus: {
    fontSize: 11,
    fontWeight: 600,
    marginTop: 2,
  },

  gpsPill: (active) => ({
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 7px",
    borderRadius: 99,
    color: active ? "#16a34a" : "#94a3b8",
    background: active ? "#dcfce7" : "#f1f5f9",
    whiteSpace: "nowrap",
  }),

  mainPanel: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  mapCard: {
    background: "white",
    borderRadius: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,.08)",
    overflow: "hidden",
  },

  mapHeader: {
    padding: "14px 20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  mapTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },

  mapSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    margin: 0,
  },

  map: {
    height: 460,
    width: "100%",
  },

  detailCard: {
    background: "white",
    borderRadius: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,.08)",
    padding: "20px 24px",
  },

  detailTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 16px",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 12,
  },

  detailItem: {
    background: "#f8fafc",
    borderRadius: 10,
    padding: "10px 14px",
  },

  detailLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: 600,
    color: "#0f172a",
  },

  waiting: {
    textAlign: "center",
    padding: 24,
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 1.7,
  },

  hintCard: {
    background: "white",
    borderRadius: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,.08)",
    padding: "32px 24px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
  },
};