import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";
import { Alert } from "../../components/ui";

export default function StaffRegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ ...form, role: "staff" });
      navigate("/staff", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-card__brand">
          <ClipboardCheck size={28} />
          <div>
            <strong>Staff Registration</strong>
            <span>Create a faculty evaluation account</span>
          </div>
        </div>

        <Alert type="error" onClose={() => setError("")}>
          {error}
        </Alert>

        <form onSubmit={handleSubmit} className="form form--grid">
          <label className="field">
            <span>Full Name</span>
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </label>
          <label className="field">
            <span>Password</span>
            <PasswordInput
              name="password"
              value={form.password}
              onChange={onChange}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="field">
            <span>Department</span>
            <input name="department" value={form.department} onChange={onChange} required />
          </label>
          <label className="field form-span">
            <span>Phone</span>
            <input name="phone" value={form.phone} onChange={onChange} />
          </label>
          <button type="submit" className="btn btn--primary btn--block form-span" disabled={loading}>
            {loading ? "Creating account..." : "Register as Staff"}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-footer">
          Are you a student? <Link to="/register">Student registration</Link>
        </p>
      </div>
    </div>
  );
}
