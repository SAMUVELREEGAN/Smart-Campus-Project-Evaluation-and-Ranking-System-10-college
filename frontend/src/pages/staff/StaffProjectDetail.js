import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, LoadingBlock, PageHeader, StatusBadge } from "../../components/ui";

export default function StaffProjectDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [staffMark, setStaffMark] = useState("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.staff.project(token, id);
      setProject(res.project);
      setStaffMark(
        res.project.staffMark != null ? String(res.project.staffMark) : String(res.project.automaticMark ?? "")
      );
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

  const verify = async (verifyDirectly) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.staff.updateMark(token, id, {
        verifyDirectly,
        staffMark: verifyDirectly ? undefined : Number(staffMark),
        comments,
      });
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
        subtitle="Staff evaluation workspace"
        actions={
          <Link to="/staff/projects" className="btn btn--ghost">
            Back
          </Link>
        }
      />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="detail-grid">
        <section className="panel">
          <h2>Submission</h2>
          <p>{project.description}</p>
          <div className="meta-row">
            <StatusBadge status={project.status} />
            <span>Tech: {project.technology || "—"}</span>
          </div>
          <h3>Student</h3>
          <p>
            <strong>{project.student?.name}</strong>
            <br />
            {project.isVerified ? (
              <>
                {project.student?.email}
                <br />
                ID: {project.student?.studentId || "—"}
              </>
            ) : (
              <em>Identity hidden until verification</em>
            )}
          </p>
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
          <h2>Marks</h2>
          <div className="marks-grid">
            <div>
              <span>Automatic Mark</span>
              <strong>{project.automaticMark ?? "—"}</strong>
            </div>
            <div>
              <span>Staff / Final</span>
              <strong>{project.finalMark ?? "—"}</strong>
            </div>
          </div>

          {project.automaticBreakdown ? (
            <ul className="breakdown">
              {Object.entries(project.automaticBreakdown).map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </li>
              ))}
            </ul>
          ) : null}

          {!project.isVerified ? (
            <div className="form stack" style={{ marginTop: "1rem" }}>
              <label className="field">
                <span>Revised Staff Mark (0–100)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={staffMark}
                  onChange={(e) => setStaffMark(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Comments</span>
                <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
              </label>
              <div className="action-row">
                <button
                  type="button"
                  className="btn btn--outline"
                  disabled={busy}
                  onClick={() => verify(true)}
                >
                  Verify Auto Mark
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={busy}
                  onClick={() => verify(false)}
                >
                  Submit Staff Mark & Verify
                </button>
              </div>
            </div>
          ) : project.isDistributed ? (
            <Alert type="success">
              Marks distributed for this session. Students can now see final marks and ranks.
            </Alert>
          ) : (
            <Alert type="info">
              Evaluation verified. After all projects are verified, click Distribute All on the
              dashboard to release marks and complete the session.
            </Alert>
          )}
        </section>
      </div>
    </div>
  );
}
