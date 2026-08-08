import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Alert, LoadingBlock, PageHeader, StatCard } from "../../components/ui";

export default function AdminReports() {
  const { token } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.reports(token);
      setReport(res);
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
      <PageHeader title="Reports" subtitle="System-wide evaluation analytics." />
      <Alert type="error">{error}</Alert>

      <div className="stats-grid">
        <StatCard label="Avg Final Mark" value={report?.markStats?.avgMark ? report.markStats.avgMark.toFixed(1) : "—"} />
        <StatCard label="Highest Mark" value={report?.markStats?.maxMark ?? "—"} />
        <StatCard label="Lowest Mark" value={report?.markStats?.minMark ?? "—"} />
        <StatCard label="Scored Projects" value={report?.markStats?.count ?? 0} />
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h2>By Status</h2>
          <ul className="breakdown">
            {(report?.byStatus || []).map((s) => (
              <li key={s._id || "unknown"}>
                <span>{s._id || "unknown"}</span>
                <strong>{s.count}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>By Department</h2>
          <ul className="breakdown">
            {(report?.byDepartment || []).map((d) => (
              <li key={d._id || "n/a"}>
                <span>{d._id || "N/A"}</span>
                <strong>
                  {d.count} · avg {d.avgFinalMark != null ? Number(d.avgFinalMark).toFixed(1) : "—"}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Top Projects</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Student</th>
                <th>Final</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {(report?.topProjects || []).map((p) => (
                <tr key={p._id}>
                  <td>{p.title}</td>
                  <td>{p.student?.name}</td>
                  <td>{p.finalMark}</td>
                  <td>{p.rank ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
