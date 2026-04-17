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

const TABS = [
  { key: "",         label: "すべて" },
  { key: "PENDING",  label: "申請中" },
  { key: "APPROVED", label: "承認済" },
  { key: "REJECTED", label: "却下"  },
];

function StatusBadge({ status }) {
  const style = STATUS_COLOR[status] || {};
  return (
    <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, ...style }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function VacationAdmin() {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 却下モーダル
  const [rejectModal, setRejectModal] = useState(null); // { requestId, employeeName, vacationDate }
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback((tab) => {
    setLoading(true);
    setError("");
    const url = tab ? `/vacations?status=${tab}` : "/vacations";
    api.get(url)
      .then((r) => setRequests(r.data || []))
      .catch(() => setError("申請一覧の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  const onApprove = async (requestId) => {
    if (!window.confirm("この申請を承認しますか？")) return;
    setError("");
    setSuccessMsg("");
    setActionBusy(true);
    try {
      await api.put(`/vacations/${requestId}/approve`);
      setSuccessMsg("承認しました。");
      load(activeTab);
    } catch (err) {
      setError(err.response?.data?.error || "承認に失敗しました。");
    } finally {
      setActionBusy(false);
    }
  };

  const openRejectModal = (r) => {
    setRejectModal({ requestId: r.requestId, employeeName: r.employeeName, vacationDate: r.vacationDate });
    setRejectReason("");
    setError("");
    setSuccessMsg("");
  };

  const onReject = async () => {
    if (!rejectModal) return;
    setActionBusy(true);
    try {
      await api.put(`/vacations/${rejectModal.requestId}/reject`, { rejectReason });
      setSuccessMsg("却下しました。");
      setRejectModal(null);
      load(activeTab);
    } catch (err) {
      setError(err.response?.data?.error || "却下に失敗しました。");
    } finally {
      setActionBusy(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="page-container">
      <h2 className="page-title">休暇申請管理</h2>
      <p className="page-subtitle">
        社員から届いた休暇申請を確認・承認・却下します。
      </p>

      {error && <div className="error-msg">{error}</div>}
      {successMsg && (
        <div className="error-msg" style={{ color: "#067d4a", background: "#e8fff4", border: "1px solid #a3dcc4" }}>
          {successMsg}
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {/* タブ */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #e0e0e0", paddingBottom: 0 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "8px 18px",
                border: "none",
                borderBottom: activeTab === t.key ? "2px solid #1a56db" : "2px solid transparent",
                background: "none",
                cursor: "pointer",
                fontWeight: activeTab === t.key ? 700 : 400,
                color: activeTab === t.key ? "#1a56db" : "#555",
                fontSize: 14,
              }}
            >
              {t.label}
              {t.key === "PENDING" && pendingCount > 0 && (
                <span style={{
                  marginLeft: 6, background: "#e53e3e", color: "#fff",
                  borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p>読み込み中…</p>
        ) : requests.length === 0 ? (
          <p style={{ color: "#888", margin: 0 }}>該当する申請がありません。</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>社員名</th>
                <th>休暇日</th>
                <th>区分</th>
                <th>申請理由</th>
                <th>状態</th>
                <th>承認者</th>
                <th>却下理由</th>
                <th>申請日時</th>
                <th style={{ minWidth: 160 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.requestId}>
                  <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                  <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{r.vacationDate}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{TYPE_LABEL[r.vacationType] ?? r.vacationType}</td>
                  <td style={{ maxWidth: 180, wordBreak: "break-word" }}>{r.reason ?? "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.approvedByName ?? "—"}</td>
                  <td style={{ maxWidth: 180, wordBreak: "break-word", color: "#e53e3e" }}>
                    {r.rejectReason ?? "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#888" }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("ja-JP") : ""}
                  </td>
                  <td>
                    {r.status === "PENDING" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="primary"
                          style={{ padding: "4px 14px", fontSize: 13 }}
                          disabled={actionBusy}
                          onClick={() => onApprove(r.requestId)}
                        >
                          承認
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: "4px 14px", fontSize: 13, color: "#e53e3e", borderColor: "#e53e3e" }}
                          disabled={actionBusy}
                          onClick={() => openRejectModal(r)}
                        >
                          却下
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BackToMenuLink />

      {/* 却下モーダル */}
      {rejectModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
          onClick={() => setRejectModal(null)}
          role="presentation"
        >
          <div
            className="card"
            style={{ maxWidth: 480, width: "100%", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 style={{ marginTop: 0 }}>申請を却下</h3>
            <p style={{ fontSize: 14, marginTop: 0 }}>
              <strong>{rejectModal.employeeName}</strong> さんの{" "}
              <strong>{rejectModal.vacationDate}</strong> の休暇申請を却下します。
            </p>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 6 }}>
              却下理由（任意）
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="却下理由を入力（任意）"
              rows={3}
              maxLength={500}
              style={{
                width: "100%", boxSizing: "border-box", padding: "8px 12px",
                fontSize: 14, border: "1px solid #ccc", borderRadius: 4,
                resize: "vertical", fontFamily: "inherit", marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary"
                style={{ color: "#e53e3e", borderColor: "#e53e3e" }}
                disabled={actionBusy}
                onClick={onReject}
              >
                {actionBusy ? "処理中…" : "却下する"}
              </button>
              <button type="button" className="secondary" disabled={actionBusy} onClick={() => setRejectModal(null)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
