import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const STORAGE_KEY_SAVE = "kintai_login_save";
const STORAGE_KEY_LOGIN_ID = "kintai_login_id";

function Login() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY_SAVE) === "1") {
        setRemember(true);
        const saved = localStorage.getItem(STORAGE_KEY_LOGIN_ID);
        if (saved) setLoginId(saved);
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
      const user = await login({ loginId, password, role });
      try {
        if (remember) {
          localStorage.setItem(STORAGE_KEY_SAVE, "1");
          localStorage.setItem(STORAGE_KEY_LOGIN_ID, loginId);
        } else {
          localStorage.removeItem(STORAGE_KEY_SAVE);
          localStorage.removeItem(STORAGE_KEY_LOGIN_ID);
        }
      } catch {
        /* ignore */
      }
      navigate(user.role === "ADMIN" ? "/menu" : "/work-input");
    } catch {
      setError("ログインIDまたはパスワードが正しくありません。");
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
            ログインIDとパスワードでサインインしてください
          </p>

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

            <label className="login-split-label" htmlFor="login-loginId">
              ログインID
            </label>
            <div className="login-split-input-wrap">
              <input
                id="login-loginId"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="例: ADMIN001 または 00000001"
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

            <p className="login-split-signup login-split-signup--muted">
              アカウントの作成・変更は管理者が行います。
            </p>

            <p className="login-hint login-hint--compact">
              <span className="login-hint__title">テスト用</span>
              管理者: ログインID ADMIN001 / パスワード 1234　／　スタッフ: 00000001 /
              12345678
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
