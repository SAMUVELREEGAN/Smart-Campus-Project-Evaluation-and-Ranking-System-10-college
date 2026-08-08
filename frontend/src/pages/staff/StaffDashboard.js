import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import {
  Alert,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
  StatusBadge,
} from "../../components/ui";

export default function StaffDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.staff.dashboard(token);
      setData(res);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

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

  if (loading) return <LoadingBlock />;

  const canDistribute = Boolean(data?.sessionProgress?.canDistribute);

  return (
    <div className="stack">
      <PageHeader
        title="Staff Evaluation Desk"
        subtitle="Verify all projects, then distribute marks to complete the session."
        actions={
          <div className="action-row">
            <Link to="/staff/projects?status=pending" className="btn btn--outline">
              Review Queue
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canDistribute || busy}
              onClick={distributeAll}
              title={
                canDistribute
                  ? "Release marks to all students"
                  : "Verify every submitted project first"
              }
            >
              {busy ? "Distributing..." : "Distribute All"}
            </button>
          </div>
        }
      />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <section className="panel">
        <div className="panel__head">
          <h2>Current Session</h2>
          {data?.openSession ? (
            <StatusBadge status={data.openSession.status} />
          ) : (
            <StatusBadge status="completed" />
          )}
        </div>
        {data?.openSession ? (
          <p>
            <strong>{data.openSession.name}</strong> — verify every submission, then click{" "}
            <strong>Distribute All</strong> to update student marks and close the session.
          </p>
        ) : (
          <p>
            No open session. A new session will start automatically when students upload projects
            again.
          </p>
        )}
        <div className="stats-grid" style={{ marginTop: "0.8rem" }}>
          <StatCard label="Pending Review" value={data?.stats?.pending ?? 0} />
          <StatCard label="Verified" value={data?.sessionProgress?.verified ?? data?.stats?.totalEvaluated ?? 0} />
          <StatCard label="Session Projects" value={data?.sessionProgress?.total ?? 0} />
          <StatCard
            label="Ready to Distribute"
            value={canDistribute ? "Yes" : "No"}
            hint={
              canDistribute
                ? "All verified — distribute now"
                : data?.sessionProgress?.pending
                  ? `${data.sessionProgress.pending} still pending`
                  : "Waiting for submissions"
            }
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Awaiting Review</h2>
        </div>
        {!data?.awaitingReview?.length ? (
          <EmptyState
            title="Queue is clear"
            description={
              canDistribute
                ? "All projects verified. Click Distribute All to release marks."
                : "No submissions waiting for staff verification."
            }
            action={
              canDistribute ? (
                <button type="button" className="btn btn--primary" disabled={busy} onClick={distributeAll}>
                  Distribute All
                </button>
              ) : null
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Student</th>
                  <th>Auto Mark</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.awaitingReview.map((p) => (
                  <tr key={p._id}>
                    <td>{p.title}</td>
                    <td>{p.student?.name || "Hidden"}</td>
                    <td>{p.automaticMark ?? "—"}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <Link to={`/staff/projects/${p._id}`} className="btn btn--outline btn--sm">
                        Evaluate
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
