import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
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

  // step: "credentials" | "totp" | "setup"
  const [step, setStep] = useState("credentials");
  const [totpCode, setTotpCode] = useState("");

  // 初回セットアップ用
  const [setupData, setSetupData] = useState(null); // { secret, qrUri, setupToken }
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [setupCode, setSetupCode] = useState("");

  const { login, verifyTotp, enrollTotp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY_SAVE) === "1") {
        setRemember(true);
        const saved = localStorage.getItem(STORAGE_KEY_LOGIN_ID);
        if (saved) setLoginId(saved);
      }
    } catch { /* ignore */ }
  }, []);

  // QR コードを DataURL として生成
  useEffect(() => {
    if (setupData?.qrUri) {
      QRCode.toDataURL(setupData.qrUri, {
        width: 260,
        margin: 2,
        errorCorrectionLevel: "Q",
        color: { dark: "#000000", light: "#ffffff" },
      }).then((url) => setQrDataUrl(url));
    }
  }, [setupData]);

  const saveRemember = () => {
    try {
      if (remember) {
        localStorage.setItem(STORAGE_KEY_SAVE, "1");
        localStorage.setItem(STORAGE_KEY_LOGIN_ID, loginId);
      } else {
        localStorage.removeItem(STORAGE_KEY_SAVE);
        localStorage.removeItem(STORAGE_KEY_LOGIN_ID);
      }
    } catch { /* ignore */ }
  };

  // Step1: ID/PW 送信
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login({ loginId, password, role });

      if (result.requireTotpSetup) {
        // 初回セットアップ必須
        setSetupData({
          secret: result.setupSecret,
          qrUri: result.setupQrUri,
          setupToken: result.setupToken,
        });
        setSetupCode("");
        setStep("setup");
        return;
      }

      if (result.requireTotp) {
        // 既存 TOTP コード入力
        setTotpCode("");
        setStep("totp");
        return;
      }

      saveRemember();
      navigate(result.role === "ADMIN" ? "/menu" : "/work-input");
    } catch {
      setError("ログインIDまたはパスワードが正しくありません。");
    } finally {
      setLoading(false);
    }
  };

  // Step2a: 既存 TOTP コード検証
  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await verifyTotp(totpCode);
      saveRemember();
      navigate(user.role === "ADMIN" ? "/menu" : "/work-input");
    } catch {
      setError("認証コードが正しくありません。Authenticatorアプリをご確認ください。");
    } finally {
      setLoading(false);
    }
  };

  // Step2b: 初回セットアップ完了
  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await enrollTotp(setupCode, setupData?.setupToken);
      saveRemember();
      navigate(user.role === "ADMIN" ? "/menu" : "/work-input");
    } catch {
      setError("認証コードが正しくありません。アプリのコードをご確認ください。");
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep("credentials");
    setError("");
    setTotpCode("");
    setSetupCode("");
    setSetupData(null);
    setQrDataUrl("");
  };

  return (
    <div className="login-split">
      {/* ── 左パネル ── */}
      <div className="login-split-left">
        <div className="login-split-left-inner">
          <div className="login-split-logo">
            <img src="/smartee_logo.png" alt="SmarteeJapan" />
          </div>
          <h1>勤怠管理を<br />もっとスマートに。</h1>
          <p>SmarteeJapanの勤怠管理システムで、チームの働き方をシンプルかつ効率的に管理しましょう。</p>
          <div className="login-split-badges">
            <span className="login-split-badge">打刻管理</span>
            <span className="login-split-badge">残業申請</span>
            <span className="login-split-badge">休暇申請</span>
            <span className="login-split-badge">給与計算連携</span>
          </div>
        </div>
      </div>

      {/* ── 右パネル ── */}
      <div className="login-split-right">
        <div className="login-split-right-inner">

          {/* ===== Step1: ID / PW ===== */}
          {step === "credentials" && (
            <>
              <h2 className="login-split-title">おかえりなさい</h2>
              <p className="login-split-sub">ログインIDとパスワードでサインインしてください</p>

              {error && <div className="error-msg">{error}</div>}

              <form onSubmit={handleCredentialsSubmit}>
                <div className="login-split-role">
                  <label className="login-split-role-item">
                    <input type="radio" name="loginRole" value="ADMIN"
                      checked={role === "ADMIN"} onChange={() => setRole("ADMIN")} />
                    管理者
                  </label>
                  <label className="login-split-role-item">
                    <input type="radio" name="loginRole" value="EMPLOYEE"
                      checked={role === "EMPLOYEE"} onChange={() => setRole("EMPLOYEE")} />
                    スタッフ
                  </label>
                </div>

                <label className="login-split-label" htmlFor="login-loginId">ログインID</label>
                <div className="login-split-input-wrap">
                  <input id="login-loginId" type="text" value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="例: ADMIN001 または 00000001"
                    required autoComplete="username" autoFocus />
                </div>

                <label className="login-split-label" htmlFor="login-password">パスワード</label>
                <div className="login-split-input-wrap">
                  <input id="login-password" type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力してください"
                    required autoComplete="current-password" />
                </div>

                <div className="login-split-row">
                  <label className="login-split-remember">
                    <input type="checkbox" checked={remember}
                      onChange={(e) => setRemember(e.target.checked)} />
                    ログイン情報を保存する
                  </label>
                  <button type="button" className="login-split-forgot"
                    onClick={() => window.alert("管理者にお問い合わせください。")}>
                    パスワードを忘れた方
                  </button>
                </div>

                <button type="submit" className="login-split-btn" disabled={loading}>
                  {loading ? "ログイン中…" : "ログイン"}
                </button>

                <p className="login-split-signup login-split-signup--muted">
                  アカウントの作成・変更は管理者が行います。
                </p>
                <p className="login-hint login-hint--compact">
                  <span className="login-hint__title">テスト用</span>
                  管理者: ADMIN001 / 1234　／　スタッフ: 00000001 / 12345678
                </p>
              </form>
            </>
          )}

          {/* ===== Step2a: 既存 TOTP コード入力 ===== */}
          {step === "totp" && (
            <>
              <h2 className="login-split-title">2段階認証</h2>
              <p className="login-split-sub">Authenticatorアプリに表示された6桁のコードを入力してください</p>

              {error && <div className="error-msg">{error}</div>}

              <form onSubmit={handleTotpSubmit}>
                <label className="login-split-label" htmlFor="totp-code">認証コード</label>
                <div className="login-split-input-wrap">
                  <input id="totp-code" type="text" inputMode="numeric"
                    pattern="[0-9]{6}" maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000" required autoFocus autoComplete="one-time-code"
                    className="totp-input" />
                </div>

                <button type="submit" className="login-split-btn"
                  disabled={loading || totpCode.length !== 6}>
                  {loading ? "確認中…" : "確認"}
                </button>

                <button type="button" className="login-split-forgot"
                  style={{ display: "block", marginTop: 12 }}
                  onClick={backToCredentials}>
                  ← ログイン画面に戻る
                </button>
              </form>
            </>
          )}

          {/* ===== Step2b: 初回 2FA セットアップ ===== */}
          {step === "setup" && (
            <>
              <h2 className="login-split-title">2段階認証の設定</h2>
              <p className="login-split-sub">
                アカウントを保護するため、Authenticatorアプリの設定が必要です。
              </p>

              {error && <div className="error-msg">{error}</div>}

              <div className="login-setup-steps">
                <p className="login-setup-step-label">
                  <strong>手順1.</strong>&nbsp;
                  Authenticatorアプリを開いて「＋」→「その他のアカウント」→「QRコードをスキャン」を選択し、下のコードを読み取ってください。
                </p>

                <div className="login-setup-qr-wrap">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="2FA QR Code"
                      className="login-setup-qr-img" width={260} height={260} />
                  ) : (
                    <div className="login-setup-qr-placeholder">生成中…</div>
                  )}
                </div>

                <div className="login-setup-manual">
                  <p className="login-setup-manual-label">QRコードが読み取れない場合は手動で入力：</p>
                  <code className="login-setup-secret">{setupData?.secret}</code>
                </div>

                <p className="login-setup-step-label" style={{ marginTop: 14 }}>
                  <strong>手順2.</strong>&nbsp;
                  アプリに表示された<strong>6桁のコード</strong>を入力してください。
                </p>
              </div>

              <form onSubmit={handleSetupSubmit}>
                <div className="login-split-input-wrap">
                  <input type="text" inputMode="numeric" pattern="[0-9]{6}"
                    maxLength={6} value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000" required autoComplete="one-time-code"
                    className="totp-input" />
                </div>

                <button type="submit" className="login-split-btn"
                  disabled={loading || setupCode.length !== 6}>
                  {loading ? "設定中…" : "設定を完了してログイン"}
                </button>

                <button type="button" className="login-split-forgot"
                  style={{ display: "block", marginTop: 12 }}
                  onClick={backToCredentials}>
                  ← ログイン画面に戻る
                </button>
              </form>
            </>
          )}

          <footer className="login-split-footer">
            &copy; 2026 SmarteeJapan. All rights reserved.
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Login;
