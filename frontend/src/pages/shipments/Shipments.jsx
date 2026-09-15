import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  RefreshCw,
  Eye,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import api from "../../api/axios";

export default function Shipments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [shipments, setShipments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);

  const [form, setForm] = useState({
    tracking_number: "",
    source: "",
    destination: "",
    customer_name: "",
    shipment_weight: "",
    vehicle_id: "",
    driver_id: "",
    status: "Created",
    expected_delivery: "",
  });

  // =========================================================
  // LOAD SHIPMENTS, VEHICLES AND DRIVERS
  // =========================================================

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        shipmentsResponse,
        vehiclesResponse,
        driversResponse,
      ] = await Promise.all([
        api.get("/shipments/"),
        api.get("/vehicles/"),
        api.get("/drivers/"),
      ]);

      console.log("Shipments:", shipmentsResponse.data);
      console.log("Vehicles:", vehiclesResponse.data);
      console.log("Drivers:", driversResponse.data);

      setShipments(
        Array.isArray(shipmentsResponse.data)
          ? shipmentsResponse.data
          : []
      );

      setVehicles(
        Array.isArray(vehiclesResponse.data)
          ? vehiclesResponse.data
          : []
      );

      setDrivers(
        Array.isArray(driversResponse.data)
          ? driversResponse.data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load shipment data:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to load shipment data."
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
      tracking_number: "",
      source: "",
      destination: "",
      customer_name: "",
      shipment_weight: "",
      vehicle_id: "",
      driver_id: "",
      status: "Created",
      expected_delivery: "",
    });
  };

  // =========================================================
  // ADD SHIPMENT
  // =========================================================

  const openAddForm = () => {
    setEditingShipment(null);
    resetForm();
    setShowForm(true);
  };

  // =========================================================
  // EDIT SHIPMENT
  // =========================================================

  const openEditForm = (shipment) => {
    setEditingShipment(shipment);

    setForm({
      tracking_number:
        shipment.tracking_number || "",

      source:
        shipment.source || "",

      destination:
        shipment.destination || "",

      customer_name:
        shipment.customer_name || "",

      shipment_weight:
        shipment.shipment_weight ?? "",

      vehicle_id:
        shipment.vehicle_id || "",

      driver_id:
        shipment.driver_id || "",

      status:
        shipment.status || "Created",
      expected_delivery: 
        shipment.expected_delivery || "",
    });

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
    setEditingShipment(null);
    resetForm();
  };

  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // SUBMIT SHIPMENT
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.tracking_number.trim()) {
      alert("Please enter a tracking number.");
      return;
    }

    if (!form.source.trim()) {
      alert("Please enter the source.");
      return;
    }

    if (!form.destination.trim()) {
      alert("Please enter the destination.");
      return;
    }

    if (!form.customer_name.trim()) {
      alert("Please enter the customer name.");
      return;
    }

    if (
      form.shipment_weight === "" ||
      Number(form.shipment_weight) < 0
    ) {
      alert("Please enter a valid shipment weight.");
      return;
    }

    setSaving(true);

    try {
      const data = {
        tracking_number:
          form.tracking_number.trim(),

        source:
          form.source.trim(),

        destination:
          form.destination.trim(),

        customer_name:
          form.customer_name.trim(),

        shipment_weight:
          Number(form.shipment_weight),

        vehicle_id:
          form.vehicle_id || null,

        driver_id:
          form.driver_id || null,

        status:
          form.status || "Created",
        expected_delivery:
          form.expected_delivery || null,
      };

      console.log(
        editingShipment
          ? "Updating shipment:"
          : "Creating shipment:",
        data
      );

      if (editingShipment) {
        await api.put(
          `/shipments/${editingShipment.shipment_id}`,
          data
        );
      } else {
        await api.post(
          "/shipments/",
          data
        );
      }

      alert(
        editingShipment
          ? "Shipment updated successfully."
          : "Shipment created successfully."
      );

      closeForm();

      await loadData();
    } catch (error) {
      console.error(
        "Shipment save failed:",
        error
      );

      console.error(
        "Backend response:",
        error.response?.data
      );

      const detail =
        error.response?.data?.detail;

      let message =
        "Unable to save shipment.";

      if (Array.isArray(detail)) {
        message = detail
          .map(
            (item) =>
              item.msg ||
              "Invalid value"
          )
          .join("\n");
      } else if (detail) {
        message = detail;
      }

      alert(message);
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE SHIPMENT
  // =========================================================

  const deleteShipment = async (
    shipmentId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this shipment?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/shipments/${shipmentId}`
      );

      alert(
        "Shipment deleted successfully."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Shipment deletion failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to delete shipment."
      );
    }
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredShipments =
    shipments.filter((shipment) => {
      const query =
        search.toLowerCase().trim();

      if (!query) {
        return true;
      }

      return (
        shipment.shipment_id
          ?.toLowerCase()
          .includes(query) ||

        shipment.tracking_number
          ?.toLowerCase()
          .includes(query) ||

        shipment.source
          ?.toLowerCase()
          .includes(query) ||

        shipment.destination
          ?.toLowerCase()
          .includes(query) ||

        shipment.customer_name
          ?.toLowerCase()
          .includes(query) ||

        shipment.vehicle_id
          ?.toLowerCase()
          .includes(query) ||

        shipment.driver_id
          ?.toLowerCase()
          .includes(query)
      );
    });

  // =========================================================
  // GET VEHICLE DISPLAY NAME
  // =========================================================

  const getVehicleName = (
    vehicleId
  ) => {
    if (!vehicleId) {
      return "Not assigned";
    }

    const vehicle =
      vehicles.find(
        (item) =>
          item.vehicle_id ===
          vehicleId
      );

    if (!vehicle) {
      return vehicleId;
    }

    return (
      vehicle.registration_number ||
      vehicle.vehicle_number ||
      vehicle.vehicle_id
    );
  };

  // =========================================================
  // GET DRIVER DISPLAY NAME
  // =========================================================

  const getDriverName = (
    driverId
  ) => {
    if (!driverId) {
      return "Not assigned";
    }

    const driver =
      drivers.find(
        (item) =>
          item.driver_id ===
          driverId
      );

    if (!driver) {
      return driverId;
    }

    return (
      driver.user?.full_name ||
      driver.full_name ||
      driver.driver_id
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div style={styles.app}>
      <Sidebar />

      <div style={styles.content}>

        {/* =================================================
            HEADER
        ================================================= */}

        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Shipments
            </h1>

            <p style={styles.subtitle}>
              Manage vehicle and driver
              assignments
            </p>
          </div>

          <div
            style={
              styles.headerActions
            }
          >
            <button
              style={
                styles.refreshButton
              }
              onClick={loadData}
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw
                size={18}
              />

              Refresh
            </button>

            <button
              style={styles.addButton}
              onClick={openAddForm}
            >
              <Plus size={18} />

              Add Shipment
            </button>
          </div>
        </header>

        {/* =================================================
            MAIN
        ================================================= */}

        <main style={styles.main}>

          {/* SEARCH */}

          <div
            style={styles.toolbar}
          >
            <div
              style={styles.searchBox}
            >
              <Search
                size={19}
                color="#64748b"
              />

              <input
                type="text"
                placeholder="Search shipments..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                style={
                  styles.searchInput
                }
              />
            </div>

            <div
              style={styles.count}
            >
              {filteredShipments.length}{" "}
              shipment
              {filteredShipments.length !==
              1
                ? "s"
                : ""}
            </div>
          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <section
            style={
              styles.tableCard
            }
          >
            {loading ? (
              <div
                style={
                  styles.message
                }
              >
                Loading shipments...
              </div>
            ) : filteredShipments.length ===
              0 ? (
              <div
                style={
                  styles.empty
                }
              >
                <h3>
                  No shipments found
                </h3>

                <p>
                  Create your first
                  shipment to get
                  started.
                </p>

                <button
                  style={
                    styles.addButton
                  }
                  onClick={
                    openAddForm
                  }
                >
                  <Plus size={18} />

                  Add Shipment
                </button>
              </div>
            ) : (
              <div
                style={
                  styles.tableWrapper
                }
              >
                <table
                  style={
                    styles.table
                  }
                >
                  <thead>
                    <tr>
                      <th>
                        Shipment ID
                      </th>

                      <th>
                        Tracking Number
                      </th>

                      <th>
                        Customer
                      </th>

                      <th>
                        Route
                      </th>

                      <th>
                        Weight
                      </th>

                      <th>
                        Vehicle
                      </th>

                      <th>
                        Driver
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredShipments.map(
                      (shipment) => (
                        <tr
                          key={
                            shipment.shipment_id
                          }
                        >
                          <td>
                            <strong>
                              {shipment.shipment_id}
                            </strong>
                          </td>

                          <td>
                            {shipment.tracking_number ||
                              "-"}
                          </td>

                          <td>
                            {shipment.customer_name ||
                              "-"}
                          </td>

                          <td>
                            <div>
                              <strong>
                                {shipment.source ||
                                  "-"}
                              </strong>

                              <span
                                style={
                                  styles.routeArrow
                                }
                              >
                                →
                              </span>

                              <strong>
                                {shipment.destination ||
                                  "-"}
                              </strong>
                            </div>
                          </td>

                          <td>
                            {shipment.shipment_weight ??
                              0}
                          </td>

                          <td>
                            {getVehicleName(
                              shipment.vehicle_id
                            )}
                          </td>

                          <td>
                            {getDriverName(
                              shipment.driver_id
                            )}
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.statusBadge,
                                ...(shipment.status ===
                                "Delivered"
                                  ? styles.statusDelivered
                                  : shipment.status ===
                                    "Delayed"
                                  ? styles.statusDelayed
                                  : shipment.status ===
                                    "Cancelled"
                                  ? styles.statusCancelled
                                  : shipment.status ===
                                    "In Transit"
                                  ? styles.statusTransit
                                  : shipment.status ===
                                    "Assigned"
                                  ? styles.statusAssigned
                                  : styles.statusCreated),
                              }}
                            >
                              {shipment.status ||
                                "Created"}
                            </span>
                          </td>

                          <td>
                            <div
                              style={
                                styles.actions
                              }
                            >
                              <button
                                style={styles.actionButton}
                                onClick={() =>
                                  navigate(`/shipments/${shipment.shipment_id}`)
                                }
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                style={
                                  styles.editButton
                                }
                                onClick={() =>
                                  openEditForm(
                                    shipment
                                  )
                                }
                                title="Edit shipment"
                              >
                                <Pencil
                                  size={17}
                                />
                              </button>

                              {user?.role === "Admin" && (
                                <button
                                  style={
                                    styles.deleteButton
                                  }
                                  onClick={() =>
                                    deleteShipment(
                                      shipment.shipment_id
                                    )
                                  }
                                  title="Delete shipment"
                                >
                                  <Trash2
                                    size={17}
                                  />
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

        {/* =================================================
            ADD / EDIT MODAL
        ================================================= */}

        {showForm && (
          <div
            style={
              styles.overlay
            }
          >
            <div
              style={
                styles.modal
              }
            >

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
                    {editingShipment
                      ? "Edit Shipment"
                      : "Add Shipment"}
                  </h2>

                  <p
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editingShipment
                      ? "Update shipment information."
                      : "Enter the shipment information below."}
                  </p>
                </div>

                <button
                  style={
                    styles.closeButton
                  }
                  onClick={
                    closeForm
                  }
                  disabled={saving}
                >
                  <X size={22} />
                </button>
              </div>

              {/* FORM */}

              <form
                onSubmit={
                  handleSubmit
                }
              >

                {/* TRACKING NUMBER */}

                <label
                  style={
                    styles.label
                  }
                >
                  Tracking Number
                </label>

                <input
                  type="text"
                  name="tracking_number"
                  value={
                    form.tracking_number
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter tracking number"
                  style={
                    styles.input
                  }
                  disabled={saving}
                  required
                />

                {/* SOURCE */}

                <label
                  style={
                    styles.label
                  }
                >
                  Source
                </label>

                <input
                  type="text"
                  name="source"
                  value={
                    form.source
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter source location"
                  style={
                    styles.input
                  }
                  disabled={saving}
                  required
                />

                {/* DESTINATION */}

                <label
                  style={
                    styles.label
                  }
                >
                  Destination
                </label>

                <input
                  type="text"
                  name="destination"
                  value={
                    form.destination
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter destination"
                  style={
                    styles.input
                  }
                  disabled={saving}
                  required
                />

                {/* CUSTOMER */}

                <label
                  style={
                    styles.label
                  }
                >
                  Customer Name
                </label>

                <input
                  type="text"
                  name="customer_name"
                  value={
                    form.customer_name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter customer name"
                  style={
                    styles.input
                  }
                  disabled={saving}
                  required
                />

                {/* WEIGHT */}

                <label
                  style={
                    styles.label
                  }
                >
                  Shipment Weight
                </label>

                <input
                  type="number"
                  name="shipment_weight"
                  value={
                    form.shipment_weight
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter weight"
                  min="0"
                  step="0.01"
                  style={
                    styles.input
                  }
                  disabled={saving}
                  required
                />

                {/* VEHICLE */}

                <label
                  style={
                    styles.label
                  }
                >
                  Vehicle
                </label>

                <select
                  name="vehicle_id"
                  value={
                    form.vehicle_id
                  }
                  onChange={
                    handleChange
                  }
                  style={
                    styles.input
                  }
                  disabled={saving}
                >
                  <option value="">
                    No vehicle
                  </option>

                  {vehicles.map(
                    (vehicle) => (
                      <option
                        key={
                          vehicle.vehicle_id
                        }
                        value={
                          vehicle.vehicle_id
                        }
                      >
                        {vehicle.registration_number ||
                          vehicle.vehicle_number ||
                          vehicle.vehicle_id}
                      </option>
                    )
                  )}
                </select>

                {/* DRIVER */}

                <label
                  style={
                    styles.label
                  }
                >
                  Driver
                </label>

                <select
                  name="driver_id"
                  value={
                    form.driver_id
                  }
                  onChange={
                    handleChange
                  }
                  style={
                    styles.input
                  }
                  disabled={saving}
                >
                  <option value="">
                    No driver
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

                {/* STATUS */}

                <label
                  style={
                    styles.label
                  }
                >
                  Status
                </label>

                <select
                  name="status"
                  value={
                    form.status
                  }
                  onChange={
                    handleChange
                  }
                  style={
                    styles.input
                  }
                  disabled={saving}
                >
                  <option value="Created">
                    Created
                  </option>

                  <option value="Assigned">
                    Assigned
                  </option>

                  <option value="In Transit">
                    In Transit
                  </option>

                  <option value="Delayed">
                    Delayed
                  </option>

                  <option value="Delivered">
                    Delivered
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>

                {/* EXPECTED DELIVERY */}
                
                <label style={styles.label}>
                  Expected Delivery
                </label>
                <input
                  type="datetime-local"
                  name="expected_delivery"
                  value={form.expected_delivery || ""}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={saving}
                />

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
                    onClick={
                      closeForm
                    }
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
                      : editingShipment
                      ? "Update Shipment"
                      : "Create Shipment"}
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
    color: "#64748b",
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
    gap: "7px",
    padding: "10px 14px",
    border: "1px solid #dbe2ea",
    borderRadius: "7px",
    background: "white",
    color: "#475569",
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
    borderCollapse:
      "collapse",
    minWidth: "1400px",
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

  routeArrow: {
    margin:
      "0 7px",
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

  statusBadge: {
    display: "inline-block",
    padding:
      "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace:
      "nowrap",
  },

  statusCreated: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusAssigned: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },

  statusTransit: {
    background: "#fef3c7",
    color: "#92400e",
  },

  statusDelayed: {
    background: "#ffedd5",
    color: "#c2410c",
  },

  statusDelivered: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusCancelled: {
    background: "#fee2e2",
    color: "#991b1b",
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
    overflowY: "auto",
  },

  modal: {
    width: "600px",
    maxWidth: "100%",
    maxHeight:
      "calc(100vh - 40px)",
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
    alignItems:
      "flex-start",
    marginBottom: "25px",
  },

  modalTitle: {
    margin: 0,
    color: "#172554",
  },

  modalSubtitle: {
    marginTop: "7px",
    color: "#64748b",
  },

  closeButton: {
    border: "none",
    background:
      "transparent",
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
    boxSizing:
      "border-box",
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
    padding:
      "11px 18px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "7px",
    background: "white",
    cursor: "pointer",
  },

  saveButton: {
    padding:
      "11px 20px",
    border: "none",
    borderRadius: "7px",
    background: "#2563eb",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
  },
};