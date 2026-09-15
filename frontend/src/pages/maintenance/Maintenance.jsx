import { useEffect, useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import api from "../../api/axios";

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [form, setForm] = useState({
    vehicle_id: "",
    maintenance_type: "General Inspection",
    service_date: "",
    next_service_date: "",
    cost: 0,
    remarks: "",
    status: "Scheduled"
  });

  const [error, setError] = useState("");

  // =========================================================
  // LOAD MAINTENANCE DATA
  // =========================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        maintenanceResponse,
        vehiclesResponse,
      ] = await Promise.all([
        api.get("/maintenance/"),
        api.get("/vehicles/"),
      ]);

      console.log(
        "Maintenance:",
        maintenanceResponse.data
      );

      console.log(
        "Vehicles:",
        vehiclesResponse.data
      );

      setRecords(
        Array.isArray(maintenanceResponse.data)
          ? maintenanceResponse.data
          : []
      );

      setVehicles(
        Array.isArray(vehiclesResponse.data)
          ? vehiclesResponse.data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load maintenance data:",
        error
      );

      setError(
        error.response?.data?.detail ||
          "Unable to load maintenance data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setForm({
      vehicle_id: "",
      maintenance_type: "General Inspection",
      service_date: "",
      next_service_date: "",
      cost: 0,
      remarks: "",
      status: "Scheduled"
    });
    setEditingRecord(null);
  };

  // =========================================================
  // OPEN ADD FORM
  // =========================================================

  const openAddForm = () => {
    resetForm();
    setError("");
    setShowForm(true);
  };

  // =========================================================
  // OPEN EDIT FORM
  // =========================================================

  const openEditForm = (record) => {
    setEditingRecord(record);
    setForm({
      vehicle_id: record.vehicle_id || "",
      maintenance_type: record.maintenance_type || "General Inspection",
      service_date: record.service_date ? record.service_date.substring(0,10) : "",
      next_service_date: record.next_service_date ? record.next_service_date.substring(0,10) : "",
      cost: record.cost || 0,
      remarks: record.remarks || "",
      status: record.status || "Scheduled"
    });
    setError("");
    setShowForm(true);
  };

  // =========================================================
  // CLOSE FORM
  // =========================================================

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    resetForm();
    setError("");
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const data = {
        ...form,
        vehicle_id: form.vehicle_id || null,
        cost: parseFloat(form.cost) || 0
      };

      console.log(
        editingRecord
          ? "Updating maintenance:"
          : "Creating maintenance:",
        data
      );

      if (editingRecord) {
        await api.put(
          `/maintenance/${editingRecord.maintenance_id}`,
          data
        );
      } else {
        await api.post(
          "/maintenance/",
          data
        );
      }

      setShowForm(false);
      resetForm();

      await loadData();
    } catch (error) {
      console.error(
        "Maintenance save failed:",
        error
      );

      const detail =
        error.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map(
              (item) =>
                item.msg || String(item)
            )
            .join("\n")
        );
      } else {
        setError(
          detail ||
            "Unable to save maintenance record."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const deleteRecord = async (maintenanceId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this maintenance record?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/maintenance/${maintenanceId}`
      );

      await loadData();
    } catch (error) {
      console.error(
        "Maintenance deletion failed:",
        error
      );

      setError(
        error.response?.data?.detail ||
          "Unable to delete maintenance record."
      );
    }
  };

  // =========================================================
  // VEHICLE DISPLAY NAME
  // =========================================================

  const getVehicleName = (vehicleId) => {
    if (!vehicleId) {
      return "Not assigned";
    }

    const vehicle = vehicles.find(
      (item) =>
        String(item.vehicle_id) ===
        String(vehicleId)
    );

    if (!vehicle) {
      return String(vehicleId);
    }

    return (
      vehicle.registration_number ||
      vehicle.license_plate ||
      vehicle.vehicle_number ||
      vehicle.vehicle_name ||
      vehicle.vehicle_id
    );
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredRecords = records.filter(
    (record) => {
      const query =
        search.toLowerCase().trim();

      const vehicleName =
        getVehicleName(
          record.vehicle_id
        ).toLowerCase();

      const maintenanceId =
        String(
          record.maintenance_id || ""
        ).toLowerCase();

      return (
        maintenanceId.includes(query) ||
        vehicleName.includes(query)
      );
    }
  );

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
              Maintenance
            </h1>

            <p style={styles.subtitle}>
              Manage vehicle maintenance records
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

            <button
              style={styles.addButton}
              onClick={openAddForm}
            >
              <Plus size={18} />
              Add Maintenance
            </button>
          </div>
        </header>

        {/* MAIN */}

        <main style={styles.main}>
          {/* ERROR */}

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {/* TOOLBAR */}

          <div style={styles.toolbar}>
            <div style={styles.searchBox}>
              <Search
                size={19}
                color="#64748b"
              />

              <input
                type="text"
                placeholder="Search maintenance..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                style={styles.searchInput}
              />
            </div>

            <div style={styles.count}>
              {filteredRecords.length} record
              {filteredRecords.length !== 1
                ? "s"
                : ""}
            </div>
          </div>

          {/* TABLE */}

          <section style={styles.tableCard}>
            {loading ? (
              <div style={styles.message}>
                Loading maintenance records...
              </div>
            ) : filteredRecords.length ===
              0 ? (
              <div style={styles.empty}>
                <h3>
                  No maintenance records found
                </h3>

                <p>
                  Add a maintenance record
                  to get started.
                </p>

                <button
                  style={styles.addButton}
                  onClick={openAddForm}
                >
                  <Plus size={18} />
                  Add Maintenance
                </button>
              </div>
            ) : (
              <div
                style={styles.tableWrapper}
              >
                <table
                  style={styles.table}
                >
                  <thead>
                    <tr>
                      <th>Maintenance ID</th>
                      <th>Vehicle</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Next Service</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecords.map(
                      (record) => (
                        <tr
                          key={
                            record.maintenance_id
                          }
                        >
                          <td>
                            <strong>
                              {String(
                                record.maintenance_id
                              ).slice(
                                0,
                                8
                              )}
                              ...
                            </strong>
                          </td>

                          <td>
                            {getVehicleName(
                              record.vehicle_id
                            )}
                          </td>
                          <td>
                            {record.maintenance_type || "N/A"}
                          </td>
                          <td>
                            <span style={{
                              padding: "4px 8px", 
                              borderRadius: "12px", 
                              fontSize: "12px",
                              backgroundColor: record.status === "Completed" ? "#dcfce7" : "#fef9c3",
                              color: record.status === "Completed" ? "#166534" : "#854d0e"
                            }}>
                              {record.status}
                            </span>
                          </td>
                          <td>
                            {record.next_service_date ? new Date(record.next_service_date).toLocaleDateString() : "Not Set"}
                          </td>

                          <td>
                            <div
                              style={
                                styles.actions
                              }
                            >
                              <button
                                style={
                                  styles.editButton
                                }
                                onClick={() =>
                                  openEditForm(
                                    record
                                  )
                                }
                                title="Edit maintenance"
                              >
                                <Pencil
                                  size={17}
                                />
                              </button>

                              <button
                                style={
                                  styles.deleteButton
                                }
                                onClick={() =>
                                  deleteRecord(
                                    record.maintenance_id
                                  )
                                }
                                title="Delete maintenance"
                              >
                                <Trash2
                                  size={17}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        {/* ADD / EDIT MODAL */}

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
                    {editingRecord
                      ? "Edit Maintenance"
                      : "Add Maintenance"}
                  </h2>

                  <p
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Assign a vehicle to this
                    maintenance record.
                  </p>
                </div>

                <button
                  style={
                    styles.closeButton
                  }
                  onClick={closeForm}
                  disabled={saving}
                >
                  <X size={22} />
                </button>
              </div>

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
              >
                <label
                  style={styles.label}
                >
                  Vehicle
                </label>

                <select
                  value={form.vehicle_id}
                  onChange={(event) => setForm({...form, vehicle_id: event.target.value})}
                  style={styles.input}
                  disabled={saving}
                  required
                >
                  <option value="">
                    Select a vehicle
                  </option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                      {vehicle.registration_number || vehicle.vehicle_id}
                    </option>
                  ))}
                </select>

                <label style={styles.label}>Maintenance Type</label>
                <select 
                  value={form.maintenance_type}
                  onChange={(e) => setForm({...form, maintenance_type: e.target.value})}
                  style={styles.input}
                  disabled={saving}
                >
                  <option value="General Inspection">General Inspection</option>
                  <option value="Oil Change">Oil Change</option>
                  <option value="Tire Replacement">Tire Replacement</option>
                  <option value="Engine Service">Engine Service</option>
                  <option value="Brake Service">Brake Service</option>
                </select>

                <label style={styles.label}>Service Date</label>
                <input 
                  type="date"
                  value={form.service_date}
                  onChange={(e) => setForm({...form, service_date: e.target.value})}
                  style={styles.input}
                  disabled={saving}
                />

                <label style={styles.label}>Next Service Date</label>
                <input 
                  type="date"
                  value={form.next_service_date}
                  onChange={(e) => setForm({...form, next_service_date: e.target.value})}
                  style={styles.input}
                  disabled={saving}
                />

                <label style={styles.label}>Cost ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({...form, cost: e.target.value})}
                  style={styles.input}
                  disabled={saving}
                />

                <label style={styles.label}>Remarks</label>
                <textarea 
                  value={form.remarks}
                  onChange={(e) => setForm({...form, remarks: e.target.value})}
                  style={{...styles.input, minHeight: '80px'}}
                  disabled={saving}
                />

                {editingRecord && (
                  <>
                    <label style={styles.label}>Status</label>
                    <select 
                      value={form.status}
                      onChange={(e) => setForm({...form, status: e.target.value})}
                      style={styles.input}
                      disabled={saving}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </>
                )}

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
                      : editingRecord
                      ? "Update Maintenance"
                      : "Create Maintenance"}
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
  },

  error: {
    marginBottom: "20px",
    padding: "14px 16px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
    fontSize: "14px",
    whiteSpace: "pre-line",
  },

  toolbar: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  searchBox: {
    width: "370px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 13px",
    background: "white",
    border:
      "1px solid #dbe2ea",
    borderRadius: "8px",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: "14px",
  },

  count: {
    color: "#64748b",
    fontSize: "14px",
  },

  tableCard: {
    background: "white",
    borderRadius: "12px",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse:
      "collapse",
    minWidth: "700px",
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

  actions: {
    display: "flex",
    gap: "7px",
  },

  editButton: {
    width: "34px",
    height: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    border: "none",
    borderRadius: "6px",
    background: "#dbeafe",
    color: "#1d4ed8",
    cursor: "pointer",
  },

  deleteButton: {
    width: "34px",
    height: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    border: "none",
    borderRadius: "6px",
    background: "#fee2e2",
    color: "#dc2626",
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    width: "550px",
    maxWidth: "100%",
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
    alignItems:
      "flex-start",
    marginBottom: "25px",
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
  },

  label: {
    display: "block",
    marginBottom: "7px",
    marginTop: "18px",
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

  modalActions: {
    display: "flex",
    justifyContent:
      "flex-end",
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