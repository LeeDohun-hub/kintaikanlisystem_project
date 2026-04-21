import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

function SidebarPhoto({ employeeId }) {
  const [broken, setBroken] = useState(false);
  const size = 72;
  const style = {
    width: size, height: size, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.15)",
    display: "block", margin: "12px auto 0",
    flexShrink: 0,
  };

  if (!employeeId || broken) {
    return (
      <div
        style={{
          ...style,
          background: "rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, color: "rgba(255,255,255,0.3)",
        }}
      >
        {"\u{1F464}"}
      </div>
    );
  }
  return (
    <img
      src={`/api/employees/${employeeId}/photo`}
      alt=""
      onError={() => setBroken(true)}
      style={{ ...style, objectFit: "cover" }}
    />
  );
}

const EMPLOYEE_NAV = [
  { to: "/work-input",   label: "勤怠入力" },
  { to: "/work-history", label: "勤務履歴" },
  { to: "/board",        label: "掲示板" },
  { to: "/messenger",    label: "社内メッセージ" },
  { to: "/vacation",     label: "休暇申請" },
];

const ADMIN_NAV = [
  { to: "/menu",            label: "メニュー" },
  { to: "/employees",       label: "社員マスタ入力" },
  { to: "/login-check",     label: "ログイン確認" },
  { to: "/upload",          label: "EXCELアップロード" },
  { to: "/report",          label: "勤怠履歴" },
  { to: "/board",           label: "掲示板" },
  { to: "/messenger",       label: "社内メッセージ" },
  { to: "/vacation-manage", label: "休暇申請管理" },
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
          <SidebarPhoto employeeId={user?.id} />
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
