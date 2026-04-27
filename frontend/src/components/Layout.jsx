import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { BOARD_FAVORITE_BOARDS, DEFAULT_BOARD_CATEGORY } from "../constants/boardCategories";
import { useAuth } from "../context/AuthContext";
import { useMessengerUnread } from "../context/MessengerUnreadContext";
import StatusBadge from "./StatusBadge";
import ProfileEditModal from "./ProfileEditModal";
import "./Layout.css";

function TopBarPhoto({ employeeId, photoVersion, onEditClick, size = 40 }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [employeeId, photoVersion]);
  const circlStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.35)",
    display: "block",
    flexShrink: 0,
  };

  const img = (!employeeId || broken) ? (
    <div
      style={{
        ...circlStyle,
        background: "rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.4),
        color: "rgba(255,255,255,0.45)",
      }}
    >
      {"\u{1F464}"}
    </div>
  ) : (
    <img
      src={`/api/employees/${employeeId}/photo?v=${photoVersion}`}
      alt=""
      onError={() => setBroken(true)}
      style={{ ...circlStyle, objectFit: "cover" }}
    />
  );

  return (
    <div className="top-bar-photo-wrap">
      {img}
      <button
        type="button"
        className="top-bar-photo-edit-btn"
        onClick={onEditClick}
        title="プロフィールを編集"
      >
        ✏️
      </button>
    </div>
  );
}

const EMPLOYEE_NAV = [
  { to: "/work-input", label: "勤怠入力", icon: "📝" },
  { to: "/work-history", label: "勤務履歴", icon: "📅" },
  { to: "/board", label: "掲示板", icon: "📌" },
  { to: "/messenger", label: "メッセンジャー", icon: "💬" },
  { to: "/vacation", label: "休暇申請", icon: "🏖" },
];

const ADMIN_NAV = [
  { to: "/menu", label: "メニュー", icon: "🏠" },
  { to: "/employees", label: "社員マスタ入力", icon: "👥" },
  { to: "/login-check", label: "ログイン確認", icon: "🔐" },
  { to: "/upload", label: "EXCELアップロード", icon: "📤" },
  { to: "/report", label: "勤怠履歴", icon: "📊" },
  { to: "/board", label: "掲示板", icon: "📌" },
  { to: "/messenger", label: "メッセンジャー", icon: "💬" },
  { to: "/vacation", label: "休暇申請", icon: "🏖" },
  { to: "/vacation-manage", label: "休暇申請管理", icon: "✅" },
];

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "在席" },
  { value: "ABSENT", label: "退勤" },
  { value: "VACATION", label: "休暇" },
  { value: "OUTING", label: "外出" },
];

