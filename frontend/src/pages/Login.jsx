import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const STORAGE_KEY_SAVE = "kintai_login_save";
const STORAGE_KEY_CODE = "kintai_login_employee_code";

function Login() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registeredMsg = location.state?.registered
    ? "会員登録が完了しました。ログインしてください。"
    : "";

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY_SAVE) === "1") {
        setRemember(true);
        const saved = localStorage.getItem(STORAGE_KEY_CODE);
        if (saved) setEmployeeCode(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login({ employeeCode, password, role });
      try {
        if (remember) {
          localStorage.setItem(STORAGE_KEY_SAVE, "1");
          localStorage.setItem(STORAGE_KEY_CODE, employeeCode);
        } else {
          localStorage.removeItem(STORAGE_KEY_SAVE);
          localStorage.removeItem(STORAGE_KEY_CODE);
        }
      } catch {
        /* ignore */
      }
      navigate("/menu");
    } catch {
      setError("スタッフコードまたはパスワードが正しくありません。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split">
      <div className="login-split-left">
        <div className="login-split-left-inner">
          <div className="login-split-logo">
            <img src="/smartee_logo.png" alt="SmarteeJapan" />
          </div>
          <h1>
            勤怠管理を
            <br />
            もっとスマートに。
          </h1>
          <p>
            SmarteeJapanの勤怠管理システムで、チームの働き方をシンプルかつ効率的に管理しましょう。
          </p>
          <div className="login-split-badges">
            <span className="login-split-badge">打刻管理</span>
            <span className="login-split-badge">残業申請</span>
            <span className="login-split-badge">休暇申請</span>
            <span className="login-split-badge">給与計算連携</span>
          </div>
        </div>
      </div>

      <div className="login-split-right">
        <div className="login-split-right-inner">
          <h2 className="login-split-title">おかえりなさい</h2>
          <p className="login-split-sub">
            スタッフコードとパスワードでサインインしてください
          </p>

          {registeredMsg && !error && (
            <div className="success-msg">{registeredMsg}</div>
          )}
          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="login-split-role">
              <label className="login-split-role-item">
                <input
                  type="radio"
                  name="loginRole"
                  value="ADMIN"
                  checked={role === "ADMIN"}
                  onChange={() => setRole("ADMIN")}
                />
                管理者
              </label>
              <label className="login-split-role-item">
                <input
                  type="radio"
                  name="loginRole"
                  value="EMPLOYEE"
                  checked={role === "EMPLOYEE"}
                  onChange={() => setRole("EMPLOYEE")}
                />
                スタッフ
              </label>
            </div>

            <label className="login-split-label" htmlFor="login-employeeCode">
              スタッフコード
            </label>
            <div className="login-split-input-wrap">
              <input
                id="login-employeeCode"
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="例: EMP001"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <label className="login-split-label" htmlFor="login-password">
              パスワード
            </label>
            <div className="login-split-input-wrap">
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力してください"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="login-split-row">
              <label className="login-split-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                ログイン情報を保存する
              </label>
              <button
                type="button"
                className="login-split-forgot"
                onClick={() => window.alert("管理者にお問い合わせください。")}
              >
                パスワードを忘れた方
              </button>
            </div>

            <button
              type="submit"
              className="login-split-btn"
              disabled={loading}
            >
              {loading ? "ログイン中…" : "ログイン"}
            </button>

            <p className="login-split-signup">
              アカウントをお持ちでない方は{" "}
              <Link to="/register">新規登録はこちら</Link>
            </p>

            <p className="login-hint login-hint--compact">
              <span className="login-hint__title">テスト用</span>
              管理者: ADMIN001 / admin123　／　スタッフ: EMP001 / pass123
            </p>
          </form>

          <footer className="login-split-footer">
            &copy; 2026 SmarteeJapan. All rights reserved.
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Login;
