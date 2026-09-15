import React, { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Calendar, X, Eye } from "lucide-react";

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [previewData, setPreviewData] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const handleDownload = async (endpoint, filename) => {
    try {
      setLoading(true);
      setError(null);
      
      let urlEndpoint = endpoint;
      if (startDate || endDate) {
          const params = new URLSearchParams();
          if (startDate) params.append("start_date", startDate);
          if (endDate) params.append("end_date", endDate);
          urlEndpoint += `?${params.toString()}`;
      }

      const response = await api.get(urlEndpoint, {
        responseType: "blob",
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed", err);
      setError("Failed to download report.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (endpoint, title) => {
    try {
        setLoading(true);
        setError(null);

        let urlEndpoint = endpoint;
        if (startDate || endDate) {
            const params = new URLSearchParams();
            if (startDate) params.append("start_date", startDate);
            if (endDate) params.append("end_date", endDate);
            urlEndpoint += `?${params.toString()}`;
        }

        const response = await api.get(urlEndpoint);
        setPreviewData(response.data);
        setPreviewTitle(title);
    } catch (err) {
        console.error("Preview failed", err);
        setError("Failed to load report preview.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div style={styles.app}>
      <Sidebar />
      <div style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Reports & Exports</h1>
            <p style={styles.subtitle}>Generate and download fleet analytics</p>
          </div>
          
          <div style={styles.dateFilters}>
              <div style={styles.dateGroup}>
                  <label style={styles.dateLabel}>Start Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    style={styles.dateInput} 
                  />
              </div>
              <div style={styles.dateGroup}>
                  <label style={styles.dateLabel}>End Date</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    style={styles.dateInput} 
                  />
              </div>
          </div>
        </header>

        <main style={styles.main}>
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.grid}>
            {(user?.role === "Admin" || user?.role === "FleetManager" || user?.role === "Dispatcher") && (
              <div style={styles.card}>
                <h3>Delivery Performance</h3>
                <p>Metrics on on-time delivery rate, delayed shipments, and completion stats.</p>
                <div style={styles.buttonGroup}>
                  <button
                    disabled={loading}
                    onClick={() => handlePreview("/analytics/summary", "Delivery Performance Preview")}
                    style={styles.buttonPreview}
                  >
                    <Eye size={16} /> Preview
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleDownload("/analytics/export/delivery-performance/pdf", "delivery_performance.pdf")}
                    style={styles.buttonPdf}
                  >
                    PDF
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleDownload("/analytics/export/delivery-performance/excel", "delivery_performance.xlsx")}
                    style={styles.buttonExcel}
                  >
                    Excel
                  </button>
                </div>
              </div>
            )}

            {(user?.role === "Admin" || user?.role === "FleetManager") && (
              <>
                <div style={styles.card}>
                  <h3>Fleet Utilization</h3>
                  <p>A snapshot of the current fleet utilization percentage and statuses.</p>
                  <div style={styles.buttonGroup}>
                    <button
                        disabled={loading}
                        onClick={() => handlePreview("/analytics/summary", "Fleet Utilization Preview")}
                        style={styles.buttonPreview}
                    >
                        <Eye size={16} /> Preview
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleDownload("/analytics/export/fleet-summary/pdf", "fleet_summary.pdf")}
                      style={styles.buttonPdf}
                    >
                      PDF
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleDownload("/analytics/export/fleet-summary/excel", "fleet_summary.xlsx")}
                      style={styles.buttonExcel}
                    >
                      Excel
                    </button>
                  </div>
                </div>

                <div style={styles.card}>
                  <h3>Driver Performance</h3>
                  <p>Metrics including trips completed, distance driven, and attendance rate.</p>
                  <div style={styles.buttonGroup}>
                    <button
                        disabled={loading}
                        onClick={() => handlePreview("/analytics/driver-performance", "Driver Performance Preview")}
                        style={styles.buttonPreview}
                    >
                        <Eye size={16} /> Preview
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleDownload("/analytics/export/driver-performance/pdf", "driver_performance.pdf")}
                      style={styles.buttonPdf}
                    >
                      PDF
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleDownload("/analytics/export/driver-performance/excel", "driver_performance.xlsx")}
                      style={styles.buttonExcel}
                    >
                      Excel
                    </button>
                  </div>
                </div>

                <div style={styles.card}>
                  <h3>Fuel Trends</h3>
                  <p>Fuel consumption, costs, and efficiency per vehicle.</p>
                  <div style={styles.buttonGroup}>
                    <button
                        disabled={loading}
                        onClick={() => handlePreview("/analytics/fuel-trends", "Fuel Trends Preview")}
                        style={styles.buttonPreview}
                    >
                        <Eye size={16} /> Preview
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleDownload("/analytics/export/fuel-trends/pdf", "fuel_trends.pdf")}
                      style={styles.buttonPdf}
                    >
                      PDF
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleDownload("/analytics/export/fuel-trends/excel", "fuel_trends.xlsx")}
                      style={styles.buttonExcel}
                    >
                      Excel
                    </button>
                  </div>
                </div>

                <div style={styles.card}>
                  <h3>Maintenance Costs</h3>
                  <p>Maintenance records and aggregated costs per vehicle.</p>
                  <div style={styles.buttonGroup}>
                    <button
                        disabled={loading}
                        onClick={() => handlePreview("/analytics/maintenance-costs", "Maintenance Costs Preview")}
                        style={styles.buttonPreview}
                    >
                        <Eye size={16} /> Preview
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleDownload("/analytics/export/maintenance-costs/pdf", "maintenance_costs.pdf")}
                      style={styles.buttonPdf}
                    >
                      PDF
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleDownload("/analytics/export/maintenance-costs/excel", "maintenance_costs.xlsx")}
                      style={styles.buttonExcel}
                    >
                      Excel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* PREVIEW MODAL */}
      {previewData && (
          <div style={styles.overlay}>
              <div style={styles.modal}>
                  <div style={styles.modalHeader}>
                      <h2>{previewTitle}</h2>
                      <button style={styles.closeButton} onClick={() => setPreviewData(null)}>
                          <X size={24} />
                      </button>
                  </div>
                  <div style={styles.modalContent}>
                      <pre style={styles.jsonPreview}>
                          {JSON.stringify(previewData, null, 2)}
                      </pre>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f8fafc",
  },
  content: {
    marginLeft: "250px",
    minHeight: "100vh",
  },
  header: {
    padding: "30px 50px",
    background: "white",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    color: "#0f172a",
    fontWeight: "700",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#64748b",
  },
  dateFilters: {
    display: "flex",
    gap: "20px",
  },
  dateGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  dateLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  dateInput: {
    padding: "10px 15px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    outline: "none",
    fontFamily: "inherit",
    color: "#0f172a",
  },
  main: {
    padding: "35px 50px",
  },
  error: {
    padding: "15px",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "25px",
  },
  card: {
    background: "white",
    padding: "25px",
    borderRadius: "16px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginTop: "25px",
  },
  buttonPreview: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    background: "#f1f5f9",
    color: "#334155",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    flex: 1,
    justifyContent: "center",
  },
  buttonPdf: {
    padding: "10px 16px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    flex: 1,
  },
  buttonExcel: {
    padding: "10px 16px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    flex: 1,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    width: "800px",
    maxWidth: "90%",
    maxHeight: "85vh",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  modalHeader: {
    padding: "24px 30px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
  },
  modalContent: {
    padding: "30px",
    overflowY: "auto",
  },
  jsonPreview: {
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "20px",
    borderRadius: "8px",
    overflowX: "auto",
    fontSize: "14px",
    lineHeight: "1.5",
  }
};
