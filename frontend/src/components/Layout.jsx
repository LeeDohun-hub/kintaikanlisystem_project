import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">근태관리시스템</div>
          <div className="sidebar-user">{user?.name}</div>
          <span className={`role-badge ${user?.role === 'ADMIN' ? 'admin' : 'employee'}`}>
            {user?.role === 'ADMIN' ? '관리자' : '직원'}
          </span>
        </div>

        <nav className="sidebar-nav">
          {user?.role === 'EMPLOYEE' && (
            <>
              <NavLink to="/work-input" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                근무 입력
              </NavLink>
              <NavLink to="/work-history" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                근무 이력
              </NavLink>
            </>
          )}
          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                대시보드
              </NavLink>
              <NavLink to="/work-view" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                근무 조회
              </NavLink>
              <NavLink to="/statistics" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                통계
              </NavLink>
              <NavLink to="/revenue" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                매출/손익
              </NavLink>
              <NavLink to="/cashflow" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                캐시플로우
              </NavLink>
            </>
          )}
        </nav>

        <button type="button" onClick={handleLogout} className="logout-btn">로그아웃</button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
