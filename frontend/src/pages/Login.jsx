import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function Login() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const registeredMsg = location.state?.registered
    ? '회원가입이 완료되었습니다. 로그인해 주세요.'
    : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(employeeCode, password)
      navigate(user.role === 'ADMIN' ? '/dashboard' : '/work-input')
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-icon">⏱</div>
        <h1>근태관리시스템</h1>
        <p className="login-subtitle">Attendance Management System</p>

        {registeredMsg && !error && <div className="success-msg">{registeredMsg}</div>}
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>직원 코드</label>
            <input
              type="text"
              value={employeeCode}
              onChange={e => setEmployeeCode(e.target.value)}
              placeholder="직원 코드를 입력하세요"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="login-hint">
          <div className="hint-title">테스트 계정 안내</div>
          <div className="hint-row">DB에 등록된 직원 코드·비밀번호로 로그인합니다. (시드·실제 DB와 다를 수 있음)</div>
          <div className="hint-row"><strong>관리자:</strong> ADMIN001 / admin123</div>
          <div className="hint-row"><strong>직원:</strong> EMP001 / pass123 · EMP002 / pass123</div>
        </div>

        <p className="login-footer-link">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
