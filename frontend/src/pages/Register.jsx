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
      const msg = err.response?.data?.error || '登録に失敗しました。'
      setError(typeof msg === 'string' ? msg : '登録に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container login-container--jobcan">
      <div className="login-brand">
        <img
          src="/smartee_logo.png"
          alt="smartee Japan"
          className="login-brand__img"
        />
      </div>

      <div className="login-box login-box--jobcan">
        <h1>会員登録</h1>
        <p className="login-subtitle">スタッフアカウントのみ登録できます。</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reg-employeeCode">スタッフコード</label>
            <input
              id="reg-employeeCode"
              type="text"
              name="employeeCode"
              value={form.employeeCode}
              onChange={handleChange}
              placeholder="例: emp003"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-name">氏名</label>
            <input
              id="reg-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="氏名"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">パスワード</label>
            <input
              id="reg-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="4文字以上"
              required
              minLength={4}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm">パスワード（確認）</label>
            <input
              id="reg-confirm"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="再入力"
              required
            />
          </div>
          <button type="submit" className="login-btn login-btn--primary" disabled={loading}>
            {loading ? '処理中…' : '登録する'}
          </button>
        </form>

        <p className="login-footer-link login-footer-link--center">
          すでにアカウントをお持ちの方は <Link to="/login">ログイン</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
