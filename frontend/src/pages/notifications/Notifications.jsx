import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  X,
  Bell,
  CheckCircle,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

export default function Notifications() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    user_id: "",
    message: "",
  });

  // =========================================================
  // LOAD NOTIFICATIONS + USERS
  // =========================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      await fetchNotifications();
      const usersResponse = await api.get("/users/");
      setUsers(
        Array.isArray(usersResponse.data)
          ? usersResponse.data
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load notification data:",
        err
      );
      setError(
        err.response?.data?.detail ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const markAllRead = async () => {
    await markAllAsRead();
  };

  const markRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setForm({
      user_id: "",
      message: "",
    });
  };

  // =========================================================
  // OPEN FORM
  // =========================================================

  const openAddForm = () => {
    resetForm();
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
  };

  // =========================================================
  // GET USER DISPLAY NAME
  // =========================================================

  const getUserName = (userId) => {
    if (!userId) {
      return "Unknown user";
    }

    const user = users.find(
      (item) =>
        String(item.user_id) ===
        String(userId)
    );

    if (!user) {
      return String(userId);
    }

    return (
      user.full_name ||
      user.name ||
      user.username ||
      user.email ||
      String(user.user_id)
    );
  };

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // CREATE NOTIFICATION
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.user_id) {
      alert("Please select a user.");
      return;
    }

    if (!form.message.trim()) {
      alert("Please enter a notification message.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/notifications/", {
        user_id: form.user_id,
        message: form.message.trim(),
      });

      closeForm();

      await loadData();
    } catch (err) {
      console.error(
        "Notification creation failed:",
        err
      );

      const detail =
        err.response?.data?.detail;

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
            "Unable to create notification."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE NOTIFICATION
  // =========================================================

  const deleteNotification = async (
    notificationId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/notifications/${notificationId}`
      );

      await loadData();
    } catch (err) {
      console.error(
        "Notification deletion failed:",
        err
      );

      alert(
        err.response?.data?.detail ||
          "Unable to delete notification."
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
              Notifications
            </h1>

            <p style={styles.subtitle}>
              View and manage fleet notifications
            </p>
          </div>

            <div style={styles.headerActions}>
              <button
                style={{...styles.refreshButton, background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0"}}
                onClick={markAllRead}
                disabled={loading}
                title="Mark all as read"
              >
                <CheckCircle size={18} />
                Mark All Read
              </button>

              <button
                style={styles.refreshButton}
                onClick={loadData}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw size={18} />
                Refresh
              </button>

              {user?.role === "Admin" && (
                <button
                  style={styles.addButton}
                  onClick={openAddForm}
                >
                  <Plus size={18} />
                  Add Notification
                </button>
              )}
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

          {/* TABLE CARD */}

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.cardTitle}>
                  Notification List
                </h2>

                <p style={styles.cardSubtitle}>
                  {notifications.length} notification
                  {notifications.length !== 1
                    ? "s"
                    : ""}
                </p>
              </div>

              <div style={styles.count}>
                {notifications.length}
              </div>
            </div>

            {loading ? (
              <div style={styles.message}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>
                  <Bell size={28} />
                </div>

                <h3>
                  No notifications found
                </h3>

                <p>
                  Create your first notification
                  to get started.
                </p>

                <button
                  style={styles.addButton}
                  onClick={openAddForm}
                >
                  <Plus size={18} />
                  Add Notification
                </button>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Notification ID</th>
                      <th>User</th>
                      <th>Message</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {notifications.map(
                      (notification) => (
                        <tr
                          key={
                            notification.notification_id
                          }
                        >
                          <td style={{ fontWeight: notification.is_read ? "normal" : "bold" }}>
                            {String(
                              notification.notification_id
                            ).slice(0, 8)}...
                          </td>

                          <td style={{ fontWeight: notification.is_read ? "normal" : "bold" }}>
                            {getUserName(
                              notification.user_id
                            )}
                          </td>

                          <td>
                            <div
                              style={
                                styles.messageCell
                              }
                            >
                              <div
                                style={
                                  styles.notificationIcon
                                }
                              >
                                <Bell size={17} />
                              </div>

                              <span>
                                {
                                  notification.message
                                }
                              </span>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {!notification.is_read && (
                                <button
                                  style={{ ...styles.actionButton, background: "#f0fdf4", color: "#166534" }}
                                  onClick={() =>
                                    markRead(
                                      notification.notification_id
                                    )
                                  }
                                  title="Mark as read"
                                >
                                  <CheckCircle size={17} />
                                </button>
                              )}
                              <button
                                style={
                                  styles.deleteButton
                                }
                                onClick={() =>
                                  deleteNotification(
                                    notification.notification_id
                                  )
                                }
                                title="Delete notification"
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

        {/* ADD NOTIFICATION MODAL */}

        {showForm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    Add Notification
                  </h2>

                  <p style={styles.modalSubtitle}>
                    Send a notification to a fleet
                    user.
                  </p>
                </div>

                <button
                  style={styles.closeButton}
                  onClick={closeForm}
                  disabled={saving}
                >
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* USER */}

                <label style={styles.label}>
                  User
                </label>

                <select
                  name="user_id"
                  value={form.user_id}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={saving}
                  required
                >
                  <option value="">
                    Select User
                  </option>

                  {users.map((user) => (
                    <option
                      key={user.user_id}
                      value={user.user_id}
                    >
                      {getUserName(
                        user.user_id
                      )}
                    </option>
                  ))}
                </select>

                {/* MESSAGE */}

                <label style={styles.label}>
                  Message
                </label>

                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Enter notification message..."
                  rows={5}
                  style={styles.textarea}
                  disabled={saving}
                  required
                />

                {/* BUTTONS */}

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={styles.saveButton}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Create Notification"}
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
    marginBottom: 0,
    color: "#64748b",
    fontSize: "16px",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    border: "1px solid #dbe2ea",
    borderRadius: "7px",
    background: "white",
    color: "#475569",
    cursor: "pointer",
    fontSize: "14px",
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

  main: {
    padding: "30px 40px",
  },

  card: {
    background: "white",
    borderRadius: "12px",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },

  cardHeader: {
    padding: "22px 25px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#172554",
  },

  cardSubtitle: {
    marginTop: "5px",
    marginBottom: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  count: {
    minWidth: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "20px",
    padding: "0 10px",
    fontSize: "13px",
    fontWeight: "600",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "850px",
  },

  messageCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  notificationIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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

  emptyIcon: {
    width: "60px",
    height: "60px",
    margin: "0 auto 15px",
    borderRadius: "50%",
    background: "#eff6ff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  actionButton: {
    border: "none",
    background: "transparent",
    padding: "6px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    marginBottom: "20px",
    padding: "15px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
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
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.2)",
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
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    outline: "none",
    fontSize: "14px",
    background: "white",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    outline: "none",
    fontSize: "14px",
    background: "white",
    resize: "vertical",
    fontFamily: "inherit",
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