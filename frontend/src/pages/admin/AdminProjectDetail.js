import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, LoadingBlock, PageHeader, StatusBadge } from "../../components/ui";

export default function AdminProjectDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [finalMark, setFinalMark] = useState("");
  const [staffMark, setStaffMark] = useState("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.project(token, id);
      setProject(res.project);
      setFinalMark(res.project.finalMark != null ? String(res.project.finalMark) : "");
      setStaffMark(res.project.staffMark != null ? String(res.project.staffMark) : "");
      setComments(res.project.staffComments || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveMarks = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.admin.updateMark(token, id, {
        finalMark: finalMark === "" ? undefined : Number(finalMark),
        staffMark: staffMark === "" ? undefined : Number(staffMark),
        comments,
        isVerified: true,
      });
      setProject(res.project);
      setSuccess(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.admin.publishProject(token, id);
      setProject(res.project);
      setSuccess(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (!project) return <Alert type="error">{error || "Not found"}</Alert>;

  return (
    <div className="stack">
      <PageHeader
        title={project.title}
        subtitle="Full admin access — including editing verified marks"
        actions={
          <Link to="/admin/projects" className="btn btn--ghost">
            Back
          </Link>
        }
      />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="detail-grid">
        <section className="panel">
          <h2>Project & Student</h2>
          <p>{project.description}</p>
          <div className="meta-row">
            <StatusBadge status={project.status} />
            <span>{project.student?.name}</span>
            <span>{project.student?.email}</span>
            <span>ID: {project.student?.studentId || "—"}</span>
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
          <h2>Mark Management</h2>
          <div className="marks-grid">
            <div>
              <span>Automatic</span>
              <strong>{project.automaticMark ?? "—"}</strong>
            </div>
            <div>
              <span>Rank</span>
              <strong>{project.rank ?? "—"}</strong>
            </div>
          </div>
          <div className="form stack" style={{ marginTop: "1rem" }}>
            <label className="field">
              <span>Staff Mark</span>
              <input type="number" min="0" max="100" value={staffMark} onChange={(e) => setStaffMark(e.target.value)} />
            </label>
            <label className="field">
              <span>Final Mark</span>
              <input type="number" min="0" max="100" value={finalMark} onChange={(e) => setFinalMark(e.target.value)} />
            </label>
            <label className="field">
              <span>Comments</span>
              <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
            </label>
            <div className="action-row">
              <button type="button" className="btn btn--primary" disabled={busy} onClick={saveMarks}>
                Save / Override Marks
              </button>
              <button type="button" className="btn btn--outline" disabled={busy || !project.isVerified} onClick={publish}>
                Publish Result
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
