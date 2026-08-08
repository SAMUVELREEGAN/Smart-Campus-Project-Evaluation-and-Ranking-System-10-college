import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, EmptyState, LoadingBlock, PageHeader } from "../../components/ui";

export default function AdminActivities() {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.admin.activities(token, 100);
      setActivities(res.activities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load(false);
    const id = setInterval(() => load(true), 6000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="stack">
      <PageHeader
        title="Activity Feed"
        subtitle="Student, staff, and admin actions sync here in near real time."
        actions={
          <button type="button" className="btn btn--outline" onClick={() => load(true)}>
            Refresh
          </button>
        }
      />
      <Alert type="error">{error}</Alert>
      {loading ? (
        <LoadingBlock />
      ) : !activities.length ? (
        <EmptyState title="No activity yet" />
      ) : (
        <ul className="activity-feed activity-feed--full">
          {activities.map((a) => (
            <li key={a._id}>
              <div>
                <strong>{a.actor?.name || "System"}</strong>
                <span className="role-chip">{a.actorRole}</span>
              </div>
              <span>{a.details || a.action}</span>
              <em>{new Date(a.createdAt).toLocaleString()}</em>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
