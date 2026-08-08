import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import PasswordInput from "../../components/PasswordInput";
import { Alert, LoadingBlock, PageHeader } from "../../components/ui";

const emptyUser = {
  name: "",
  email: "",
  password: "",
  role: "student",
  department: "",
  studentId: "",
  phone: "",
};

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.users(token, {
        ...(role ? { role } : {}),
        ...(q ? { q } : {}),
      });
      setUsers(res.users || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, role, q]);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res =
        form.role === "admin"
          ? await api.admin.createAdmin(token, form)
          : await api.admin.createUser(token, form);
      setSuccess(res.message);
      setForm(emptyUser);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.admin.updateUser(token, user.id, { isActive: !user.isActive });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    try {
      await api.admin.deleteUser(token, user.id);
      setSuccess("User deleted");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="stack">
      <PageHeader
        title="Users & Admins"
        subtitle="Manage students, staff, and administrators."
        actions={
          <div className="action-row">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                setForm({ ...emptyUser, role: "admin" });
                setShowForm(true);
              }}
            >
              Add Admin
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setForm(emptyUser);
                setShowForm(true);
              }}
            >
              Add User
            </button>
          </div>
        }
      />

      <div className="toolbar">
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="staff">Staff</option>
          <option value="admin">Admins</option>
        </select>
        <input placeholder="Search name / email / ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn btn--outline" onClick={load}>
          Refresh
        </button>
      </div>

      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      {showForm ? (
        <form className="panel form form--grid" onSubmit={createUser}>
          <h2 className="form-span">{form.role === "admin" ? "Add Admin" : "Add User"}</h2>
          <label className="field">
            <span>Name</span>
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
            <span>Role</span>
            <select name="role" value={form.role} onChange={onChange}>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field">
            <span>Department</span>
            <input name="department" value={form.department} onChange={onChange} />
          </label>
          <label className="field">
            <span>Student ID</span>
            <input name="studentId" value={form.studentId} onChange={onChange} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" value={form.phone} onChange={onChange} />
          </label>
          <div className="action-row form-span">
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="role-chip">{u.role}</span>
                  </td>
                  <td>{u.department || "—"}</td>
                  <td>{u.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <div className="action-row">
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => toggleActive(u)}>
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => removeUser(u)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
