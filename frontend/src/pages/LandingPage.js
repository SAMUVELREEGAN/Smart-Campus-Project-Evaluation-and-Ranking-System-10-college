import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Shield, Users, ClipboardCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing__glow landing__glow--a" />
      <div className="landing__glow landing__glow--b" />

      <header className="landing__nav">
        <div className="brand-mark">
          <GraduationCap size={26} />
          <span>Smart Campus</span>
        </div>
        <div className="landing__nav-actions">
          <Link to="/login" className="btn btn--ghost">
            Student / Staff
          </Link>
          <Link to="/admin/login" className="btn btn--primary">
            Admin Login
          </Link>
        </div>
      </header>

      <section className="landing__hero">
        <p className="eyebrow">Project Evaluation & Ranking</p>
        <h1>Smart Campus Project Evaluation and Ranking System</h1>
        <p className="lead">
          Submit projects, get automatic evaluation marks, staff verification, and live campus
          rankings — all in one secure platform.
        </p>
        <div className="cta-row">
          <Link to="/register" className="btn btn--primary btn--lg">
            Student Register
          </Link>
          <Link to="/register/staff" className="btn btn--outline btn--lg">
            Staff Register
          </Link>
          <Link to="/login" className="btn btn--ghost btn--lg">
            Sign In
          </Link>
        </div>
      </section>

      <section className="landing__features">
        <article>
          <Users size={22} />
          <h3>Students</h3>
          <p>Upload documentation and source files, track auto marks, final marks, and rank.</p>
        </article>
        <article>
          <ClipboardCheck size={22} />
          <h3>Staff</h3>
          <p>Review anonymized submissions, verify or revise marks, then reveal student identity.</p>
        </article>
        <article>
          <Shield size={22} />
          <h3>Admin</h3>
          <p>Manage users, edit verified marks, publish rankings, and monitor all activity.</p>
        </article>
      </section>
    </div>
  );
}
