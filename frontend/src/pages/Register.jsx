import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function Register() {
  const [form, setForm] = useState({
    employeeCode: '',
    name: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      const msg = err.response?.data?.error || '회원가입에 실패했습니다.'
      setError(typeof msg === 'string' ? msg : '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-icon">⏱</div>
        <h1>회원가입</h1>
        <p className="login-subtitle">직원 계정만 등록할 수 있습니다.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>직원 코드</label>
            <input
              type="text"
              name="employeeCode"
              value={form.employeeCode}
              onChange={handleChange}
              placeholder="영문·숫자 (예: emp003)"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="이름"
              required
            />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="4자 이상"
              required
              minLength={4}
            />
          </div>
          <div className="form-group">
            <label>비밀번호 확인</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호 재입력"
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '처리 중...' : '가입하기'}
          </button>
        </form>

        <p className="login-footer-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
