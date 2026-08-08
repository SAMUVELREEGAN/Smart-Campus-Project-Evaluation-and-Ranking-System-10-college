import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";
import { Alert } from "../../components/ui";

export default function UserLoginPage() {
  const { login, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleHint, setRoleHint] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAuthError("");
    setLoading(true);
    try {
      const user = await login({ email, password, roleHint });
      const dest =
        location.state?.from ||
        (user.role === "staff" ? "/staff" : "/student");
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <GraduationCap size={28} />
          <div>
            <strong>Smart Campus</strong>
            <span>Student / Staff Login</span>
          </div>
        </div>

        <Alert type="error" onClose={() => { setError(""); setAuthError(""); }}>
          {error || authError}
        </Alert>

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Login as</span>
            <select value={roleHint} onChange={(e) => setRoleHint(e.target.value)}>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@campus.com"
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          New student? <Link to="/register">Student registration</Link>
        </p>
        <p className="auth-footer">
          New staff? <Link to="/register/staff">Staff registration</Link>
        </p>
        <p className="auth-footer">
          Administrator? <Link to="/admin/login">Admin login</Link>
        </p>
        <p className="hint-box">
          Demo: student@campus.com / 123 · staff@campus.com / 123
        </p>
      </div>
    </div>
  );
}
