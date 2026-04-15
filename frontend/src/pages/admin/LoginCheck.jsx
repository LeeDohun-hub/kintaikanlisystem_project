import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { getErrorMessage } from "../../api/error";
import BackToMenuLink from "../../components/BackToMenuLink";

function failureLabel(code) {
  if (!code) return "—";
  const map = {
    BLANK_LOGIN_ID: "ログインID未入力",
    UNKNOWN_LOGIN_ID: "不明なログインID",
    ACCOUNT_INACTIVE: "アカウント無効",
    BAD_PASSWORD: "パスワード不一致",
    ROLE_MISMATCH: "権限不一致",
  };
  return map[code] || code;
}

/** ログインID（職員名）列: ID と紐づく氏名を併記 */
function loginIdWithNameCell(loginId, employeeName) {
  if (!loginId || loginId === "") return "（空）";
  if (employeeName && String(employeeName).trim() !== "") {
    return `${loginId}（${employeeName}）`;
  }
  return loginId;
}

export default function LoginCheck() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get("/admin/login-attempts", { params: { limit: 300 } })
      .then((res) => {
        if (!cancelled) setRows(res.data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "一覧を読み込めませんでした。"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-container">
      <h2 className="page-title">ログイン確認</h2>
      <p className="page-subtitle">
        ログイン成功・失敗の履歴です。監査・不正アクセスの確認に利用してください。
      </p>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <p style={{ margin: 0 }}>読み込み中…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>ログインID</th>
                <th>職員名</th>
                <th>所属</th>
                <th>結果</th>
                <th>失敗理由</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>データがありません。</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.attemptId}>
                    <td>{r.attemptedAt ?? ""}</td>
                    <td style={{ maxWidth: 220, wordBreak: "break-all" }}>
                      {loginIdWithNameCell(r.loginId, r.employeeName)}
                    </td>
                    <td>{r.employeeName?.trim() ? r.employeeName : "—"}</td>
                    <td>{r.department?.trim() ? r.department : "—"}</td>
                    <td>{r.success ? "成功" : "失敗"}</td>
                    <td>{r.success ? "—" : failureLabel(r.failureCode)}</td>
                    <td style={{ maxWidth: 140, wordBreak: "break-all" }}>
                      {r.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <BackToMenuLink />
    </div>
  );
}
