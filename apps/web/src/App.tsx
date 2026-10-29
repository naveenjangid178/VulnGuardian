
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import WorkspaceLayout from "./layouts/WorkspaceLayout";

import Dashboard from "./pages/dashboard/Dashboard";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Projects from "./pages/projects/Projects";
import ProjectDetails from "./pages/projects/details/components/ProjectDetails";
import SourceCodePage from "./pages/projects/SourceCodePage";

function ProtectedRoute() {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Redirect the root URL */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public authentication routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected application routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<WorkspaceLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/projects" element={<Projects />} />

          <Route
            path="/projects/:projectId"
            element={<ProjectDetails />}
          />

          <Route
            path="/projects/:projectId/source"
            element={<SourceCodePage />}
          />
        </Route>
      </Route>

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
