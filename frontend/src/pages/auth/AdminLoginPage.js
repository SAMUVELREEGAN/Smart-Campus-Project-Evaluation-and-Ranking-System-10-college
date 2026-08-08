import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";
import { Alert } from "../../components/ui";

export default function AdminLoginPage() {
  const { login, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("test@gamil.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAuthError("");
    setLoading(true);
    try {
      await login({ email, password, roleHint: "admin" });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--admin">
      <div className="auth-card">
        <div className="auth-card__brand">
          <Shield size={28} />
          <div>
            <strong>Admin Portal</strong>
            <span>Smart Campus Evaluation</span>
          </div>
        </div>

        <Alert type="error" onClose={() => { setError(""); setAuthError(""); }}>
          {error || authError}
        </Alert>

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Admin Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? "Signing in..." : "Admin Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          Not an admin? <Link to="/login">Student / Staff login</Link>
        </p>
        <p className="hint-box">Default admin: test@gamil.com / 123</p>
      </div>
    </div>
  );
}
