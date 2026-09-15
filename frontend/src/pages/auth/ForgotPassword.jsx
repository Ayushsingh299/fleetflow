import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Form State
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getPasswordStrength = (pw) => {
    if (!pw) return { msg: "", color: "" };
    if (pw.length < 8) return { msg: "Weak: Must be at least 8 characters", color: "#ef4444" };
    if (!/[A-Z]/.test(pw)) return { msg: "Weak: Must contain an uppercase letter", color: "#ef4444" };
    if (!/[a-z]/.test(pw)) return { msg: "Weak: Must contain a lowercase letter", color: "#ef4444" };
    if (!/\d/.test(pw)) return { msg: "Weak: Must contain a number", color: "#ef4444" };
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return { msg: "Weak: Must contain a special character", color: "#ef4444" };
    return { msg: "Strong", color: "#22c55e" };
  };

  const strength = getPasswordStrength(newPassword);

  const parseError = (err) => {
    const detail = err.response?.data?.detail;
    if (Array.isArray(detail)) {
        return detail.map(d => d.msg).join(", ");
    }
    return detail || "An error occurred. Please try again.";
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (strength.msg !== "Strong") {
        setError("Please choose a strong password.");
        setLoading(false);
        return;
    }

    try {
      await api.post("/auth/reset-password", {
        email,
        otp_code: otpCode,
        new_password: newPassword,
      });
      alert("Password successfully reset! Please login with your new password.");
      navigate("/login");
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>FleetFlow</h1>
        <p style={styles.subtitle}>Reset Password</p>

        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
              Enter your email address and we'll send you a recovery code to reset your password.
            </p>
            
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Sending..." : "Send Recovery Code"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            {message && <p style={styles.success}>{message}</p>}
            
            <label style={styles.label}>Recovery Code</label>
            <input
              type="text"
              placeholder="6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
              maxLength={6}
              style={{ ...styles.input, textAlign: "center", letterSpacing: "5px", fontSize: "18px" }}
            />

            <label style={styles.label}>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={styles.input}
            />
            {newPassword && (
                <p style={{ fontSize: "12px", color: strength.color, marginTop: "-10px", marginBottom: "15px" }}>
                    {strength.msg}
                </p>
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link to="/login" style={{ fontSize: "14px", color: "#2563eb", textDecoration: "none", fontWeight: "600" }}>
            Back to Login
          </Link>
        </div>
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
    width: "400px",
    padding: "35px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    textAlign: "center",
    color: "#1e293b",
    margin: "0 0 5px 0",
  },
  subtitle: {
    fontSize: "15px",
    textAlign: "center",
    color: "#64748b",
    margin: "0 0 25px 0",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    marginBottom: "15px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
  },
  error: {
    color: "#dc2626",
    fontSize: "13px",
    marginBottom: "15px",
    textAlign: "center",
    background: "#fef2f2",
    padding: "8px",
    borderRadius: "6px",
  },
  success: {
    color: "#059669",
    fontSize: "13px",
    marginBottom: "15px",
    textAlign: "center",
    background: "#ecfdf5",
    padding: "8px",
    borderRadius: "6px",
  }
};
