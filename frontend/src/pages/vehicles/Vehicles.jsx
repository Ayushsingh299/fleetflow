import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import api from "../../api/axios";

export default function Vehicles() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState(null);

  const [form, setForm] = useState({
    registration_number: "",
    vehicle_type: "Truck",
    brand: "",
    model: "",
    manufacture_year: new Date().getFullYear(),
    fuel_type: "Diesel",
    capacity: 0,
    driver_id: null,
    status: "Available",
  });

  const loadVehicles = async () => {
    try {
      setLoading(true);

      console.log("Loading vehicles and drivers...");

      const [vehiclesResult, driversResult] =
        await Promise.allSettled([
          api.get("/vehicles/"),
          api.get("/drivers/"),
        ]);

      if (vehiclesResult.status === "fulfilled") {
        const data = vehiclesResult.value.data;
        console.log("Vehicles API response:", data);

        setVehicles(Array.isArray(data) ? data : []);
      } else {
        console.error(
          "Failed to load vehicles:",
          vehiclesResult.reason
        );

        alert(
          vehiclesResult.reason?.response?.data?.detail ||
            "Failed to load vehicles."
        );

        setVehicles([]);
      }

      if (driversResult.status === "fulfilled") {
        const data = driversResult.value.data;
        console.log("Drivers API response:", data);

        setDrivers(Array.isArray(data) ? data : []);
      } else {
        console.error(
          "Failed to load drivers:",
          driversResult.reason
        );

        setDrivers([]);
      }
    } catch (error) {
      console.error("Vehicle loading error:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to load vehicle data."
      );

      setVehicles([]);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "manufacture_year" || name === "capacity"
          ? Number(value)
          : name === "driver_id"
          ? value || null
          : value,
    }));
  };

  const openAddForm = () => {
    setEditingVehicle(null);

    setForm({
      registration_number: "",
      vehicle_type: "Truck",
      brand: "",
      model: "",
      manufacture_year: new Date().getFullYear(),
      fuel_type: "Diesel",
      capacity: 0,
      driver_id: "",
      status: "Available",
    });

    setShowForm(true);
  };

  const openEditForm = (vehicle) => {
    setEditingVehicle(vehicle);

    setForm({
      registration_number: vehicle.registration_number,
      vehicle_type: vehicle.vehicle_type,
      brand: vehicle.brand,
      model: vehicle.model,
      manufacture_year: vehicle.manufacture_year,
      fuel_type: vehicle.fuel_type,
      capacity: vehicle.capacity,
      driver_id: vehicle.driver_id || "",
      status: vehicle.status,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingVehicle(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingVehicle) {
        await api.put(
          `/vehicles/${editingVehicle.vehicle_id}`,
          form
        );
      } else {
        await api.post("/vehicles/", form);
      }

      closeForm();
      await loadVehicles();
    } catch (error) {
      console.error("Vehicle save failed:", error);

      alert(
        error.response?.data?.detail ||
          "Unable to save vehicle."
      );
    }
  };

  const deleteVehicle = async (vehicleId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this vehicle?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/vehicles/${vehicleId}`);
      await loadVehicles();
    } catch (error) {
      console.error("Vehicle deletion failed:", error);

      alert(
        error.response?.data?.detail ||
          "Unable to delete vehicle."
      );
    }
  };

  // ---------------------------------------
  // OPEN LIVE TRACKING
  // ---------------------------------------

  const trackVehicle = (vehicleId) => {
    navigate(
      `/live-tracking?vehicle_id=${vehicleId}`
    );
  };

  const getDriverName = (driverId) => {
    if (!driverId) return "Not Assigned";

    const driver = drivers.find(
      (item) =>
        String(item.driver_id) === String(driverId)
    );

    if (!driver) return "Not Assigned";

    if (driver.user?.full_name) {
      return driver.user.full_name;
    }

    if (driver.full_name) {
      return driver.full_name;
    }

    if (driver.user?.name) {
      return driver.user.name;
    }

    if (driver.name) {
      return driver.name;
    }

    if (driver.driver_name) {
      return driver.driver_name;
    }

    return String(driverId).slice(0, 8);
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = search.toLowerCase();

    return (
      vehicle.registration_number
        ?.toLowerCase()
        .includes(query) ||
      vehicle.brand?.toLowerCase().includes(query) ||
      vehicle.model?.toLowerCase().includes(query) ||
      vehicle.vehicle_type?.toLowerCase().includes(query) ||
      vehicle.status?.toLowerCase().includes(query) ||
      getDriverName(vehicle.driver_id)
        .toLowerCase()
        .includes(query)
    );
  });

  return (
    <div style={styles.app}>
      <Sidebar />

      <div style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Vehicles</h1>

            <p style={styles.subtitle}>
              Manage your fleet vehicles
            </p>
          </div>

          <button
            style={styles.addButton}
            onClick={openAddForm}
          >
            <Plus size={18} />
            Add Vehicle
          </button>
        </header>

        <main style={styles.main}>
          <div style={styles.toolbar}>
            <div style={styles.searchBox}>
              <Search size={19} color="#64748b" />

              <input
                type="text"
                placeholder="Search vehicles..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                style={styles.searchInput}
              />
            </div>

            <div style={styles.count}>
              {filteredVehicles.length} vehicle
              {filteredVehicles.length !== 1
                ? "s"
                : ""}
            </div>
          </div>

          <section style={styles.tableCard}>
            {loading ? (
              <p style={styles.message}>
                Loading vehicles...
              </p>
            ) : filteredVehicles.length === 0 ? (
              <div style={styles.empty}>
                <h3>No vehicles found</h3>

                <p>
                  Add your first vehicle to get started.
                </p>

                <button
                  style={styles.addButton}
                  onClick={openAddForm}
                >
                  <Plus size={18} />
                  Add Vehicle
                </button>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Registration</th>
                      <th>Type</th>
                      <th>Brand</th>
                      <th>Model</th>
                      <th>Year</th>
                      <th>Fuel</th>
                      <th>Capacity</th>
                      <th>Driver</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredVehicles.map(
                      (vehicle) => (
                        <tr
                          key={
                            vehicle.vehicle_id
                          }
                        >
                          <td>
                            <strong>
                              {
                                vehicle.registration_number
                              }
                            </strong>
                          </td>

                          <td>
                            {vehicle.vehicle_type}
                          </td>

                          <td>{vehicle.brand}</td>

                          <td>{vehicle.model}</td>

                          <td>
                            {
                              vehicle.manufacture_year
                            }
                          </td>

                          <td>
                            {vehicle.fuel_type}
                          </td>

                          <td>
                            {vehicle.capacity}
                          </td>

                          <td>
                            {getDriverName(vehicle.driver_id)}
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.status,
                                ...(vehicle.status ===
                                "Available"
                                  ? styles.available
                                  : styles.maintenance),
                              }}
                            >
                              {vehicle.status}
                            </span>
                          </td>

                          <td>
                            <div
                              style={
                                styles.actions
                              }
                            >
                              {/* LIVE TRACKING */}

                              <button
                                style={
                                  styles.trackButton
                                }
                                onClick={() =>
                                  trackVehicle(
                                    vehicle.vehicle_id
                                  )
                                }
                                title="Live tracking"
                              >
                                Track
                              </button>

                              {/* EDIT */}

                              <button
                                style={
                                  styles.editButton
                                }
                                onClick={() =>
                                  openEditForm(
                                    vehicle
                                  )
                                }
                                title="Edit vehicle"
                              >
                                <Pencil size={17} />
                              </button>

                              {/* DELETE */}
                              {user?.role === "Admin" && (
                                <button
                                  style={
                                    styles.deleteButton
                                  }
                                  onClick={() =>
                                    deleteVehicle(
                                      vehicle.vehicle_id
                                    )
                                  }
                                  title="Delete vehicle"
                                >
                                  <Trash2 size={17} />
                                </button>
                              )}
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

        {/* -------------------------------- */}
        {/* ADD / EDIT VEHICLE MODAL */}
        {/* -------------------------------- */}

        {showForm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div
                style={styles.modalHeader}
              >
                <div>
                  <h2>
                    {editingVehicle
                      ? "Edit Vehicle"
                      : "Add Vehicle"}
                  </h2>

                  <p>
                    Enter vehicle information
                    below.
                  </p>
                </div>

                <button
                  style={
                    styles.closeButton
                  }
                  onClick={closeForm}
                >
                  <X size={22} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
              >
                <div
                  style={
                    styles.formGrid
                  }
                >
                  <FormField
                    label="Registration Number"
                    name="registration_number"
                    value={
                      form.registration_number
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="UP16AB1234"
                    required
                  />

                  <div>
                    <label
                      style={
                        styles.label
                      }
                    >
                      Vehicle Type
                    </label>

                    <select
                      name="vehicle_type"
                      value={
                        form.vehicle_type
                      }
                      onChange={
                        handleChange
                      }
                      style={
                        styles.input
                      }
                    >
                      <option value="Truck">
                        Truck
                      </option>

                      <option value="Van">
                        Van
                      </option>

                      <option value="Car">
                        Car
                      </option>

                      <option value="Bus">
                        Bus
                      </option>
                    </select>
                  </div>

                  <FormField
                    label="Brand"
                    name="brand"
                    value={form.brand}
                    onChange={
                      handleChange
                    }
                    placeholder="Tata"
                    required
                  />

                  <FormField
                    label="Model"
                    name="model"
                    value={form.model}
                    onChange={
                      handleChange
                    }
                    placeholder="Prima"
                    required
                  />

                  <FormField
                    label="Manufacture Year"
                    name="manufacture_year"
                    type="number"
                    value={
                      form.manufacture_year
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                  <div>
                    <label
                      style={
                        styles.label
                      }
                    >
                      Fuel Type
                    </label>

                    <select
                      name="fuel_type"
                      value={
                        form.fuel_type
                      }
                      onChange={
                        handleChange
                      }
                      style={
                        styles.input
                      }
                    >
                      <option value="Diesel">
                        Diesel
                      </option>

                      <option value="Petrol">
                        Petrol
                      </option>

                      <option value="CNG">
                        CNG
                      </option>

                      <option value="Electric">
                        Electric
                      </option>
                    </select>
                  </div>

                  <FormField
                    label="Capacity"
                    name="capacity"
                    type="number"
                    value={form.capacity}
                    onChange={
                      handleChange
                    }
                    placeholder="20"
                    required
                  />

                  <div>
                    <label
                      style={
                        styles.label
                      }
                    >
                      Driver
                    </label>

                    <select
                      name="driver_id"
                      value={form.driver_id || ""}
                      onChange={
                        handleChange
                      }
                      style={
                        styles.input
                      }
                    >
                      <option value="">
                        No Driver
                      </option>

                      {drivers.map((driver) => (
                        <option
                          key={driver.driver_id}
                          value={driver.driver_id}
                        >
                          {getDriverName(
                            driver.driver_id
                          )}
                        </option>
                      ))}
                    </select>

                    <p style={styles.helperText}>
                      Assign an existing driver to this vehicle.
                    </p>
                  </div>

                  <div>
                    <label
                      style={
                        styles.label
                      }
                    >
                      Status
                    </label>

                    <select
                      name="status"
                      value={form.status}
                      onChange={
                        handleChange
                      }
                      style={
                        styles.input
                      }
                    >
                      <option value="Available">
                        Available
                      </option>

                      <option value="Maintenance">
                        Maintenance
                      </option>

                      <option value="Unavailable">
                        Unavailable
                      </option>
                    </select>
                  </div>
                </div>

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
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={
                      styles.saveButton
                    }
                  >
                    {editingVehicle
                      ? "Update Vehicle"
                      : "Create Vehicle"}
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


function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}) {
  return (
    <div>
      <label style={styles.label}>
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={styles.input}
      />
    </div>
  );
}


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
    color: "#64748b",
  },

  addButton: {
    display: "flex",
    alignItems: "center",
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

  main: {
    padding: "30px 40px",
  },

  toolbar: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  searchBox: {
    width: "350px",
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
    borderCollapse: "collapse",
    minWidth: "950px",
  },

  message: {
    padding: "40px",
    textAlign: "center",
    color: "#64748b",
  },

  empty: {
    padding: "70px 20px",
    textAlign: "center",
    color: "#64748b",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155",
  },

  helperText: {
    marginTop: "6px",
    marginBottom: 0,
    color: "#64748b",
    fontSize: "12px",
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

  status: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  available: {
    background: "#dcfce7",
    color: "#166534",
  },

  maintenance: {
    background: "#fef3c7",
    color: "#92400e",
  },

  actions: {
    display: "flex",
    gap: "7px",
  },

  // ---------------------------------------
  // LIVE TRACKING BUTTON
  // ---------------------------------------

  trackButton: {
    height: "34px",
    padding: "0 12px",
    border: "none",
    borderRadius: "6px",
    background: "#16a34a",
    color: "white",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },

  editButton: {
    width: "34px",
    height: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    justifyContent: "center",
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
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    width: "700px",
    maxWidth: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
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
  },

  closeButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#64748b",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "18px",
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