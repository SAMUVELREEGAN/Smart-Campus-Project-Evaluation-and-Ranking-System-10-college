import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, LoadingBlock, PageHeader, StatCard, StatusBadge } from "../../components/ui";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const firstLoad = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.admin.dashboard(token);
      setData(res);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
      firstLoad.current = false;
    }
  }, [token]);

  useEffect(() => {
    load(false);
    // Poll quietly so user actions appear without full-page flicker
    const id = setInterval(() => load(true), 8000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && firstLoad.current) return <LoadingBlock />;

  return (
    <div className="stack">
      <PageHeader
        title="Admin Control Center"
        subtitle="Monitor submissions, evaluations, users, and campus rankings."
        actions={
          <button type="button" className="btn btn--outline" onClick={() => load(true)}>
            Refresh
          </button>
        }
      />
      <Alert type="error">{error}</Alert>

      <div className="stats-grid">
        <StatCard label="Students" value={data?.stats?.totalStudents ?? 0} />
        <StatCard label="Staff" value={data?.stats?.totalStaff ?? 0} />
        <StatCard label="Admins" value={data?.stats?.totalAdmins ?? 0} />
        <StatCard label="Projects" value={data?.stats?.totalProjects ?? 0} />
        <StatCard label="Pending Review" value={data?.stats?.pendingReview ?? 0} />
        <StatCard label="Verified" value={data?.stats?.verifiedProjects ?? 0} />
        <StatCard label="Published" value={data?.stats?.publishedProjects ?? 0} />
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel__head">
            <h2>Recent Projects</h2>
            <Link to="/admin/projects">Manage</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Final</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentProjects || []).map((p) => (
                  <tr key={p._id}>
                    <td>
                      <Link to={`/admin/projects/${p._id}`}>{p.title}</Link>
                    </td>
                    <td>{p.student?.name}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>{p.finalMark ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Live Activity</h2>
            <Link to="/admin/activities">All activity</Link>
          </div>
          <ul className="activity-feed">
            {(data?.recentActivities || []).map((a) => (
              <li key={a._id}>
                <strong>{a.actor?.name || "System"}</strong>
                <span>{a.details || a.action}</span>
                <em>{new Date(a.createdAt).toLocaleString()}</em>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
