import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function Attendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");

  // =========================================================
  // LOAD ATTENDANCE + DRIVERS
  // =========================================================

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        attendanceResponse,
        driversResponse,
      ] = await Promise.all([
        api.get("/attendance/"),
        api.get("/drivers/"),
      ]);

      console.log(
        "Attendance:",
        attendanceResponse.data
      );

      console.log(
        "Drivers:",
        driversResponse.data
      );

      setAttendance(
        Array.isArray(attendanceResponse.data)
          ? attendanceResponse.data
          : []
      );

      setDrivers(
        Array.isArray(driversResponse.data)
          ? driversResponse.data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load attendance data:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to load attendance data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // DRIVER DISPLAY NAME
  // =========================================================

  const getDriverName = (driverId) => {
    if (!driverId) {
      return "Not assigned";
    }

    const driver = drivers.find(
      (item) =>
        String(item.driver_id) ===
        String(driverId)
    );

    if (!driver) {
      return String(driverId);
    }

    if (
      driver.user &&
      driver.user.full_name
    ) {
      return driver.user.full_name;
    }

    if (driver.full_name) {
      return driver.full_name;
    }

    if (driver.name) {
      return driver.name;
    }

    if (driver.driver_name) {
      return driver.driver_name;
    }

    return String(driver.driver_id);
  };

  // =========================================================
  // OPEN FORM
  // =========================================================

  const openForm = () => {
    setSelectedDriver("");
    setShowForm(true);
  };

  // =========================================================
  // CLOSE FORM
  // =========================================================

  const closeForm = () => {
    if (saving) {
      return;
    }

    setSelectedDriver("");
    setShowForm(false);
  };

  // =========================================================
  // CREATE ATTENDANCE
  // =========================================================

  const createAttendance = async (event) => {
    event.preventDefault();

    if (!selectedDriver) {
      alert("Please select a driver.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/attendance/clock-in", {
        driver_id: selectedDriver,
      });

      alert(
        "Attendance record created successfully."
      );

      closeForm();

      await loadData();
    } catch (error) {
      console.error(
        "Attendance creation failed:",
        error
      );

      const detail =
        error.response?.data?.detail;

      if (Array.isArray(detail)) {
        alert(
          detail
            .map(
              (item) =>
                item.msg || String(item)
            )
            .join("\n")
        );
      } else {
        alert(
          detail ||
            "Unable to create attendance record."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE ATTENDANCE
  // =========================================================

  const deleteAttendance = async (
    attendanceId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this attendance record?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/attendance/${attendanceId}`
      );

      await loadData();
    } catch (error) {
      console.error(
        "Attendance deletion failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to delete attendance record."
      );
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div style={styles.app}>
      <Sidebar />

      <div style={styles.content}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Attendance
            </h1>

            <p style={styles.subtitle}>
              Manage driver attendance records
            </p>
          </div>

          <div style={styles.headerActions}>

            <button
              style={styles.refreshButton}
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            {(user?.role === "Admin" || user?.role === "FleetManager") && (
              <button
                style={styles.addButton}
                onClick={openForm}
              >
                <Plus size={18} />
                Add Attendance
              </button>
            )}

          </div>
        </header>

        {/* MAIN */}

        <main style={styles.main}>

          {/* TABLE */}

          <section style={styles.tableCard}>

            {loading ? (
              <div style={styles.message}>
                Loading attendance records...
              </div>
            ) : attendance.length === 0 ? (

              <div style={styles.empty}>
                <h3>
                  No attendance records found
                </h3>

                <p>
                  Create your first attendance
                  record to get started.
                </p>

                {(user?.role === "Admin" || user?.role === "FleetManager") && (
                  <button
                    style={styles.addButton}
                    onClick={openForm}
                  >
                    <Plus size={18} />
                    Add Attendance
                  </button>
                )}
              </div>

            ) : (

              <div style={styles.tableWrapper}>

                <table style={styles.table}>

                  <thead>
                    <tr>

                      <th style={styles.th}>
                        Attendance ID
                      </th>

                      <th style={styles.th}>
                        Driver
                      </th>

                      <th style={styles.th}>
                        Driver ID
                      </th>

                      {(user?.role === "Admin" || user?.role === "FleetManager") && (
                        <th
                          style={{
                            ...styles.th,
                            textAlign: "center",
                          }}
                        >
                          Actions
                        </th>
                      )}

                    </tr>
                  </thead>

                  <tbody>

                    {attendance.map(
                      (record) => (

                        <tr
                          key={
                            record.attendance_id
                          }
                        >

                          <td style={styles.td}>
                            <strong>
                              {String(
                                record.attendance_id
                              ).slice(0, 8)}
                              ...
                            </strong>
                          </td>

                          <td style={styles.td}>
                            {getDriverName(
                              record.driver_id
                            )}
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              wordBreak:
                                "break-word",
                            }}
                          >
                            {record.driver_id
                              ? String(
                                  record.driver_id
                                )
                              : "Not assigned"}
                          </td>

                          {(user?.role === "Admin" || user?.role === "FleetManager") && (
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "center",
                              }}
                            >

                              <button
                                style={
                                  styles.deleteButton
                                }
                                onClick={() =>
                                  deleteAttendance(
                                    record.attendance_id
                                  )
                                }
                                title="Delete attendance"
                              >
                                <Trash2
                                  size={17}
                                />
                              </button>

                            </td>
                          )}

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        </main>

        {/* ADD ATTENDANCE MODAL */}

        {showForm && (

          <div style={styles.overlay}>

            <div style={styles.modal}>

              {/* MODAL HEADER */}

              <div
                style={
                  styles.modalHeader
                }
              >

                <div>

                  <h2
                    style={
                      styles.modalTitle
                    }
                  >
                    Add Attendance
                  </h2>

                  <p
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Select the driver for this
                    attendance record.
                  </p>

                </div>

                <button
                  style={
                    styles.closeButton
                  }
                  onClick={closeForm}
                  disabled={saving}
                  title="Close"
                >
                  <X size={22} />
                </button>

              </div>

              {/* FORM */}

              <form
                onSubmit={createAttendance}
              >

                <label
                  style={styles.label}
                >
                  Driver
                </label>

                <select
                  value={selectedDriver}
                  onChange={(event) =>
                    setSelectedDriver(
                      event.target.value
                    )
                  }
                  style={styles.input}
                  disabled={saving}
                  required
                >

                  <option value="">
                    Select Driver
                  </option>

                  {drivers.map(
                    (driver) => (

                      <option
                        key={
                          driver.driver_id
                        }
                        value={
                          driver.driver_id
                        }
                      >
                        {getDriverName(
                          driver.driver_id
                        )}
                      </option>

                    )
                  )}

                </select>

                <p
                  style={
                    styles.helperText
                  }
                >
                  Select an existing driver
                  for this attendance record.
                </p>

                {/* BUTTONS */}

                <div
                  style={
                    styles.modalActions
                  }
                >

                  <button
                    type="button"
                    style={
                      styles.cancelButton
                    }
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={
                      styles.saveButton
                    }
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Attendance"}
                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = {

  app: {
    minHeight: "100vh",
    background: "#f4f7fb",
  },

  content: {
    marginLeft: "250px",
    minHeight: "100vh",
    width: "calc(100% - 250px)",
    boxSizing: "border-box",
  },

  header: {
    padding: "25px 40px",
    background: "white",
    borderBottom:
      "1px solid #e5e7eb",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
    boxSizing: "border-box",
    width: "100%",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    color: "#172554",
  },

  subtitle: {
    marginTop: "7px",
    marginBottom: 0,
    color: "#64748b",
    fontSize: "16px",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexShrink: 0,
  },

  addButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "11px 17px",
    border: "none",
    borderRadius: "7px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    border:
      "1px solid #dbe2ea",
    borderRadius: "7px",
    background: "white",
    color: "#475569",
    cursor: "pointer",
    fontSize: "14px",
  },

  main: {
    padding: "30px 40px",
    boxSizing: "border-box",
    width: "100%",
  },

  tableCard: {
    background: "white",
    borderRadius: "12px",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.06)",
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
  },

  // =======================================================
  // FIXED TABLE OVERFLOW
  // =======================================================

  tableWrapper: {
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
    boxSizing: "border-box",
  },

  table: {
    width: "100%",
    minWidth: "700px",
    borderCollapse: "collapse",
    tableLayout: "auto",
  },

  th: {
    textAlign: "left",
    padding: "15px",
    background: "#f8fafc",
    color: "#172554",
    fontWeight: "600",
    borderBottom:
      "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "15px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
    verticalAlign: "middle",
  },

  message: {
    padding: "50px",
    textAlign: "center",
    color: "#64748b",
  },

  empty: {
    padding: "70px 20px",
    textAlign: "center",
    color: "#64748b",
  },

  deleteButton: {
    width: "34px",
    height: "34px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: "6px",
    background: "#fee2e2",
    color: "#dc2626",
    cursor: "pointer",
  },

  // =======================================================
  // MODAL
  // =======================================================

  overlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
    overflowY: "auto",
    boxSizing: "border-box",
  },

  modal: {
    width: "600px",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: "white",
    borderRadius: "12px",
    padding: "28px",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.2)",
  },

  modalHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    marginBottom: "25px",
    gap: "20px",
  },

  modalTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
  },

  modalSubtitle: {
    marginTop: "7px",
    marginBottom: 0,
    color: "#64748b",
    fontSize: "14px",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "7px",
    outline: "none",
    fontSize: "14px",
    background: "white",
  },

  helperText: {
    marginTop: "7px",
    marginBottom: 0,
    color: "#64748b",
    fontSize: "12px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "30px",
    paddingTop: "20px",
    borderTop:
      "1px solid #e5e7eb",
  },

  cancelButton: {
    padding: "11px 18px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "7px",
    background: "white",
    color: "#334155",
    cursor: "pointer",
  },

  saveButton: {
    padding: "11px 20px",
    border: "none",
    borderRadius: "7px",
    background: "#2563eb",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
  },
};