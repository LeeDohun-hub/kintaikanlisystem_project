import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

const EMPLOYEE_NAV = [
  { to: "/work-input", label: "근무 입력" },
  { to: "/work-history", label: "근무 이력" },
];

const ADMIN_NAV = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/work-view", label: "근무 조회" },
  { to: "/statistics", label: "통계" },
  { to: "/employees", label: "직원 마스터" },
  { to: "/attendance-import", label: "Excel Import" },
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
          <div className="sidebar-logo">근태관리시스템</div>
          <div className="sidebar-user">{user?.name}</div>
          <span
            className={`role-badge ${user?.role === "ADMIN" ? "admin" : "employee"}`}
          >
            {user?.role === "ADMIN" ? "관리자" : "직원"}
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
          로그아웃
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
