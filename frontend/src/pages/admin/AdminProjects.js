import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, EmptyState, LoadingBlock, PageHeader, StatusBadge } from "../../components/ui";

export default function AdminProjects() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.admin.projects(token, {
        ...(status ? { status } : {}),
        ...(q ? { q } : {}),
      });
      setProjects(res.projects || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, status, q]);

  useEffect(() => {
    load(false);
    const id = setInterval(() => load(true), 10000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="stack">
      <PageHeader
        title="All Projects"
        subtitle="Monitor submissions, auto marks, staff marks, and verification state."
      />
      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set("status", e.target.value);
            else next.delete("status");
            setParams(next);
          }}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="published">Published</option>
        </select>
        <input placeholder="Search project / student" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn btn--outline" onClick={() => load(true)}>
          Refresh
        </button>
      </div>
      <Alert type="error">{error}</Alert>
      {loading && !projects.length ? (
        <LoadingBlock />
      ) : !projects.length ? (
        <EmptyState title="No projects" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Student</th>
                <th>Auto</th>
                <th>Staff</th>
                <th>Final</th>
                <th>Rank</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id}>
                  <td>{p.title}</td>
                  <td>{p.student?.name}</td>
                  <td>{p.automaticMark ?? "—"}</td>
                  <td>{p.staffMark ?? "—"}</td>
                  <td>{p.finalMark ?? "—"}</td>
                  <td>{p.rank ?? "—"}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <Link to={`/admin/projects/${p._id}`} className="btn btn--outline btn--sm">
                      Manage
                    </Link>
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
