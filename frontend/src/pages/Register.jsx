import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function Register() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== password2) {
      setError('비밀번호가 서로 일치하지 않습니다.')
      return
    }
    setLoading(true)
    try {
      const user = await register({
        employeeCode,
        name,
        password,
        ...(email.trim() ? { email: email.trim() } : {})
      })
      navigate(user.role === 'ADMIN' ? '/dashboard' : '/work-input')
    } catch (err) {
      const msg = err.response?.data?.error || '회원가입에 실패했습니다. 입력값을 확인해 주세요.'
      setError(typeof msg === 'string' ? msg : '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box" style={{ width: 420 }}>
        <div className="login-icon">⏱</div>
        <h1>직원 회원가입</h1>
        <p className="login-subtitle">신규 직원 계정을 만듭니다 (일반 직원만)</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>직원 코드</label>
            <input
              type="text"
              value={employeeCode}
              onChange={e => setEmployeeCode(e.target.value)}
              placeholder="로그인에 사용할 코드 (영문·숫자 등)"
              required
              maxLength={20}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="실명"
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label>이메일 (선택)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="미입력 가능"
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="4자 이상"
              required
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>비밀번호 확인</label>
            <input
              type="password"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              placeholder="비밀번호 재입력"
              required
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '처리 중...' : '가입하기'}
          </button>
        </form>

        <p className="login-footer">
          이미 계정이 있나요? <Link to="/login" className="login-link">로그인</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
