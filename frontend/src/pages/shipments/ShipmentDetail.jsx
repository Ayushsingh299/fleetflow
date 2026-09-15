import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import api from "../../api/axios";

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const STAGES = ["Created", "Assigned", "In Transit", "Delivered"];

  useEffect(() => {
    loadShipment();
  }, [id]);

  const loadShipment = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/shipments/${id}`);
      setShipment(res.data);
      // Optional: fetch events if API provides it, or assume it's included
      // Wait, we didn't add events fetching to get_shipment API. 
      // For now, we'll just show the visual stepper based on current status.
    } catch (error) {
      console.error(error);
      alert("Failed to load shipment details");
    } finally {
      setLoading(false);
    }
  };

  const getStageIndex = (status) => {
    if (status === "Cancelled") return -1;
    if (status === "Delayed") return 2; // Treat as In Transit for stepper
    return STAGES.indexOf(status);
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.content}>
        <header style={styles.header}>
          <button onClick={() => navigate("/shipments")} style={styles.backButton}>
            <ArrowLeft size={20} /> Back
          </button>
          <div style={styles.titleArea}>
            <h1 style={styles.title}>Shipment Details</h1>
            {shipment && <span style={styles.tracking}>{shipment.tracking_number}</span>}
          </div>
        </header>

        <main style={styles.main}>
          {loading ? (
            <div>Loading...</div>
          ) : !shipment ? (
            <div>Shipment not found.</div>
          ) : (
            <div style={styles.card}>
              <div style={styles.infoGrid}>
                <div style={styles.infoGroup}>
                  <label style={styles.label}>Customer</label>
                  <p style={styles.value}>{shipment.customer_name}</p>
                </div>
                <div style={styles.infoGroup}>
                  <label style={styles.label}>Route</label>
                  <p style={styles.value}>{shipment.source} → {shipment.destination}</p>
                </div>
                <div style={styles.infoGroup}>
                  <label style={styles.label}>Status</label>
                  <p style={{ ...styles.value, ...getStatusStyle(shipment.status) }}>
                    {shipment.status}
                  </p>
                </div>
                <div style={styles.infoGroup}>
                  <label style={styles.label}>Expected Delivery</label>
                  <p style={styles.value}>
                    {shipment.expected_delivery ? new Date(shipment.expected_delivery).toLocaleString() : "-"}
                  </p>
                </div>
              </div>

              {/* VISUAL STEPPER */}
              <div style={styles.stepperContainer}>
                {STAGES.map((stage, index) => {
                  const currentIndex = getStageIndex(shipment.status);
                  const isCompleted = index <= currentIndex;
                  const isActive = index === currentIndex;

                  return (
                    <div key={stage} style={styles.step}>
                      <div
                        style={{
                          ...styles.stepCircle,
                          ...(isCompleted ? styles.stepCompleted : {}),
                          ...(isActive ? styles.stepActive : {}),
                        }}
                      >
                        {isCompleted ? <CheckCircle2 size={16} /> : index + 1}
                      </div>
                      <div style={{
                        ...styles.stepLabel,
                        ...(isActive ? styles.stepLabelActive : {})
                      }}>
                        {stage}
                      </div>
                      {index < STAGES.length - 1 && (
                        <div style={{
                          ...styles.stepLine,
                          ...(index < currentIndex ? styles.stepLineCompleted : {})
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* TIMELINE / HISTORY */}
              <div style={styles.timelineContainer}>
                <h3 style={styles.timelineTitle}>Status History</h3>
                {(!shipment.events || shipment.events.length === 0) ? (
                  <p style={styles.noEventsText}>No status events recorded yet.</p>
                ) : (
                  <div style={styles.timeline}>
                    {shipment.events
                      .slice()
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .map((event, index) => (
                        <div key={event.event_id} style={styles.timelineItem}>
                          <div style={styles.timelineDot}></div>
                          {index !== shipment.events.length - 1 && <div style={styles.timelineLine}></div>}
                          
                          <div style={styles.timelineContent}>
                            <div style={styles.timelineHeader}>
                              <span style={{ ...styles.timelineStatus, ...getStatusStyle(event.status) }}>
                                {event.status}
                              </span>
                              <span style={styles.timelineDate}>
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {event.notes && (
                              <p style={styles.timelineNotes}>{event.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const getStatusStyle = (status) => {
  switch (status) {
    case "Delivered": return { color: "#10b981", fontWeight: "bold" };
    case "Delayed": return { color: "#ef4444", fontWeight: "bold" };
    case "Cancelled": return { color: "#6b7280", fontWeight: "bold" };
    default: return { color: "#3b82f6", fontWeight: "bold" };
  }
};

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    marginLeft: "260px",
  },
  header: {
    backgroundColor: "#ffffff",
    padding: "24px 40px",
    borderBottom: "1px solid #e2e8f0",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "16px",
  },
  titleArea: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#0f172a",
  },
  tracking: {
    backgroundColor: "#f1f5f9",
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "14px",
    color: "#475569",
    fontFamily: "monospace",
  },
  main: {
    padding: "40px",
    flex: 1,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "32px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "24px",
    marginBottom: "48px",
  },
  infoGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  value: {
    margin: 0,
    fontSize: "16px",
    color: "#0f172a",
  },
  stepperContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    padding: "24px 0",
    marginTop: "24px",
    borderTop: "1px solid #f1f5f9",
  },
  step: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    position: "relative",
    zIndex: 1,
    flex: 1,
  },
  stepCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#f1f5f9",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  stepCompleted: {
    backgroundColor: "#10b981",
    color: "white",
  },
  stepActive: {
    backgroundColor: "#3b82f6",
    color: "white",
    boxShadow: "0 0 0 4px #bfdbfe",
  },
  stepLabel: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: 500,
  },
  stepLabelActive: {
    color: "#0f172a",
    fontWeight: 600,
  },
  stepLine: {
    position: "absolute",
    top: "18px",
    left: "50%",
    width: "100%",
    height: "3px",
    backgroundColor: "#f1f5f9",
    zIndex: -1,
  },
  stepLineCompleted: {
    backgroundColor: "#10b981",
  },
  timelineContainer: {
    marginTop: "48px",
    paddingTop: "32px",
    borderTop: "1px solid #e2e8f0",
  },
  timelineTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "24px",
  },
  noEventsText: {
    color: "#64748b",
    fontSize: "14px",
    fontStyle: "italic",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  timelineItem: {
    display: "flex",
    gap: "24px",
    position: "relative",
    paddingBottom: "32px",
  },
  timelineDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: "#cbd5e1",
    marginTop: "6px",
    zIndex: 1,
  },
  timelineLine: {
    position: "absolute",
    top: "18px",
    left: "5px",
    width: "2px",
    height: "100%",
    backgroundColor: "#e2e8f0",
    zIndex: 0,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  timelineStatus: {
    fontSize: "14px",
    fontWeight: 600,
  },
  timelineDate: {
    fontSize: "13px",
    color: "#64748b",
  },
  timelineNotes: {
    margin: 0,
    fontSize: "14px",
    color: "#475569",
    backgroundColor: "#f8fafc",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  }
};
