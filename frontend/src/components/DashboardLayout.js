import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, GraduationCap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout({ title, navItems, homePath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(homePath || "/");
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <GraduationCap size={22} />
          <div>
            <strong>Smart Campus</strong>
            <span>{title}</span>
          </div>
        </div>
        <nav className="sidebar__nav" onClick={() => setOpen(false)}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
            <em className="role-chip">{user?.role}</em>
          </div>
          <button type="button" className="btn btn--ghost btn--block" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {open ? <div className="sidebar-backdrop" onClick={() => setOpen(false)} /> : null}

      <div className="main-panel">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="topbar__title">
            <span>Logged in as</span>
            <strong>{user?.name}</strong>
          </div>
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{ visibility: open ? "visible" : "hidden" }}
          >
            <X size={20} />
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
