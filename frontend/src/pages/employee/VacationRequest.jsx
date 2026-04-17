import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/api";
import BackToMenuLink from "../../components/BackToMenuLink";

const TYPE_LABEL = { FULL: "全休", HALF_AM: "午前半休", HALF_PM: "午後半休" };
const STATUS_LABEL = { PENDING: "申請中", APPROVED: "承認済", REJECTED: "却下" };
const STATUS_COLOR = {
  PENDING:  { background: "#fff8e1", color: "#b45309", border: "1px solid #fde68a" },
  APPROVED: { background: "#e8fff4", color: "#065f46", border: "1px solid #a3dcc4" },
  REJECTED: { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" },
};

function StatusBadge({ status }) {
  const style = STATUS_COLOR[status] || {};
  return (
    <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, ...style }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function VacationRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({ vacationType: "FULL", vacationDate: today(), reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/vacations/my")
      .then((r) => setRequests(r.data || []))
      .catch(() => setError("申請一覧の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      await api.post("/vacations", {
        vacationType: form.vacationType,
        vacationDate: form.vacationDate,
        reason: form.reason.trim() || undefined,
      });
      setSuccessMsg("休暇申請を送信しました。管理者の承認をお待ちください。");
      setForm({ vacationType: "FULL", vacationDate: today(), reason: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "申請に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async (requestId) => {
    if (!window.confirm("この申請をキャンセルしますか？")) return;
    setError("");
    setSuccessMsg("");
    try {
      await api.delete(`/vacations/${requestId}`);
      setSuccessMsg("申請をキャンセルしました。");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "キャンセルに失敗しました。");
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">休暇申請</h2>
      <p className="page-subtitle">
        連続した日程の場合は日付ごとに個別に申請してください。
        申請中の申請は管理者が承認するまでキャンセルできます。
      </p>

      {error && <div className="error-msg">{error}</div>}
      {successMsg && (
        <div className="error-msg" style={{ color: "#067d4a", background: "#e8fff4", border: "1px solid #a3dcc4" }}>
          {successMsg}
        </div>
      )}

      {/* 申請フォーム */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>新規申請</h3>
        <form onSubmit={onSubmit}>
          <div className="form-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>休暇区分</label>
              <select name="vacationType" value={form.vacationType} onChange={onChange}>
                <option value="FULL">全休</option>
                <option value="HALF_AM">午前半休</option>
                <option value="HALF_PM">午後半休</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>休暇日</label>
              <input
                type="date"
                name="vacationDate"
                value={form.vacationDate}
                onChange={onChange}
                min={today()}
                required
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 200px" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>申請理由（任意）</label>
              <input
                name="reason"
                value={form.reason}
                onChange={onChange}
                placeholder="理由を入力（任意）"
                maxLength={500}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? "申請中…" : "申請する"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 申請一覧 */}
      <div className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>申請履歴</h3>
        {loading ? (
          <p>読み込み中…</p>
        ) : requests.length === 0 ? (
          <p style={{ color: "#888", margin: 0 }}>申請履歴がありません。</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>休暇日</th>
                <th>区分</th>
                <th>申請理由</th>
                <th>状態</th>
                <th>承認者</th>
                <th>却下理由</th>
                <th>申請日時</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.requestId}>
                  <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{r.vacationDate}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{TYPE_LABEL[r.vacationType] ?? r.vacationType}</td>
                  <td style={{ maxWidth: 200, wordBreak: "break-word" }}>{r.reason ?? "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.approvedByName ?? "—"}</td>
                  <td style={{ maxWidth: 200, wordBreak: "break-word", color: "#e53e3e" }}>
                    {r.rejectReason ?? "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#888" }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("ja-JP") : ""}
                  </td>
                  <td>
                    {r.status === "PENDING" && (
                      <button
                        type="button"
                        className="secondary"
                        style={{ padding: "3px 12px", fontSize: 12, color: "#e53e3e", borderColor: "#e53e3e" }}
                        onClick={() => onCancel(r.requestId)}
                      >
                        取消
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BackToMenuLink />
    </div>
  );
}
