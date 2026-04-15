import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import WorkInput from "./pages/employee/WorkInput";
import WorkHistory from "./pages/employee/WorkHistory";
import Dashboard from "./pages/admin/Dashboard";
import WorkView from "./pages/admin/WorkView";
import Statistics from "./pages/admin/Statistics";
import EmployeeMaster from "./pages/admin/EmployeeMaster";
import LoginCheck from "./pages/admin/LoginCheck";
import AttendanceImport from "./pages/admin/AttendanceImport";
import MainMenu from "./pages/MainMenu";
import Upload from "./pages/Upload";
import ReportOutput from "./pages/ReportOutput";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "ADMIN")
    return <Navigate to="/work-input" replace />;
  return children;
}

function MenuRoute() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return <Navigate to="/work-input" replace />;
  }
  return <MainMenu />;
}

/** 勤怠入力は一般社員のみ。管理者はメニューへ誘導（代表者要望）。 */
function WorkInputRoute() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") {
    return <Navigate to="/menu" replace />;
  }
  return <WorkInput />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;

  const defaultPath = user
    ? user.role === "ADMIN"
      ? "/menu"
      : "/work-input"
    : "/login";

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={defaultPath} replace /> : <Login />}
      />
      <Route path="/" element={<Navigate to={defaultPath} replace />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="menu" element={<MenuRoute />} />
        <Route path="work-input" element={<WorkInputRoute />} />
        <Route
          path="work-history"
          element={
            <PrivateRoute adminOnly>
              <WorkHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="upload"
          element={
            <PrivateRoute adminOnly>
              <Upload />
            </PrivateRoute>
          }
        />
        <Route
          path="report"
          element={
            <PrivateRoute adminOnly>
              <ReportOutput />
            </PrivateRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <PrivateRoute adminOnly>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="work-view"
          element={
            <PrivateRoute adminOnly>
              <WorkView />
            </PrivateRoute>
          }
        />
        <Route
          path="statistics"
          element={
            <PrivateRoute adminOnly>
              <Statistics />
            </PrivateRoute>
          }
        />
        <Route
          path="employees"
          element={
            <PrivateRoute adminOnly>
              <EmployeeMaster />
            </PrivateRoute>
          }
        />
        <Route
          path="login-check"
          element={
            <PrivateRoute adminOnly>
              <LoginCheck />
            </PrivateRoute>
          }
        />
        <Route
          path="attendance-import"
          element={
            <PrivateRoute adminOnly>
              <AttendanceImport />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