function NavBoardDropdown({ panelClass, icon, label }) {
  const [searchParams] = useSearchParams();
  // URL に category がないときは何も選択しない（デフォルト選択なし）
  const currentCat = searchParams.get("category");

  return (
    <div className="nav-board-dropdown-wrap" tabIndex={0}>
      <NavLink to="/board" className={panelClass} end={false}>
        <span className="panel-nav-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="panel-nav-label">{label}</span>
      </NavLink>
      <aside className="nav-board-flyout" aria-label="お気に入りの掲示板">
        <div className="nav-board-flyout-inner">
          <p className="nav-board-flyout-heading">お気に入りの掲示板</p>
          <ul className="nav-board-flyout-list">
            {BOARD_FAVORITE_BOARDS.map((b) => (
              <li key={b.id}>
                <NavLink
                  to={`/board?category=${encodeURIComponent(b.id)}`}
                  className={() =>
                    "nav-board-flyout-link" + (currentCat === b.id ? " is-active" : "")
                  }
                >
                  {b.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

const VACATION_FLYOUT_ITEMS = [
  { key: "ANNUAL",     label: "年次有給休暇" },
  { key: "CONDOLENCE", label: "経弔休暇" },
  { key: "MATERNITY",  label: "産休・育休" },
  { key: "SICK",       label: "病欠" },
];

function NavVacationDropdown({ panelClass, icon, label }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // 休暇申請ページにいるときだけアクティブ項目を判定する
  const isVacationPage = location.pathname === "/vacation";
  const currentCat = isVacationPage ? searchParams.get("category") : null;

  return (
    <div className="nav-board-dropdown-wrap" tabIndex={0}>
      <NavLink to="/vacation" className={panelClass}>
        <span className="panel-nav-icon" aria-hidden="true">{icon}</span>
        <span className="panel-nav-label">{label}</span>
      </NavLink>
      <aside className="nav-board-flyout" aria-label="休暇申請カテゴリ">
        <div className="nav-board-flyout-inner">
          <p className="nav-board-flyout-heading">新規申請</p>
          <ul className="nav-board-flyout-list">
            {VACATION_FLYOUT_ITEMS.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={`/vacation?category=${item.key}`}
                  className={() =>
                    "nav-board-flyout-link" + (currentCat === item.key ? " is-active" : "")
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function StatusSelector({ status, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="status-selector-wrap status-selector-wrap--topbar">
      <button
        type="button"
        className="status-selector-btn status-selector-btn--topbar"
        onClick={() => setOpen((v) => !v)}
        title="ステータスを変更"
      >
        <StatusBadge status={status} size="sm" />
        <span className="status-selector-caret status-selector-caret--topbar">▾</span>
      </button>
      {open && (
        <div className="status-selector-dropdown status-selector-dropdown--topbar">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={"status-selector-item" + (status === opt.value ? " is-active" : "")}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <StatusBadge status={opt.value} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Layout() {
  const { user, logout, changeStatus } = useAuth();
  const { unreadCount } = useMessengerUnread();
  const navigate = useNavigate();
  const [photoVersion, setPhotoVersion] = useState(() => Date.now());
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const openProfileModal = () => setProfileModalOpen(true);
  const closeProfileModal = () => setProfileModalOpen(false);

  const panelClass = ({ isActive }) => "panel-nav-link" + (isActive ? " active" : "");
  const links = user?.role === "ADMIN" ? ADMIN_NAV : EMPLOYEE_NAV;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-brand">
          <NavLink
            to={user?.role === "ADMIN" ? "/menu" : "/work-input"}
            className="top-bar-brand-link"
            title="ホームへ"
          >
            <img src="/smtlogo.png" alt="smartee Japan" className="top-bar-brand-logo" width="168" height="32" />
          </NavLink>
        </div>
        <div className="top-bar-search-wrap">
          <input
            type="search"
            className="top-bar-search"
            placeholder="機能名で絞り込み（準備中）"
            aria-label="検索"
            readOnly
          />
        </div>
        <div className="top-bar-actions">
          <TopBarPhoto
            employeeId={user?.id}
            photoVersion={photoVersion}
            onEditClick={openProfileModal}
            size={40}
          />
          <span className="top-bar-user-name">{user?.name}</span>
          <span className={`top-bar-role-badge ${user?.role === "ADMIN" ? "is-admin" : ""}`}>
            {user?.role === "ADMIN" ? "管理者" : "スタッフ"}
          </span>
          <StatusSelector status={user?.status ?? "PRESENT"} onChange={changeStatus} />
          <button type="button" className="top-bar-logout" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="nav-panel" aria-label="メニュー">
          <nav className="nav-panel-links">
            {links.map(({ to, label, icon }) => {
              if (to === "/board") {
                return <NavBoardDropdown key={to} panelClass={panelClass} icon={icon} label={label} />;
              }
              if (to === "/vacation") {
                return <NavVacationDropdown key={to} panelClass={panelClass} icon={icon} label={label} />;
              }
              if (to === "/messenger") {
                const n = unreadCount > 99 ? "99+" : String(unreadCount);
                return (
                  <NavLink key={to} to={to} className={panelClass} end={to === "/menu"}>
                    <span className="panel-nav-icon" aria-hidden="true">{icon}</span>
                    <span className="panel-nav-label">{label}</span>
                    {unreadCount > 0 ? (
                      <span className="nav-messenger-badge" title={`未読メッセージ ${unreadCount}件`}>
                        {n}
                      </span>
                    ) : null}
                  </NavLink>
                );
              }
              return (
                <NavLink key={to} to={to} className={panelClass} end={to === "/menu"}>
                  <span className="panel-nav-icon" aria-hidden="true">{icon}</span>
                  <span className="panel-nav-label">{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <ProfileEditModal
        open={profileModalOpen}
        onClose={closeProfileModal}
        employeeId={user?.id}
        onPhotoUpdated={() => setPhotoVersion(Date.now())}
      />
    </div>
  );
}

export default Layout;
