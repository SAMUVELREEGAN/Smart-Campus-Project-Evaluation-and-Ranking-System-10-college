import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, LoadingBlock, PageHeader, StatusBadge } from "../../components/ui";

export default function StudentProjectDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.student.project(token, id);
      setProject(res.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.student.submitProject(token, id);
      setProject(res.project);
      setSuccess(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (!project) return <Alert type="error">{error || "Project not found"}</Alert>;

  const canEdit = !project.isVerified && !["under_review", "verified", "published"].includes(project.status);

  return (
    <div className="stack">
      <PageHeader
        title={project.title}
        subtitle={project.category}
        actions={
          <div className="action-row">
            {canEdit ? (
              <Link to={`/student/projects/${id}/edit`} className="btn btn--outline">
                Edit
              </Link>
            ) : null}
            {canEdit && project.status !== "auto_evaluated" ? (
              <button type="button" className="btn btn--primary" disabled={busy} onClick={submit}>
                {busy ? "Submitting..." : "Submit for Evaluation"}
              </button>
            ) : null}
          </div>
        }
      />

      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="detail-grid">
        <section className="panel">
          <h2>Project Details</h2>
          <p>{project.description}</p>
          <div className="meta-row">
            <StatusBadge status={project.status} />
            <span>Tech: {project.technology || "—"}</span>
            <span>Session: {project.session?.name || "—"}</span>
            <span>Verified: {project.isVerified ? "Yes" : "No"}</span>
            <span>Distributed: {project.isDistributed ? "Yes" : "No"}</span>
          </div>
          <h3>Files</h3>
          <ul className="file-list">
            {(project.files || []).map((f) => (
              <li key={f.filename}>
                <a href={`http://localhost:8000/uploads/${f.filename}`} target="_blank" rel="noreferrer">
                  {f.originalName}
                </a>
                <span className="chip">{f.fileType}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Evaluation</h2>
          <div className="marks-grid">
            <div>
              <span>Automatic Mark</span>
              <strong>{project.automaticMark ?? "—"}</strong>
            </div>
            <div>
              <span>Staff Mark</span>
              <strong>{project.isDistributed ? project.staffMark ?? "—" : "—"}</strong>
            </div>
            <div>
              <span>Final Mark</span>
              <strong>{project.isDistributed ? project.finalMark ?? "—" : "—"}</strong>
            </div>
            <div>
              <span>Rank</span>
              <strong>{project.isDistributed ? project.rank ?? "—" : "—"}</strong>
            </div>
          </div>

          {project.awaitingDistribution ? (
            <Alert type="info">
              Staff has verified this project. Final marks and rank will appear after Distribute All.
            </Alert>
          ) : null}

          {project.isDistributed && project.isVerified ? (
            <Alert type="success">
              Marks for this session have been distributed. Upload a new project for the next session.
            </Alert>
          ) : null}

          {project.automaticBreakdown ? (
            <>
              <h3>Auto Breakdown</h3>
              <ul className="breakdown">
                {Object.entries(project.automaticBreakdown).map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {project.staffComments ? (
            <>
              <h3>Staff Comments</h3>
              <p>{project.staffComments}</p>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
