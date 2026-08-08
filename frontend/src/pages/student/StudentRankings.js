import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, EmptyState, LoadingBlock, PageHeader } from "../../components/ui";

export default function StudentRankings() {
  const { token, user } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.student.rankings(token);
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

  if (loading) return <LoadingBlock />;

  return (
    <div className="stack">
      <PageHeader
        title="Published Rankings"
        subtitle="Campus rankings based on verified final marks."
      />
      <Alert type="error">{error}</Alert>
      {!rankings.length ? (
        <EmptyState title="Rankings not published yet" description="Check back after admin publishes results." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Project</th>
                <th>Student</th>
                <th>Final Mark</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r) => {
                const mine = r.student?._id === user?.id || r.student?.id === user?.id;
                return (
                  <tr key={r._id} className={mine ? "row-highlight" : ""}>
                    <td>#{r.rank}</td>
                    <td>{r.title}</td>
                    <td>{r.student?.name}</td>
                    <td>{r.finalMark}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
