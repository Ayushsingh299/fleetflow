import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, RefreshCw } from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import api from "../../api/axios";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  const [form, setForm] = useState({
    user_id: "",
  });

  // =========================
  // LOAD DRIVERS
  // =========================

  const loadDrivers = async () => {
    setLoading(true);

    try {
      const response = await api.get("/drivers/");

      console.log("Drivers:", response.data);

      setDrivers(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error("Failed to load drivers:", error);

      alert(
        error.response?.data?.detail ||
          "Unable to load drivers."
      );

      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD USERS
  // =========================

  const loadUsers = async () => {
    setLoadingUsers(true);

    try {
      const response = await api.get("/users/");

      console.log("Users:", response.data);

      const userList = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.users)
        ? response.data.users
        : [];

      setUsers(userList);
    } catch (error) {
      console.error("Failed to load users:", error);

      alert(
        error.response?.data?.detail ||
          "Unable to load users."
      );

      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    loadUsers();
  }, []);

  // Users already registered as drivers
  const assignedUserIds = new Set(
    drivers
      .map(
        (driver) =>
          driver.user_id ||
          driver.user?.user_id ||
          driver.user?.id
      )
      .filter(Boolean)
      .map(String)
  );

  // Only show users who are not already drivers.
  // Keep the current user visible while editing.
  const availableUsers = users
    .map((user) => ({
      ...user,
      user_id: user.user_id || user.id,
      full_name:
        user.full_name ||
        user.name ||
        "Unnamed User",
      email: user.email || "No email",
    }))
    .filter((user) => {
      if (!user.user_id) return false;

      const currentUserId =
        editingDriver?.user_id ||
        editingDriver?.user?.user_id ||
        editingDriver?.user?.id;

      if (
        editingDriver &&
        String(user.user_id) === String(currentUserId)
      ) {
        return true;
      }

      return !assignedUserIds.has(String(user.user_id));
    });

  // =========================
  // RESET
  // =========================

  const resetForm = () => {
    setForm({
      user_id: "",
    });
  };

  // =========================
  // ADD
  // =========================

  const openAddForm = () => {
    setEditingDriver(null);
    resetForm();
    setShowForm(true);
    loadUsers();
    loadDrivers();
  };

  // =========================
  // EDIT
  // =========================

  const openEditForm = (driver) => {
    setEditingDriver(driver);

    setForm({
      user_id:
        driver.user_id ||
        driver.user?.user_id ||
        driver.user?.id ||
        "",
    });

    setShowForm(true);
    loadUsers();
    loadDrivers();
  };

  // =========================
  // CLOSE
  // =========================

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingDriver(null);
    resetForm();
  };

  // =========================
  // CHANGE
  // =========================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================
  // SAVE
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.user_id.trim()) {
      alert("Please select a user.");
      return;
    }

    setSaving(true);

    try {
      const data = {
        user_id: form.user_id.trim(),
      };

      console.log(
        editingDriver
          ? "Updating driver:"
          : "Creating driver:",
        data
      );

      if (editingDriver) {
        await api.put(
          `/drivers/${editingDriver.driver_id}`,
          data
        );
      } else {
        await api.post(
          "/drivers/",
          data
        );
      }

      alert(
        editingDriver
          ? "Driver updated successfully."
          : "Driver created successfully."
      );

      setShowForm(false);
      setEditingDriver(null);
      resetForm();

      await loadDrivers();
    } catch (error) {
      console.error(
        "Driver save failed:",
        error
      );

      const detail =
        error.response?.data?.detail;

      if (Array.isArray(detail)) {
        alert(
          detail
            .map((item) => item.msg)
            .join("\n")
        );
      } else {
        alert(
          detail ||
            "Unable to save driver."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DELETE
  // =========================

  const deleteDriver = async (driverId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this driver?"
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/drivers/${driverId}`
      );

      alert(
        "Driver deleted successfully."
      );

      await loadDrivers();
    } catch (error) {
      console.error(
        "Driver deletion failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to delete driver."
      );
    }
  };

  // =========================
  // SEARCH
  // =========================

  const query =
    search.trim().toLowerCase();

  const filteredDrivers =
    drivers.filter((driver) => {
      if (!query) return true;

      return (
        String(driver.driver_id || "")
          .toLowerCase()
          .includes(query) ||
        String(driver.user_id || "")
          .toLowerCase()
          .includes(query) ||
        String(driver.full_name || "")
          .toLowerCase()
          .includes(query) ||
        String(driver.name || "")
          .toLowerCase()
          .includes(query) ||
        String(driver.user?.full_name || "")
          .toLowerCase()
          .includes(query) ||
        String(driver.user?.email || "")
          .toLowerCase()
          .includes(query)
      );
    });

  // =========================
  // DRIVER DISPLAY
  // =========================

  const getDriverName = (driver) => {
    return (
      driver.full_name ||
      driver.name ||
      driver.email ||
      "Not assigned"
    );
  };

  return (
    <div style={styles.app}>
      <Sidebar />

      <div style={styles.content}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Drivers
            </h1>

            <p style={styles.subtitle}>
              Manage fleet drivers
            </p>
          </div>

          <div style={styles.headerActions}>

            <button
              style={styles.refreshButton}
              onClick={loadDrivers}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            <button
              style={styles.addButton}
              onClick={openAddForm}
            >
              <Plus size={18} />
              Add Driver
            </button>

          </div>
        </header>

        {/* MAIN */}

        <main style={styles.main}>

          {/* TOOLBAR */}

          <div style={styles.toolbar}>

            <div style={styles.searchBox}>
              <Search
                size={19}
                color="#64748b"
              />

              <input
                type="text"
                placeholder="Search drivers..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                style={styles.searchInput}
              />
            </div>

            <div style={styles.count}>
              {filteredDrivers.length}{" "}
              driver
              {filteredDrivers.length !== 1
                ? "s"
                : ""}
            </div>

          </div>

          {/* TABLE */}

          <section style={styles.tableCard}>

            {loading ? (
              <div style={styles.message}>
                Loading drivers...
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div style={styles.empty}>

                <h3>
                  No drivers found
                </h3>

                <p>
                  Create your first driver
                  to get started.
                </p>

                <button
                  style={styles.addButton}
                  onClick={openAddForm}
                >
                  <Plus size={18} />
                  Add Driver
                </button>

              </div>
            ) : (
              <div style={styles.tableWrapper}>

                <table style={styles.table}>

                  <thead>
                    <tr>
                      <th>Driver ID</th>
                      <th>User ID</th>
                      <th>Driver</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredDrivers.map(
                      (driver) => (
                        <tr
                          key={driver.driver_id}
                        >

                          <td>
                            <strong>
                              {driver.driver_id}
                            </strong>
                          </td>

                          <td>
                            {driver.user_id ||
                              "Not assigned"}
                          </td>

                          <td>
                            {getDriverName(
                              driver
                            )}
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
                                    driver
                                  )
                                }
                                title="Edit driver"
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
                                  deleteDriver(
                                    driver.driver_id
                                  )
                                }
                                title="Delete driver"
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

        {/* ADD / EDIT DRIVER */}

        {showForm && (
          <div style={styles.overlay}>

            <div style={styles.modal}>

              <div style={styles.modalHeader}>

                <div>
                  <h2 style={styles.modalTitle}>
                    {editingDriver
                      ? "Edit Driver"
                      : "Add Driver"}
                  </h2>

                  <p
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editingDriver
                      ? "Update driver information."
                      : "Create a new driver."}
                  </p>
                </div>

                <button
                  type="button"
                  style={styles.closeButton}
                  onClick={closeForm}
                  disabled={saving}
                >
                  <X size={22} />
                </button>

              </div>

              <form
                onSubmit={handleSubmit}
              >

                <label style={styles.label}>
                  User
                </label>

                <select
                  name="user_id"
                  value={form.user_id}
                  onChange={handleChange}
                  style={styles.input}
                  required
                  disabled={saving || loadingUsers}
                >
                  <option value="" disabled>
                    {availableUsers.length === 0
                      ? "No available users - Go to User Management to create one"
                      : "Select a user..."}
                  </option>

                  {availableUsers.map((item) => (
                    <option
                      key={item.user_id}
                      value={item.user_id}
                    >
                      {item.full_name} ({item.email})
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                        You must create a User (in User Management) before you can add them as a driver.
                    </p>
                )}

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
                      : editingDriver
                      ? "Update Driver"
                      : "Create Driver"}
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
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
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
    gap: "8px",
    padding: "11px 17px",
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
    justifyContent: "space-between",
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
    border: "1px solid #dbe2ea",
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
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "850px",
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
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    width: "550px",
    maxWidth: "100%",
    background: "white",
    borderRadius: "12px",
    padding: "28px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "25px",
  },

  modalTitle: {
    margin: 0,
    color: "#172554",
  },

  modalSubtitle: {
    marginTop: "7px",
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
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    outline: "none",
    fontSize: "14px",
    background: "white",
  },

  helpText: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "7px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
  },

  cancelButton: {
    padding: "11px 18px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    background: "white",
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