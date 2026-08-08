import React from "react";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { StudentLayout, StaffLayout, AdminLayout } from "./components/RoleLayouts";

import LandingPage from "./pages/LandingPage";
import UserLoginPage from "./pages/auth/UserLoginPage";
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import StaffRegisterPage from "./pages/auth/StaffRegisterPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProjects from "./pages/student/StudentProjects";
import ProjectFormPage from "./pages/student/ProjectFormPage";
import StudentProjectDetail from "./pages/student/StudentProjectDetail";
import StudentResults from "./pages/student/StudentResults";
import StudentRankings from "./pages/student/StudentRankings";

import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffProjects from "./pages/staff/StaffProjects";
import StaffProjectDetail from "./pages/staff/StaffProjectDetail";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminProjectDetail from "./pages/admin/AdminProjectDetail";
import AdminRankings from "./pages/admin/AdminRankings";
import AdminReports from "./pages/admin/AdminReports";
import AdminActivities from "./pages/admin/AdminActivities";

function UserAuthTree() {
  return (
    <AuthProvider panel="user">
      <Outlet />
    </AuthProvider>
  );
}

function AdminAuthTree() {
  return (
    <AuthProvider panel="admin">
      <Outlet />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<UserAuthTree />}>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <UserLoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register/staff"
            element={
              <PublicOnlyRoute>
                <StaffRegisterPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="projects" element={<StudentProjects />} />
            <Route path="projects/new" element={<ProjectFormPage />} />
            <Route path="projects/:id" element={<StudentProjectDetail />} />
            <Route path="projects/:id/edit" element={<ProjectFormPage />} />
            <Route path="results" element={<StudentResults />} />
            <Route path="rankings" element={<StudentRankings />} />
          </Route>

          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["staff"]}>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StaffDashboard />} />
            <Route path="projects" element={<StaffProjects />} />
            <Route path="projects/:id" element={<StaffProjectDetail />} />
          </Route>
        </Route>

        <Route element={<AdminAuthTree />}>
          <Route
            path="/admin/login"
            element={
              <PublicOnlyRoute redirectTo="/admin">
                <AdminLoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="projects/:id" element={<AdminProjectDetail />} />
            <Route path="rankings" element={<AdminRankings />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="activities" element={<AdminActivities />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
