import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

const EMPLOYEE_NAV = [
  { to: "/work-input", label: "勤務入力" },
  { to: "/work-history", label: "勤務履歴" },
];

const ADMIN_NAV = [
  { to: "/dashboard", label: "ダッシュボード" },
  { to: "/work-view", label: "勤務照会" },
  { to: "/statistics", label: "統計" },
  { to: "/employees", label: "従業員マスタ" },
  { to: "/attendance-import", label: "Excel 取込" },
];

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");
  const links = user?.role === "ADMIN" ? ADMIN_NAV : EMPLOYEE_NAV;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">勤怠管理システム</div>
          <div className="sidebar-user">{user?.name}</div>
          <span
            className={`role-badge ${user?.role === "ADMIN" ? "admin" : "employee"}`}
          >
            {user?.role === "ADMIN" ? "管理者" : "スタッフ"}
          </span>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} className={navClass}>
              {label}
            </NavLink>
          ))}
        </nav>

        <button type="button" onClick={handleLogout} className="logout-btn">
          ログアウト
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
