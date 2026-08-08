import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, EmptyState, LoadingBlock, PageHeader } from "../../components/ui";

export default function AdminRankings() {
  const { token } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.rankings(token);
      setRankings(res.rankings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const recalculate = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.admin.recalculateRankings(token);
      setSuccess(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const publishAll = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.admin.publishRankings(token);
      setSuccess(res.message);
      setRankings(res.rankings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <PageHeader
        title="Rankings"
        subtitle="Recalculate and publish campus project rankings."
        actions={
          <div className="action-row">
            <button type="button" className="btn btn--outline" disabled={busy} onClick={recalculate}>
              Recalculate
            </button>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={publishAll}>
              Publish Rankings
            </button>
          </div>
        }
      />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      {loading ? (
        <LoadingBlock />
      ) : !rankings.length ? (
        <EmptyState title="No verified projects to rank" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Project</th>
                <th>Student</th>
                <th>Final Mark</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r) => (
                <tr key={r._id}>
                  <td>#{r.rank ?? "—"}</td>
                  <td>{r.title}</td>
                  <td>{r.student?.name}</td>
                  <td>{r.finalMark}</td>
                  <td>{r.isPublished ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
