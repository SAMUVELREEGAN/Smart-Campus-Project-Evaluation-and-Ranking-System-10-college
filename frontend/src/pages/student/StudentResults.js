import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, EmptyState, LoadingBlock, PageHeader, StatusBadge } from "../../components/ui";

export default function StudentResults() {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.student.results(token);
      setResults(res.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingBlock />;

  return (
    <div className="stack">
      <PageHeader
        title="My Results"
        subtitle="Final staff marks and ranks appear after staff clicks Distribute All."
      />
      <Alert type="error">{error}</Alert>
      {!results.length ? (
        <EmptyState
          title="No results yet"
          description="After verification, staff must distribute marks before final scores appear here."
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Session</th>
                <th>Status</th>
                <th>Auto</th>
                <th>Staff</th>
                <th>Final</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td>{r.title}</td>
                  <td>{r.session?.name || "—"}</td>
                  <td>
                    <StatusBadge status={r.status} />
                    {r.awaitingDistribution ? (
                      <span className="chip" style={{ marginLeft: "0.4rem" }}>
                        Awaiting distribution
                      </span>
                    ) : null}
                  </td>
                  <td>{r.automaticMark ?? "—"}</td>
                  <td>{r.isDistributed ? r.staffMark ?? "—" : "—"}</td>
                  <td>{r.isDistributed ? r.finalMark ?? "—" : "—"}</td>
                  <td>{r.isDistributed ? r.rank ?? "—" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
