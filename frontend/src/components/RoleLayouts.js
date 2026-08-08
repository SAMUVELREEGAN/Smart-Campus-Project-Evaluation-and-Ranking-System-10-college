import React from "react";
import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Trophy,
  ClipboardList,
  Users,
  Activity,
  BarChart3,
  FileSearch,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

export function StudentLayout() {
  return (
    <DashboardLayout
      title="Student Portal"
      homePath="/login"
      navItems={[
        { to: "/student", label: "Dashboard", icon: <LayoutDashboard size={18} />, end: true },
        { to: "/student/projects", label: "My Projects", icon: <FolderKanban size={18} /> },
        { to: "/student/results", label: "Results", icon: <ClipboardList size={18} /> },
        { to: "/student/rankings", label: "Rankings", icon: <Trophy size={18} /> },
      ]}
    />
  );
}

export function StaffLayout() {
  return (
    <DashboardLayout
      title="Staff Portal"
      homePath="/login"
      navItems={[
        { to: "/staff", label: "Dashboard", icon: <LayoutDashboard size={18} />, end: true },
        { to: "/staff/projects", label: "Projects", icon: <FileSearch size={18} /> },
      ]}
    />
  );
}

export function AdminLayout() {
  return (
    <DashboardLayout
      title="Admin Portal"
      homePath="/admin/login"
      navItems={[
        { to: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} />, end: true },
        { to: "/admin/users", label: "Users & Admins", icon: <Users size={18} /> },
        { to: "/admin/projects", label: "Projects", icon: <FolderKanban size={18} /> },
        { to: "/admin/rankings", label: "Rankings", icon: <Trophy size={18} /> },
        { to: "/admin/reports", label: "Reports", icon: <BarChart3 size={18} /> },
        { to: "/admin/activities", label: "Activity", icon: <Activity size={18} /> },
      ]}
    />
  );
}

export function UserAuthScope() {
  return <Outlet />;
}
