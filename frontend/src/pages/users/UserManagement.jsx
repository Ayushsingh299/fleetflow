import { useEffect, useState } from "react";
import { Shield, User, Trash2, ChevronDown } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const ROLES = ["Admin", "FleetManager", "Dispatcher", "Driver"];

const ROLE_COLORS = {
  Admin: { bg: "#fef3c7", color: "#92400e" },
  FleetManager: { bg: "#dbeafe", color: "#1d4ed8" },
  Dispatcher: { bg: "#d1fae5", color: "#065f46" },
  Driver: { bg: "#f3e8ff", color: "#6b21a8" },
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "Driver",
  });

  const getErrorMessage = (err, fallback) => {
    const detail = err.response?.data?.detail;
    if (!detail) return fallback;
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg).join(", ");
    }
    if (typeof detail === "object" && detail.msg) {
        return detail.msg;
    }
    return String(detail);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users/");
      setUsers(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pw) => {
    if (!pw) return { msg: "", color: "" };
    if (pw.length < 8) return { msg: "Weak: Must be at least 8 characters", color: "#ef4444" };
    if (!/[A-Z]/.test(pw)) return { msg: "Weak: Must contain an uppercase letter", color: "#ef4444" };
    if (!/[a-z]/.test(pw)) return { msg: "Weak: Must contain a lowercase letter", color: "#ef4444" };
    if (!/\d/.test(pw)) return { msg: "Weak: Must contain a number", color: "#ef4444" };
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return { msg: "Weak: Must contain a special character", color: "#ef4444" };
    return { msg: "Strong", color: "#22c55e" };
  };

  const strength = getPasswordStrength(addForm.password);

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, role: newRole } : u
        )
      );
    } catch (err) {
      alert(getErrorMessage(err, "Failed to update role."));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (err) {
      alert(getErrorMessage(err, "Failed to delete user."));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      const res = await api.post("/auth/signup", addForm);
      setUsers([res.data, ...users]);
      setShowAddForm(false);
      setAddForm({
        full_name: "",
        email: "",
        password: "",
        phone: "",
        role: "Driver",
      });
    } catch (err) {
      let errMsg = "Failed to create user.";
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errMsg = err.response.data.detail.map(d => d.msg).join(", ");
        } else {
          errMsg = err.response.data.detail;
        }
      }
      alert(errMsg);
    } finally {
      setAddingUser(false);
    }
  };

  const roleColor = (role) =>
    ROLE_COLORS[role] || { bg: "#f1f5f9", color: "#334155" };

  return (
    <div style={styles.app}>
      <Sidebar />

      <div style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>User Management</h1>
            <p style={styles.subtitle}>
              Manage all system users and their roles
            </p>
          </div>
          <button
            style={styles.addButton}
            onClick={() => setShowAddForm(true)}
          >
            + Add User
          </button>
        </header>

        <main style={styles.main}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.tableCard}>
            {loading ? (
              <p style={styles.message}>Loading users...</p>
            ) : users.length === 0 ? (
              <p style={styles.message}>No users found.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const rc = roleColor(u.role);
                      const isSelf =
                        u.user_id === currentUser?.user_id;
                      return (
                        <tr key={u.user_id}>
                          <td>
                            <div style={styles.nameCell}>
                              <div style={styles.avatar}>
                                <User size={14} />
                              </div>
                              <strong>{u.full_name}</strong>
                              {isSelf && (
                                <span style={styles.youBadge}>
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={styles.emailCell}>{u.email}</td>
                          <td>{u.phone || "—"}</td>
                          <td>
                            <span
                              style={{
                                ...styles.roleBadge,
                                background: rc.bg,
                                color: rc.color,
                              }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <div style={styles.actions}>
                              {/* Role select */}
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  handleRoleChange(
                                    u.user_id,
                                    e.target.value
                                  )
                                }
                                disabled={
                                  isSelf ||
                                  updatingId === u.user_id
                                }
                                style={styles.roleSelect}
                              >
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>

                              {/* Delete */}
                              {!isSelf && (
                                <button
                                  style={styles.deleteBtn}
                                  onClick={() =>
                                    handleDelete(u.user_id)
                                  }
                                  title="Delete user"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* ADD USER MODAL */}
        {showAddForm && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2>Create New User</h2>
                <button
                  style={styles.closeBtn}
                  onClick={() => setShowAddForm(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} style={styles.form}>
                <div style={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    style={styles.input}
                    value={addForm.full_name}
                    onChange={(e) =>
                      setAddForm({ ...addForm, full_name: e.target.value })
                    }
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    style={styles.input}
                    value={addForm.email}
                    onChange={(e) =>
                      setAddForm({ ...addForm, email: e.target.value })
                    }
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Password</label>
                  <input
                    type="password"
                    required
                    style={styles.input}
                    value={addForm.password}
                    onChange={(e) =>
                      setAddForm({ ...addForm, password: e.target.value })
                    }
                  />
                  {addForm.password && (
                    <span style={{ fontSize: "12px", color: strength.color }}>
                      {strength.msg}
                    </span>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label>Phone</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={addForm.phone}
                    onChange={(e) =>
                      setAddForm({ ...addForm, phone: e.target.value })
                    }
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Role</label>
                  <select
                    style={styles.input}
                    value={addForm.role}
                    onChange={(e) =>
                      setAddForm({ ...addForm, role: e.target.value })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.submitBtn}
                    disabled={addingUser}
                  >
                    {addingUser ? "Saving..." : "Create User"}
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
  app: { minHeight: "100vh", background: "#f4f7fb" },
  content: { marginLeft: "250px", minHeight: "100vh" },
  header: {
    padding: "25px 40px",
    background: "white",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { margin: 0, fontSize: "26px", fontWeight: "700", color: "#172554" },
  subtitle: { marginTop: "5px", color: "#64748b", fontSize: "14px" },
  main: { padding: "30px 40px" },
  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px 18px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  tableCard: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  message: { padding: "30px", textAlign: "center", color: "#64748b" },
  nameCell: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emailCell: { color: "#64748b", fontSize: "13px" },
  youBadge: {
    fontSize: "11px",
    background: "#dcfce7",
    color: "#166534",
    padding: "2px 7px",
    borderRadius: "10px",
    fontWeight: "600",
  },
  roleBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  actions: { display: "flex", alignItems: "center", gap: "8px" },
  roleSelect: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    cursor: "pointer",
    background: "white",
  },
  deleteBtn: {
    background: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "6px",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  addButton: {
    background: "#1d4ed8",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "white",
    borderRadius: "12px",
    width: "450px",
    maxWidth: "90%",
    padding: "24px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#64748b",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "10px",
  },
  cancelBtn: {
    padding: "10px 16px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    background: "white",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "10px 16px",
    borderRadius: "6px",
    border: "none",
    background: "#1d4ed8",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  },
};
