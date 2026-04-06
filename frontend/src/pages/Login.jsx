import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function Login() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

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
          <div className="hint-row" style={{ marginBottom: 8, color: '#566573', fontWeight: 600 }}>
            개발용 초기 계정 (서버 기동 시 자동 생성)
          </div>
          <div className="hint-row"><strong>관리자</strong> — 직원 코드 <code>admin</code> / 비밀번호 <code>admin123</code></div>
          <div className="hint-row"><strong>직원 샘플</strong> — <code>emp001</code> · <code>emp002</code> / 비밀번호 <code>emp123</code></div>
          <div className="hint-row" style={{ marginTop: 8 }}>신규 직원은 회원가입으로 계정을 만든 뒤 로그인하세요.</div>
        </div>

        <p className="login-footer">
          계정이 없나요? <Link to="/register" className="login-link">회원가입</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
