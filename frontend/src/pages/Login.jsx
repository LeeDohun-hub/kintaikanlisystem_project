import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const STORAGE_KEY_SAVE = 'kintai_login_save'
const STORAGE_KEY_CODE = 'kintai_login_employee_code'

function Login() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const registeredMsg = location.state?.registered
    ? '会員登録が完了しました。ログインしてください。'
    : ''

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY_SAVE) === '1') {
        setRemember(true)
        const saved = localStorage.getItem(STORAGE_KEY_CODE)
        if (saved) setEmployeeCode(saved)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(employeeCode, password)
      try {
        if (remember) {
          localStorage.setItem(STORAGE_KEY_SAVE, '1')
          localStorage.setItem(STORAGE_KEY_CODE, employeeCode)
        } else {
          localStorage.removeItem(STORAGE_KEY_SAVE)
          localStorage.removeItem(STORAGE_KEY_CODE)
        }
      } catch {
        /* ignore */
      }
      navigate(user.role === 'ADMIN' ? '/dashboard' : '/work-input')
    } catch {
      setError('スタッフコードまたはパスワードが正しくありません。')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialClick = () => {
    window.alert('現在ご利用いただけません。')
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
        {registeredMsg && !error && <div className="success-msg">{registeredMsg}</div>}
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            className="login-input"
            value={employeeCode}
            onChange={e => setEmployeeCode(e.target.value)}
            placeholder="メールアドレスまたはスタッフコード"
            required
            autoComplete="username"
            autoFocus
          />

          <input
            type="password"
            className="login-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="パスワード"
            required
            autoComplete="current-password"
          />

          <div className="login-options">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <span>ログイン情報を保存する</span>
            </label>
            <button type="button" className="login-link-btn" onClick={() => window.alert('管理者にお問い合わせください。')}>
              パスワードをお忘れの方
            </button>
          </div>

          <button type="submit" className="login-btn login-btn--primary" disabled={loading}>
            {loading ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>

        <div className="login-or" aria-hidden="true">
          <span className="login-or__line" />
          <span className="login-or__text">または</span>
          <span className="login-or__line" />
        </div>

        <div className="login-social">
          <button type="button" className="login-social-btn" onClick={handleSocialClick}>
            <span className="login-social-icon login-social-icon--google" aria-hidden="true">G</span>
            Googleでログイン
          </button>
          <button type="button" className="login-social-btn" onClick={handleSocialClick}>
            <span className="login-social-icon login-social-icon--external" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#666"/>
              </svg>
            </span>
            外部IDでログイン
          </button>
        </div>

        <p className="login-hint login-hint--compact">
          <span className="login-hint__title">テスト用</span>
          管理者: ADMIN001 / admin123　／　スタッフ: EMP001 / pass123
        </p>

        <p className="login-footer-link login-footer-link--center">
          アカウントをお持ちでない方は <Link to="/register">会員登録</Link>
        </p>
      </div>

      <div className="login-page-footer">
        <span className="login-page-footer__lang">Language: 日本語</span>
      </div>
    </div>
  )
}

export default Login
