import { useState } from "react";
import { User, Save } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { useTheme } from "../../context/ThemeContext";

export default function Profile() {
  const { user, login } = useAuth();

  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
  });

  const { theme, setManualTheme } = useTheme();

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      await api.put("/users/me", form);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const ROLE_LABELS = {
    Admin: "Administrator",
    FleetManager: "Fleet Manager",
    Dispatcher: "Dispatcher",
    Driver: "Driver",
  };

  return (
    <div style={styles.app}>
      <Sidebar />

      <div style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>My Profile</h1>
            <p style={styles.subtitle}>View and update your account information</p>
          </div>
        </header>

        <main style={styles.main}>
          <div style={styles.grid}>
            {/* Profile card */}
            <div style={styles.avatarCard}>
              <div style={styles.avatarCircle}>
                <User size={40} color="white" />
              </div>

              <h2 style={styles.userName}>{user?.full_name}</h2>
              <p style={styles.userEmail}>{user?.email}</p>

              <div style={styles.roleBadge}>
                {ROLE_LABELS[user?.role] || user?.role}
              </div>

              <div style={styles.infoRows}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>User ID</span>
                  <span style={styles.infoValue}>
                    {String(user?.user_id).slice(0, 8)}...
                  </span>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Phone</span>
                  <span style={styles.infoValue}>
                    {user?.phone || "Not set"}
                  </span>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Role</span>
                  <span style={styles.infoValue}>{user?.role}</span>
                </div>
              </div>
            </div>

            {/* Edit form */}
            <div style={styles.formCard}>
              <h2 style={styles.formTitle}>Edit Profile</h2>

              {success && (
                <div style={styles.successBox}>{success}</div>
              )}

              {error && (
                <div style={styles.errorBox}>{error}</div>
              )}

              <form onSubmit={handleSave}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    style={{ ...styles.input, background: "#f8fafc", color: "#94a3b8" }}
                    disabled
                  />
                  <p style={styles.hint}>Email cannot be changed.</p>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter phone number"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Role</label>
                  <input
                    type="text"
                    value={ROLE_LABELS[user?.role] || user?.role}
                    style={{ ...styles.input, background: "#f8fafc", color: "#94a3b8" }}
                    disabled
                  />
                  <p style={styles.hint}>Contact an Admin to change your role.</p>
                </div>

                <button
                  type="submit"
                  style={styles.saveBtn}
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>


                {/* Appearance Settings */}
                <div style={styles.formCard}>
                  <h2 style={styles.formTitle}>Appearance</h2>
                  <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "14px" }}>
                    Customize the look and feel of FleetFlow.
                  </p>
                  <div style={{ display: "flex", gap: "15px" }}>
                    <button
                      onClick={() => setManualTheme("light")}
                      style={{
                        ...styles.themeButton,
                        ...(theme === "light" ? styles.themeButtonActive : {}),
                      }}
                    >
                      <span style={{ fontSize: "24px" }}>☀️</span>
                      <span style={{ fontWeight: "600", marginTop: "8px" }}>Light</span>
                    </button>
                    <button
                      onClick={() => setManualTheme("dark")}
                      style={{
                        ...styles.themeButton,
                        ...(theme === "dark" ? styles.themeButtonActive : {}),
                      }}
                    >
                      <span style={{ fontSize: "24px" }}>🌙</span>
                      <span style={{ fontWeight: "600", marginTop: "8px" }}>Dark</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
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
  },
  title: { margin: 0, fontSize: "26px", fontWeight: "700", color: "#172554" },
  subtitle: { marginTop: "5px", color: "#64748b", fontSize: "14px" },
  main: { padding: "30px 40px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: "24px",
    alignItems: "start",
  },
  avatarCard: {
    background: "white",
    borderRadius: "12px",
    padding: "30px 25px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    textAlign: "center",
  },
  avatarCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px",
  },
  userName: { margin: 0, fontSize: "18px", fontWeight: "700", color: "#172554" },
  userEmail: { color: "#64748b", fontSize: "13px", margin: "5px 0 15px" },
  roleBadge: {
    display: "inline-block",
    padding: "5px 14px",
    borderRadius: "20px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: "600",
    fontSize: "13px",
    marginBottom: "20px",
  },
  infoRows: { textAlign: "left", borderTop: "1px solid #e5e7eb", paddingTop: "16px" },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "13px",
  },
  infoLabel: { color: "#64748b", fontWeight: "500" },
  infoValue: { color: "#334155", fontWeight: "600" },
  formCard: {
    background: "white",
    borderRadius: "12px",
    padding: "30px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
  },
  formTitle: { marginTop: 0, fontSize: "18px", color: "#172554" },
  successBox: {
    background: "#dcfce7",
    color: "#166534",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "14px",
  },
  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "14px",
  },
  fieldGroup: { marginBottom: "20px" },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  },
  hint: { margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" },
  themeButton: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    border: "2px solid var(--border-color, #e5e7eb)",
    borderRadius: "12px",
    background: "var(--card-bg, white)",
    color: "var(--text-color, #1f2937)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  themeButtonActive: {
    borderColor: "var(--primary, #2563eb)",
    background: "var(--primary, #2563eb)",
    color: "white",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
  },
};
