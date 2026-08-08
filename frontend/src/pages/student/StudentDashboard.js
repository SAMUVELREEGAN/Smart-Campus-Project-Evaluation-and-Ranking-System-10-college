import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, EmptyState, LoadingBlock, PageHeader, StatCard, StatusBadge } from "../../components/ui";

export default function StudentDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.student.dashboard(token);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingBlock label="Loading dashboard..." />;

  return (
    <div className="stack">
      <PageHeader
        title="Student Dashboard"
        subtitle="Track submissions, automatic marks, staff verification, and ranking."
        actions={
          <Link to="/student/projects/new" className="btn btn--primary">
            Upload Project
          </Link>
        }
      />
      <Alert type="error" onClose={() => setError("")}>{error}</Alert>

      <div className="stats-grid">
        <StatCard label="Projects" value={data?.stats?.totalProjects ?? 0} />
        <StatCard label="Submitted" value={data?.stats?.submitted ?? 0} />
        <StatCard label="Verified" value={data?.stats?.verified ?? 0} />
        <StatCard label="Best Rank" value={data?.stats?.bestRank ?? "—"} />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Recent Projects</h2>
          <Link to="/student/projects">View all</Link>
        </div>
        {!data?.recentProjects?.length ? (
          <EmptyState
            title="No projects yet"
            description="Upload your first academic project to get an automatic evaluation mark."
            action={
              <Link to="/student/projects/new" className="btn btn--primary">
                Upload Project
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Auto Mark</th>
                  <th>Final Mark</th>
                  <th>Rank</th>
                </tr>
              </thead>
              <tbody>
                {data.recentProjects.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <Link to={`/student/projects/${p._id}`}>{p.title}</Link>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>{p.automaticMark ?? "—"}</td>
                    <td>{p.finalMark ?? "—"}</td>
                    <td>{p.rank ?? "—"}</td>
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
