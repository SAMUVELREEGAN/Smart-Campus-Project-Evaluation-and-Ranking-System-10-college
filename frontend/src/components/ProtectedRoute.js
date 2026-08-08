import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingBlock } from "./ui";

export function ProtectedRoute({ children, allowedRoles }) {
  const { bootstrapping, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="auth-gate">
        <LoadingBlock label="Checking session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith("/admin")
      ? "/admin/login"
      : "/login";
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children, redirectTo }) {
  const { bootstrapping, isAuthenticated, user } = useAuth();

  if (bootstrapping) {
    return (
      <div className="auth-gate">
        <LoadingBlock label="Loading..." />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}
