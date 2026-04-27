import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MessengerUnreadProvider } from "./context/MessengerUnreadContext";
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
import Board from "./pages/Board";
import BoardDetail from "./pages/BoardDetail";
import Messenger from "./pages/Messenger";
import VacationRequest from "./pages/employee/VacationRequest";
import VacationAdmin from "./pages/admin/VacationAdmin";
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
  return <MainMenu />;
}

/** 旧 URL /board/:id を /board/post/:id へ */
function LegacyBoardPostRedirect() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";
  if (/^\d+$/.test(String(postId ?? ""))) {
    return <Navigate to={`/board/post/${postId}${suffix}`} replace />;
  }
  return <Navigate to="/board" replace />;
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
      : "/menu"
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
            <MessengerUnreadProvider>
              <Layout />
            </MessengerUnreadProvider>
          </PrivateRoute>
        }
      >
        <Route path="menu" element={<MenuRoute />} />
        <Route path="work-input" element={<WorkInputRoute />} />
        <Route
          path="work-history"
          element={
            <PrivateRoute>
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
        <Route
          path="board/post/:postId"
          element={
            <PrivateRoute>
              <BoardDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="board"
          element={
            <PrivateRoute>
              <Board />
            </PrivateRoute>
          }
        />
        <Route
          path="board/:postId"
          element={
            <PrivateRoute>
              <LegacyBoardPostRedirect />
            </PrivateRoute>
          }
        />
        <Route
          path="messenger"
          element={
            <PrivateRoute>
              <Messenger />
            </PrivateRoute>
          }
        />
        <Route
          path="vacation"
          element={
            <PrivateRoute>
              <VacationRequest />
            </PrivateRoute>
          }
        />
        <Route
          path="vacation-manage"
          element={
            <PrivateRoute adminOnly>
              <VacationAdmin />
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
