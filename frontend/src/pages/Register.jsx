import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function Register() {
  const [form, setForm] = useState({
    employeeCode: '',
    name: '',
    department: '',
    hourlyCost: '',
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
      await register({
        employeeCode: form.employeeCode,
        name: form.name,
        department: form.department || undefined,
        hourlyCost: form.hourlyCost === '' ? undefined : Number(form.hourlyCost),
        password: form.password,
        confirmPassword: form.confirmPassword
      })
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
            <label htmlFor="reg-department">所属（任意）</label>
            <input
              id="reg-department"
              type="text"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="例: 開発部"
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-hourly">時給原価（任意）</label>
            <input
              id="reg-hourly"
              type="number"
              name="hourlyCost"
              value={form.hourlyCost}
              onChange={handleChange}
              placeholder="未入力の場合 0"
              min="0"
              step="0.01"
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
