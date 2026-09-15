import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "Driver",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/signup", form);
      navigate("/login");
    } catch (err) {
      let errMsg = "Signup failed. Please try again.";
      const detail = err.response?.data?.detail;
      if (detail) {
        if (Array.isArray(detail)) {
          errMsg = detail.map((d) => d.msg).join(", ");
        } else if (typeof detail === "object" && detail.msg) {
          errMsg = detail.msg;
        } else {
          errMsg = String(detail);
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>FleetFlow</h1>
        <p style={styles.subtitle}>Create your account</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Full Name</label>
          <input
            type="text"
            name="full_name"
            placeholder="Enter your full name"
            value={form.full_name}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <label style={styles.label}>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            required
            style={styles.input}
          />
          {form.password && (
            <p style={{ fontSize: "12px", color: strength.color, marginTop: "-10px", marginBottom: "15px" }}>
              {strength.msg}
            </p>
          )}

          <label style={styles.label}>Phone (optional)</label>
          <input
            type="tel"
            name="phone"
            placeholder="Enter your phone number"
            value={form.phone}
            onChange={handleChange}
            style={styles.input}
          />

          <label style={styles.label}>Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="Driver">Driver</option>
            <option value="Dispatcher">Dispatcher</option>
            <option value="FleetManager">Fleet Manager</option>
            <option value="Admin">Admin</option>
          </select>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={styles.loginLink}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f7fb",
  },

  card: {
    width: "420px",
    padding: "35px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
  },

  title: {
    textAlign: "center",
    marginBottom: "5px",
    color: "#172554",
  },

  subtitle: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: "25px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "5px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    marginBottom: "16px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
  },

  button: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    background: "#2563eb",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "5px",
  },

  error: {
    color: "#dc2626",
    fontSize: "14px",
    marginBottom: "12px",
  },

  loginLink: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "14px",
    color: "#64748b",
  },

  link: {
    color: "#2563eb",
    fontWeight: "600",
    textDecoration: "none",
  },
};
