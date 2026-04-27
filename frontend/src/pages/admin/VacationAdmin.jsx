import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/api";
import BackToMenuLink from "../../components/BackToMenuLink";

const TYPE_LABEL = {
  FULL: "全休", HALF_AM: "午前半休", HALF_PM: "午後半休",
  CONDOLENCE_OWN_MARRIAGE:   "慶弔（本人結婚）",
  CONDOLENCE_CHILD_MARRIAGE: "慶弔（子供結婚）",
  CONDOLENCE_SPOUSE_BIRTH:   "慶弔（配偶者出産）",
  CONDOLENCE_FUNERAL_1ST:    "忌引き（近親）",
  CONDOLENCE_FUNERAL_2ND:    "忌引き（祖父母・兄弟）",
  MATERNITY_PRE: "産前休暇", MATERNITY_POST: "産後休暇", CHILDCARE_LEAVE: "育児休職",
  SICK_LEAVE: "病欠",
};
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

function parseYmd(s) {
  const [y, m, d] = String(s).split("-").map((n) => Number(n));
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function normalizeField(v) {
  return v == null ? "" : String(v);
}

function buildGroupKey(r) {
  const created = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 16) : "";
  return [
    normalizeField(r.employeeId),
    normalizeField(r.vacationType),
    normalizeField(r.reason),
    normalizeField(r.status),
    normalizeField(r.approvedById),
    normalizeField(r.rejectReason),
    created,
  ].join("|");
}

