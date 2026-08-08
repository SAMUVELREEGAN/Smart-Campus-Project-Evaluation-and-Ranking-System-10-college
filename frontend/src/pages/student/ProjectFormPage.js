import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, LoadingBlock, PageHeader } from "../../components/ui";

const emptyForm = {
  title: "",
  description: "",
  technology: "",
  category: "General",
};

export default function ProjectFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [documentation, setDocumentation] = useState([]);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [otherFiles, setOtherFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.student.project(token, id);
        if (cancelled) return;
        const p = res.project;
        setForm({
          title: p.title || "",
          description: p.description || "",
          technology: p.technology || "",
          category: p.category || "General",
        });
        setExistingFiles(p.files || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id, token]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const buildFormData = (submit) => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("submit", submit ? "true" : "false");
    documentation.forEach((f) => fd.append("documentation", f));
    sourceFiles.forEach((f) => fd.append("sourceFiles", f));
    otherFiles.forEach((f) => fd.append("otherFiles", f));
    return fd;
  };

  const save = async (submit) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const fd = buildFormData(submit);
      const res = isEdit
        ? await api.student.updateProject(token, id, fd)
        : await api.student.createProject(token, fd);
      setSuccess(res.message);
      navigate(`/student/projects/${res.project._id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="stack">
      <PageHeader
        title={isEdit ? "Update Project" : "Upload Project"}
        subtitle="Add details and files. Submit to generate an automatic evaluation mark."
        actions={
          <Link to="/student/projects" className="btn btn--ghost">
            Back
          </Link>
        }
      />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <form
        className="panel form stack"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <label className="field">
          <span>Project Title</span>
          <input name="title" value={form.title} onChange={onChange} required />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            name="description"
            rows={5}
            value={form.description}
            onChange={onChange}
            required
          />
        </label>
        <div className="form--grid">
          <label className="field">
            <span>Technology</span>
            <input name="technology" value={form.technology} onChange={onChange} />
          </label>
          <label className="field">
            <span>Category</span>
            <input name="category" value={form.category} onChange={onChange} />
          </label>
        </div>

        <div className="form--grid">
          <label className="field">
            <span>Documentation</span>
            <input
              type="file"
              multiple
              onChange={(e) => setDocumentation(Array.from(e.target.files || []))}
            />
          </label>
          <label className="field">
            <span>Source Files</span>
            <input
              type="file"
              multiple
              onChange={(e) => setSourceFiles(Array.from(e.target.files || []))}
            />
          </label>
          <label className="field form-span">
            <span>Other Files</span>
            <input
              type="file"
              multiple
              onChange={(e) => setOtherFiles(Array.from(e.target.files || []))}
            />
          </label>
        </div>

        {existingFiles.length > 0 ? (
          <div className="file-chips">
            <strong>Existing files:</strong>
            {existingFiles.map((f) => (
              <span key={f.filename} className="chip">
                {f.originalName} ({f.fileType})
              </span>
            ))}
          </div>
        ) : null}

        <div className="action-row">
          <button type="submit" className="btn btn--outline" disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => save(true)}
          >
            {saving ? "Submitting..." : "Submit & Auto Evaluate"}
          </button>
        </div>
      </form>
    </div>
  );
}
