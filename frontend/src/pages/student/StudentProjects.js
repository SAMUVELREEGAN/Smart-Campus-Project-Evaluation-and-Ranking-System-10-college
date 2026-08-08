import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, EmptyState, LoadingBlock, PageHeader, StatusBadge } from "../../components/ui";

export default function StudentProjects() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.student.projects(token);
      setProjects(res.projects || []);
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
        title="My Projects"
        subtitle="Create, update, and submit projects for automatic evaluation."
        actions={
          <Link to="/student/projects/new" className="btn btn--primary">
            New Project
          </Link>
        }
      />
      <Alert type="error">{error}</Alert>

      {!projects.length ? (
        <EmptyState title="No projects" description="Start by uploading project files and details." />
      ) : (
        <div className="card-list">
          {projects.map((p) => (
            <article key={p._id} className="list-card">
              <div>
                <h3>
                  <Link to={`/student/projects/${p._id}`}>{p.title}</Link>
                </h3>
                <p>{p.description?.slice(0, 140)}{(p.description || "").length > 140 ? "…" : ""}</p>
                <div className="meta-row">
                  <StatusBadge status={p.status} />
                  <span>Auto: {p.automaticMark ?? "—"}</span>
                  <span>Final: {p.finalMark ?? "—"}</span>
                  <span>Rank: {p.rank ?? "—"}</span>
                </div>
              </div>
              <Link to={`/student/projects/${p._id}`} className="btn btn--outline">
                Open
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
