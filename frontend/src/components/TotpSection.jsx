import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function TotpSection() {
  const [enabled, setEnabled] = useState(null);
  const [mode, setMode] = useState("idle"); // "idle" | "disable"
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await api.get("/auth/totp/status");
      setEnabled(res.data.enabled);
    } catch {
      setEnabled(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const submitDisable = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/auth/totp/disable", { totpCode: code });
      setMsg("2段階認証をリセットしました。次回ログイン時に再設定が必要です。");
      setEnabled(false);
      setMode("idle");
      setCode("");
    } catch (ex) {
      setErr(ex.response?.data?.error || "認証コードが正しくありません。");
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setMode("idle");
    setCode("");
    setErr("");
    setMsg("");
  };

  if (enabled === null) {
    return <p className="layout-modal-hint">読み込み中…</p>;
  }

  return (
    <div className="totp-section">
      <div className="totp-status-row">
        <span className={`totp-badge ${enabled ? "totp-badge--on" : "totp-badge--off"}`}>
          {enabled ? "有効" : "未設定"}
        </span>
        <span className="layout-modal-hint" style={{ marginLeft: 10 }}>
          {enabled
            ? "ログイン時にAuthenticatorアプリのコードが必要です。"
            : "次回ログイン時に設定が必要です。"}
        </span>
      </div>

      {msg && <p className="layout-modal-success" style={{ marginTop: 8 }}>{msg}</p>}
      {err && <p className="layout-modal-error" style={{ marginTop: 8 }}>{err}</p>}

      {mode === "idle" && enabled && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="secondary" onClick={() => { setMode("disable"); setErr(""); setMsg(""); setCode(""); }}>
            デバイス変更（2FA をリセット）
          </button>
          <p className="layout-modal-hint" style={{ marginTop: 6 }}>
            スマートフォンを変更する場合はリセットしてください。次回ログイン時に再設定が必要になります。
          </p>
        </div>
      )}

      {mode === "disable" && (
        <div className="totp-setup-block">
          <p className="layout-modal-hint" style={{ marginTop: 10 }}>
            現在のAuthenticatorアプリのコードを入力してリセットします。
          </p>
          <form onSubmit={submitDisable} style={{ marginTop: 10 }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required
              autoFocus
              autoComplete="one-time-code"
              className="totp-code-input"
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="submit" className="secondary" disabled={loading || code.length !== 6}>
                {loading ? "処理中…" : "リセット"}
              </button>
              <button type="button" className="secondary" onClick={cancel} disabled={loading}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