function groupConsecutiveRequests(list) {
  const sorted = [...list].sort((a, b) => {
    const ad = parseYmd(a.vacationDate).getTime();
    const bd = parseYmd(b.vacationDate).getTime();
    if (ad !== bd) return ad - bd;
    return String(a.requestId).localeCompare(String(b.requestId));
  });

  const groups = [];
  for (const r of sorted) {
    const key = buildGroupKey(r);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({
        key,
        startDate: r.vacationDate,
        endDate: r.vacationDate,
        requestIds: [r.requestId],
        sample: r,
      });
      continue;
    }

    const lastEnd = parseYmd(last.endDate);
    const cur = parseYmd(r.vacationDate);
    if (sameDay(cur, addDays(lastEnd, 1))) {
      last.endDate = r.vacationDate;
      last.requestIds.push(r.requestId);
    } else {
      groups.push({
        key,
        startDate: r.vacationDate,
        endDate: r.vacationDate,
        requestIds: [r.requestId],
        sample: r,
      });
    }
  }

  return groups.sort((a, b) => parseYmd(b.endDate).getTime() - parseYmd(a.endDate).getTime());
}

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
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // 却下モーダル
  const [rejectModal, setRejectModal] = useState(null); // { requestIds, employeeName, dateText }
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback((tab) => {
    setLoading(true);
    setError("");
    const url = tab ? `/vacations?status=${tab}` : "/vacations";
    api.get(url)
      .then((r) => {
        setRequests(r.data || []);
        setSelectedIds(new Set());
      })
      .catch(() => setError("申請一覧の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  const onApprove = async (requestIdOrIds) => {
    const ids = Array.isArray(requestIdOrIds) ? requestIdOrIds : [requestIdOrIds];
    if (!window.confirm(`この申請を承認しますか？（${ids.length}件）`)) return;
    setError("");
    setSuccessMsg("");
    setActionBusy(true);
    try {
      // eslint-disable-next-line no-restricted-syntax
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await api.put(`/vacations/${id}/approve`);
      }
      setSuccessMsg("承認しました。");
      load(activeTab);
    } catch (err) {
      setError(err.response?.data?.error || "承認に失敗しました。");
    } finally {
      setActionBusy(false);
    }
  };

  const openRejectModal = (group) => {
    const dateText = group.startDate === group.endDate
      ? group.startDate
      : `${group.startDate} ~ ${group.endDate}`;
    setRejectModal({ requestIds: group.requestIds, employeeName: group.sample.employeeName, dateText });
    setRejectReason("");
    setError("");
    setSuccessMsg("");
  };

  const onReject = async () => {
    if (!rejectModal) return;
    setActionBusy(true);
    try {
      // eslint-disable-next-line no-restricted-syntax
      for (const id of rejectModal.requestIds) {
        // eslint-disable-next-line no-await-in-loop
        await api.put(`/vacations/${id}/reject`, { rejectReason });
      }
      setSuccessMsg("却下しました。");
      setRejectModal(null);
      load(activeTab);
    } catch (err) {
      setError(err.response?.data?.error || "却下に失敗しました。");
    } finally {
      setActionBusy(false);
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = requests.length > 0 && selectedIds.size === requests.length;
  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (requests.length === 0) return prev;
      if (prev.size === requests.length) return new Set();
      return new Set(requests.map((r) => r.requestId));
    });
  };

  const toggleGroup = (ids) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      if (allIn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const onBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`選択した ${selectedIds.size} 件の申請を削除しますか？`)) return;
    setError("");
    setSuccessMsg("");
    setActionBusy(true);
    try {
      const ids = Array.from(selectedIds);
      // まとめてAPIが無いので順次削除（失敗時に原因が分かりやすい）
      // eslint-disable-next-line no-restricted-syntax
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await api.delete(`/vacations/${id}/admin`);
      }
      setSuccessMsg("選択した申請を削除しました。");
      load(activeTab);
    } catch (err) {
      setError(err.response?.data?.error || "削除に失敗しました。");
    } finally {
      setActionBusy(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const groupedRequests = groupConsecutiveRequests(requests);

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

        {/* 選択操作 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "#555" }}>
            選択: <strong>{selectedIds.size}</strong> 件
          </div>
          <button
            type="button"
            className="secondary"
            style={{ color: "#e53e3e", borderColor: "#e53e3e" }}
            disabled={actionBusy || selectedIds.size === 0}
            onClick={onBulkDelete}
          >
            {actionBusy ? "処理中…" : "選択を削除"}
          </button>
        </div>

        {loading ? (
          <p>読み込み中…</p>
        ) : groupedRequests.length === 0 ? (
          <p style={{ color: "#888", margin: 0 }}>該当する申請がありません。</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="すべて選択"
                  />
                </th>
                <th>社員名</th>
                <th>休暇日</th>
                <th>区分</th>
                <th>申請理由</th>
                <th>状態</th>
                <th>承認者</th>
                <th>却下理由</th>
                <th>申請日時</th>
                <th>添付書類</th>
                <th style={{ minWidth: 160 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {groupedRequests.map((g) => {
                const r = g.sample;
                const rangeText = g.startDate === g.endDate
                  ? g.startDate
                  : `${g.startDate} ~ ${g.endDate}`;
                const groupSelected = g.requestIds.length > 0 && g.requestIds.every((id) => selectedIds.has(id));
                const pending = r.status === "PENDING";
                return (
                  <tr key={`${g.key}-${g.startDate}-${g.endDate}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={groupSelected}
                        onChange={() => toggleGroup(g.requestIds)}
                        aria-label={`select-group-${r.employeeId}-${g.startDate}-${g.endDate}`}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                      {rangeText}
                      {g.requestIds.length > 1 && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: "#888" }}>
                          ({g.requestIds.length}日)
                        </span>
                      )}
                    </td>
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
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.hasAttachment ? (
                        <a
                          href={`/api/vacations/${r.requestId}/attachment`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "#1a56db", textDecoration: "none" }}
                          title={r.attachmentName}
                        >
                          📎 書類確認
                        </a>
                      ) : "—"}
                    </td>
                    <td>
                      {pending ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="primary"
                            style={{ padding: "4px 14px", fontSize: 13 }}
                            disabled={actionBusy}
                            onClick={() => onApprove(g.requestIds)}
                          >
                            承認
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            style={{ padding: "4px 14px", fontSize: 13, color: "#e53e3e", borderColor: "#e53e3e" }}
                            disabled={actionBusy}
                            onClick={() => openRejectModal(g)}
                          >
                            却下
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#888", fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
              <strong>{rejectModal.dateText}</strong> の休暇申請を却下します。
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
