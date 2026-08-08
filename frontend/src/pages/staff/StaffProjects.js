import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, EmptyState, LoadingBlock, PageHeader, StatusBadge } from "../../components/ui";

export default function StaffProjects() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState([]);
  const [openSession, setOpenSession] = useState(null);
  const [sessionProgress, setSessionProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.staff.projects(token, {
        ...(status ? { status } : {}),
        ...(q ? { q } : {}),
      });
      setProjects(res.projects || []);
      setOpenSession(res.openSession || null);
      setSessionProgress(res.sessionProgress || null);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  const distributeAll = async () => {
    if (
      !window.confirm(
        "Distribute verified marks to all students and complete this evaluation session?"
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.staff.distributeAll(token);
      setSuccess(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const canDistribute = Boolean(sessionProgress?.canDistribute);

  return (
    <div className="stack">
      <PageHeader
        title="Submitted Projects"
        subtitle={
          openSession
            ? `${openSession.name} — verify all, then distribute marks.`
            : "Browse and evaluate campus project submissions."
        }
        actions={
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canDistribute || busy}
            onClick={distributeAll}
          >
            {busy ? "Distributing..." : "Distribute All"}
          </button>
        }
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
          <option value="">All reviewable</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
        </select>
        <input
          placeholder="Search title / tech / category"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn--outline" onClick={load}>
          Refresh
        </button>
      </div>
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      {sessionProgress ? (
        <p className="hint-box" style={{ margin: 0 }}>
          Session progress: {sessionProgress.verified}/{sessionProgress.total} verified
          {sessionProgress.pending ? ` · ${sessionProgress.pending} pending` : ""}
          {canDistribute ? " · Ready to distribute" : ""}
        </p>
      ) : null}
      {loading ? (
        <LoadingBlock />
      ) : !projects.length ? (
        <EmptyState title="No projects found" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Student</th>
                <th>Auto</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Distributed</th>
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
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>{p.isDistributed ? "Yes" : "No"}</td>
                  <td>
                    <Link to={`/staff/projects/${p._id}`} className="btn btn--outline btn--sm">
                      Open
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
