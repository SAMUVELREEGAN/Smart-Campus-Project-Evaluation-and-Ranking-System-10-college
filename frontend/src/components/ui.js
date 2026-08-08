import React from "react";

export function StatusBadge({ status }) {
  const map = {
    draft: { label: "Draft", tone: "muted" },
    submitted: { label: "Submitted", tone: "info" },
    auto_evaluated: { label: "Auto Evaluated", tone: "info" },
    under_review: { label: "Under Review", tone: "warn" },
    verified: { label: "Verified", tone: "success" },
    published: { label: "Distributed", tone: "success" },
    open: { label: "Session Open", tone: "info" },
    completed: { label: "Session Completed", tone: "muted" },
  };
  const item = map[status] || { label: status || "Unknown", tone: "muted" };
  return <span className={`badge badge--${item.tone}`}>{item.label}</span>;
}

export function LoadingBlock({ label = "Loading..." }) {
  return (
    <div className="loading-block" role="status">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action || null}
    </div>
  );
}

export function Alert({ type = "info", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert--${type}`} role="alert">
      <span>{children}</span>
      {onClose ? (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value ?? "—"}</p>
      {hint ? <p className="stat-card__hint">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
