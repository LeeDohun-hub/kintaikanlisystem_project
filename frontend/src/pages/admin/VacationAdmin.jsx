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
const STATUS_LABEL = {
  PENDING:               "申請中",
  APPROVED:              "承認済",
  APPROVED_PENDING_PROOF:"承認済（証明待）",
  REJECTED:              "却下",
};
const STATUS_COLOR = {
  PENDING:               { background: "#fff8e1", color: "#b45309", border: "1px solid #fde68a" },
  APPROVED:              { background: "#e8fff4", color: "#065f46", border: "1px solid #a3dcc4" },
  APPROVED_PENDING_PROOF:{ background: "#fff3cd", color: "#856404", border: "1px solid #ffc107" },
  REJECTED:              { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" },
};

const TABS = [
  { key: "",                      label: "すべて" },
  { key: "PENDING",               label: "申請中" },
  { key: "APPROVED",              label: "承認済" },
  { key: "APPROVED_PENDING_PROOF",label: "証明待" },
  { key: "REJECTED",              label: "却下"  },
];

// 遡及対応の休暇タイプ設定（バックエンド VacationType と同期）
const PROXY_CATEGORIES = [
  { key: "ANNUAL",     label: "年次有給休暇", types: [
      { value: "FULL", label: "全休" },
      { value: "HALF_AM", label: "午前半休" },
      { value: "HALF_PM", label: "午後半休" },
  ]},
  { key: "CONDOLENCE", label: "経弔休暇", types: [
      { value: "CONDOLENCE_OWN_MARRIAGE",   label: "本人結婚" },
      { value: "CONDOLENCE_CHILD_MARRIAGE", label: "子供結婚" },
      { value: "CONDOLENCE_SPOUSE_BIRTH",   label: "配偶者出産" },
      { value: "CONDOLENCE_FUNERAL_1ST",    label: "忌引き（近親）" },
      { value: "CONDOLENCE_FUNERAL_2ND",    label: "忌引き（祖父母・兄弟）" },
  ]},
  { key: "MATERNITY",  label: "産休・育休", types: [
      { value: "MATERNITY_PRE",   label: "産前休暇" },
      { value: "MATERNITY_POST",  label: "産後休暇" },
      { value: "CHILDCARE_LEAVE", label: "育児休職" },
  ]},
  { key: "SICK",       label: "病欠", types: [
      { value: "SICK_LEAVE", label: "病欠" },
  ]},
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

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
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // 添付ファイルモーダル
  const [attachModal, setAttachModal]   = useState(null); // { requestIds, employeeName, dateText, hasAttachment }
  const [attachFile, setAttachFile]     = useState(null);
  const [attachBusy, setAttachBusy]     = useState(false);
  const [attachError, setAttachError]   = useState("");

  // 代理申請モーダル
  const [showProxy, setShowProxy]         = useState(false);
  const [proxyEmployees, setProxyEmployees] = useState([]);
  const [proxyCat, setProxyCat]           = useState("ANNUAL");
  const [proxyForm, setProxyForm]         = useState({
    employeeId: "", vacationType: "FULL",
    vacationStartDate: todayStr(), vacationEndDate: todayStr(),
    reason: "", retroReason: "",
  });
  const [proxyBusy, setProxyBusy]         = useState(false);
  const [proxyError, setProxyError]       = useState("");

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

  const onVerifyProof = async (requestIdOrIds) => {
    const ids = Array.isArray(requestIdOrIds) ? requestIdOrIds : [requestIdOrIds];
    if (!window.confirm(`証明書を確認し、この申請を最終承認しますか？（${ids.length}件）`)) return;
    setError(""); setSuccessMsg(""); setActionBusy(true);
    try {
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await api.put(`/vacations/${id}/proof-verify`);
      }
      setSuccessMsg("証明書を確認し、最終承認しました。");
      load(activeTab);
    } catch (err) {
      setError(err.response?.data?.error || "証明書確認に失敗しました。");
    } finally {
      setActionBusy(false);
    }
  };

  const openAttachModal = (group) => {
    const dateText = group.startDate === group.endDate
      ? group.startDate
      : `${group.startDate} ~ ${group.endDate}`;
    setAttachModal({
      requestIds: group.requestIds,
      employeeName: group.sample.employeeName,
      dateText,
      hasAttachment: group.sample.hasAttachment,
      attachmentName: group.sample.attachmentName,
    });
    setAttachFile(null);
    setAttachError("");
    setSuccessMsg("");
  };

  const onAttachSubmit = async (e) => {
    e.preventDefault();
    if (!attachFile) { setAttachError("ファイルを選択してください。"); return; }
    setAttachBusy(true);
    setAttachError("");
    try {
      for (const id of attachModal.requestIds) {
        const fd = new FormData();
        fd.append("file", attachFile);
        // eslint-disable-next-line no-await-in-loop
        await api.post(`/vacations/${id}/admin-attachment`, fd);
      }
      setSuccessMsg("添付ファイルを更新しました。");
      setAttachModal(null);
      load(activeTab);
    } catch (err) {
      setAttachError(err.response?.data?.error || "ファイルのアップロードに失敗しました。");
    } finally {
      setAttachBusy(false);
    }
  };

  const openProxyModal = async () => {
    if (proxyEmployees.length === 0) {
      const res = await api.get("/users").catch(() => ({ data: [] }));
      setProxyEmployees(res.data || []);
    }
    setProxyCat("ANNUAL");
    setProxyForm({ employeeId: "", vacationType: "FULL",
                   vacationStartDate: todayStr(), vacationEndDate: todayStr(),
                   reason: "", retroReason: "" });
    setProxyError("");
    setShowProxy(true);
  };

  const onProxyCatChange = (cat) => {
    setProxyCat(cat);
    const firstType = PROXY_CATEGORIES.find((c) => c.key === cat)?.types[0]?.value ?? "FULL";
    setProxyForm((p) => ({ ...p, vacationType: firstType }));
  };

  const onProxySubmit = async (e) => {
    e.preventDefault();
    if (!proxyForm.employeeId) { setProxyError("社員を選択してください。"); return; }
    setProxyError(""); setProxyBusy(true);
    try {
      await api.post("/vacations/proxy-submit", {
        employeeId: Number(proxyForm.employeeId),
        vacationType: proxyForm.vacationType,
        vacationStartDate: proxyForm.vacationStartDate,
        vacationEndDate: proxyForm.vacationEndDate,
        reason: proxyForm.reason.trim() || undefined,
        retroReason: proxyForm.retroReason.trim() || undefined,
      });
      setSuccessMsg("代理申請が完了しました。");
      setShowProxy(false);
      load(activeTab);
    } catch (err) {
      setProxyError(err.response?.data?.error || "代理申請に失敗しました。");
    } finally {
      setProxyBusy(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const pendingProofCount = requests.filter((r) => r.status === "APPROVED_PENDING_PROOF").length;
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
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #e0e0e0", paddingBottom: 0, flexWrap: "wrap" }}>
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
                <span style={{ marginLeft: 6, background: "#e53e3e", color: "#fff",
                               borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                  {pendingCount}
                </span>
              )}
              {t.key === "APPROVED_PENDING_PROOF" && pendingProofCount > 0 && (
                <span style={{ marginLeft: 6, background: "#856404", color: "#fff",
                               borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                  {pendingProofCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 操作バー */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#555" }}>
            選択: <strong>{selectedIds.size}</strong> 件
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="primary"
              style={{ fontSize: 13, padding: "5px 14px" }}
              onClick={openProxyModal}
            >
              ＋ 代理申請
            </button>
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
                const pending        = r.status === "PENDING";
                const pendingProof   = r.status === "APPROVED_PENDING_PROOF";
                return (
                  <tr key={`${g.key}-${g.startDate}-${g.endDate}`}>
                    <td>
                      <input type="checkbox" checked={groupSelected}
                             onChange={() => toggleGroup(g.requestIds)}
                             aria-label={`select-group-${r.employeeId}-${g.startDate}-${g.endDate}`} />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {r.employeeName}
                      {r.proxy && (
                        <span style={{ marginLeft: 5, fontSize: 10, background: "#e8eaf6", color: "#3949ab",
                                       border: "1px solid #9fa8da", borderRadius: 4, padding: "1px 4px" }}>
                          代理
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                      {rangeText}
                      {g.requestIds.length > 1 && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: "#888" }}>({g.requestIds.length}日)</span>
                      )}
                      {r.retroactive && (
                        <span style={{ marginLeft: 5, fontSize: 10, background: "#fff3cd", color: "#856404",
                                       border: "1px solid #ffc107", borderRadius: 4, padding: "1px 4px" }}>
                          遡及
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{TYPE_LABEL[r.vacationType] ?? r.vacationType}</td>
                    <td style={{ maxWidth: 180, wordBreak: "break-word" }}>
                      {r.reason ?? "—"}
                      {r.retroReason && (
                        <div style={{ fontSize: 11, color: "#856404", marginTop: 2 }}>
                          遡及事由: {r.retroReason}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                      {pendingProof && r.proofDueDate && (
                        <div style={{ fontSize: 11, color: "#856404", marginTop: 2 }}>期限: {r.proofDueDate}</div>
                      )}
                    </td>
                    <td>{r.approvedByName ?? "—"}</td>
                    <td style={{ maxWidth: 180, wordBreak: "break-word", color: "#e53e3e" }}>
                      {r.rejectReason ?? "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#888" }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("ja-JP") : ""}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                        {r.hasAttachment && (
                          <a href={`/api/vacations/${r.requestId}/attachment`}
                             target="_blank" rel="noopener noreferrer"
                             style={{ fontSize: 12, color: "#1a56db", textDecoration: "none" }}
                             title={r.attachmentName}>
                            📎 書類確認
                          </a>
                        )}
                        <button
                          type="button"
                          style={{
                            fontSize: 11, padding: "2px 8px", cursor: "pointer",
                            border: "1px solid #b0b8c8", borderRadius: 4,
                            background: "#f5f7fa", color: "#444",
                            whiteSpace: "nowrap", lineHeight: 1.5,
                          }}
                          onClick={() => openAttachModal(g)}
                        >
                          {r.hasAttachment ? "📎 更新" : "📎 添付"}
                        </button>
                      </div>
                    </td>
                    <td>
                      {pending ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button type="button" className="primary"
                                  style={{ padding: "4px 14px", fontSize: 13 }}
                                  disabled={actionBusy} onClick={() => onApprove(g.requestIds)}>
                            承認
                          </button>
                          <button type="button" className="secondary"
                                  style={{ padding: "4px 14px", fontSize: 13, color: "#e53e3e", borderColor: "#e53e3e" }}
                                  disabled={actionBusy} onClick={() => openRejectModal(g)}>
                            却下
                          </button>
                        </div>
                      ) : pendingProof ? (
                        <button type="button" className="primary"
                                style={{ padding: "4px 14px", fontSize: 12,
                                         background: "#856404", borderColor: "#856404" }}
                                disabled={actionBusy || !r.hasAttachment}
                                title={!r.hasAttachment ? "証明書が未提出です" : ""}
                                onClick={() => onVerifyProof(g.requestIds)}>
                          {r.hasAttachment ? "証明確認" : "証明待ち"}
                        </button>
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

      {/* 添付ファイルモーダル */}
      {attachModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
                   alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
          onClick={() => setAttachModal(null)}
          role="presentation"
        >
          <div
            className="card"
            style={{ maxWidth: 440, width: "100%", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 style={{ marginTop: 0 }}>
              {attachModal.hasAttachment ? "添付ファイルの更新" : "添付ファイルの追加"}
            </h3>
            <p style={{ fontSize: 13, color: "#555", marginTop: 0, marginBottom: 12 }}>
              <strong>{attachModal.employeeName}</strong> ／ {attachModal.dateText}
            </p>

            {attachModal.hasAttachment && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f0f4ff",
                            border: "1px solid #c3d0f5", borderRadius: 6, fontSize: 12, color: "#333" }}>
                現在のファイル: <strong>{attachModal.attachmentName || "（ファイル名不明）"}</strong>
                <br />
                <span style={{ color: "#888" }}>アップロードすると上記ファイルが置き換わります。</span>
              </div>
            )}

            {attachError && (
              <div className="error-msg" style={{ marginBottom: 12 }}>{attachError}</div>
            )}

            <form onSubmit={onAttachSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
                  ファイルを選択 <span style={{ color: "#e53e3e" }}>*</span>
                  <span style={{ fontWeight: 400, marginLeft: 6, color: "#888" }}>
                    （PDF / JPEG / PNG / GIF / WebP、10MB以内）
                  </span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  style={{ fontSize: 13 }}
                  onChange={(e) => {
                    setAttachFile(e.target.files?.[0] ?? null);
                    setAttachError("");
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="submit" className="primary" disabled={attachBusy || !attachFile}>
                  {attachBusy ? "アップロード中…" : (attachModal.hasAttachment ? "上書き保存" : "アップロード")}
                </button>
                <button type="button" className="secondary" disabled={attachBusy}
                        onClick={() => setAttachModal(null)}>
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 代理申請モーダル */}
      {showProxy && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
                      alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
             onClick={() => setShowProxy(false)} role="presentation">
          <div className="card" style={{ maxWidth: 520, width: "100%", margin: 0, maxHeight: "90vh", overflowY: "auto" }}
               onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 style={{ marginTop: 0 }}>管理者代理申請</h3>
            <p style={{ fontSize: 13, color: "#555", marginTop: 0 }}>
              社員本人が申請できない場合に管理者が代わりに申請します。日付制限はありません。即時承認されます。
            </p>
            {proxyError && <div className="error-msg" style={{ marginBottom: 12 }}>{proxyError}</div>}
            <form onSubmit={onProxySubmit}>
              {/* 社員選択 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>
                  対象社員 <span style={{ color: "#e53e3e" }}>*</span>
                </label>
                <select value={proxyForm.employeeId}
                        onChange={(e) => setProxyForm((p) => ({ ...p, employeeId: e.target.value }))}
                        style={{ width: "100%", padding: "6px 10px", fontSize: 13 }}>
                  <option value="">社員を選択してください</option>
                  {proxyEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeName}{emp.department ? ` (${emp.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* カテゴリ */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>休暇カテゴリ</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PROXY_CATEGORIES.map((c) => (
                    <button key={c.key} type="button"
                            onClick={() => onProxyCatChange(c.key)}
                            style={{ padding: "4px 12px", borderRadius: 16, fontSize: 12, cursor: "pointer",
                                     border: proxyCat === c.key ? "2px solid #1a56db" : "1px solid #ccc",
                                     background: proxyCat === c.key ? "#ebf1ff" : "#f9f9f9",
                                     color: proxyCat === c.key ? "#1a56db" : "#555",
                                     fontWeight: proxyCat === c.key ? 700 : 400 }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 区分 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>休暇区分</label>
                <select value={proxyForm.vacationType}
                        onChange={(e) => setProxyForm((p) => ({ ...p, vacationType: e.target.value }))}
                        style={{ width: "100%", padding: "6px 10px", fontSize: 13 }}>
                  {PROXY_CATEGORIES.find((c) => c.key === proxyCat)?.types.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* 日付 */}
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>開始日</label>
                  <input type="date" value={proxyForm.vacationStartDate}
                         onChange={(e) => setProxyForm((p) => ({ ...p, vacationStartDate: e.target.value }))}
                         style={{ width: "100%", padding: "6px 10px", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>終了日</label>
                  <input type="date" value={proxyForm.vacationEndDate}
                         min={proxyForm.vacationStartDate}
                         onChange={(e) => setProxyForm((p) => ({ ...p, vacationEndDate: e.target.value }))}
                         style={{ width: "100%", padding: "6px 10px", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>

              {/* 申請理由 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>申請理由（任意）</label>
                <input value={proxyForm.reason} maxLength={500}
                       onChange={(e) => setProxyForm((p) => ({ ...p, reason: e.target.value }))}
                       placeholder="理由を入力（任意）"
                       style={{ width: "100%", padding: "6px 10px", fontSize: 13, boxSizing: "border-box" }} />
              </div>

              {/* 遡及事由（過去日付の場合は推奨） */}
              {proxyForm.vacationStartDate < todayStr() && (
                <div style={{ marginBottom: 12, padding: "10px 12px", background: "#fff8e1",
                              border: "1px solid #fde68a", borderRadius: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>
                    遡及事由（過去日付のため推奨）
                  </label>
                  <textarea value={proxyForm.retroReason} maxLength={500} rows={2}
                            onChange={(e) => setProxyForm((p) => ({ ...p, retroReason: e.target.value }))}
                            placeholder="遡及申請の経緯を入力してください"
                            style={{ width: "100%", boxSizing: "border-box", padding: "6px 10px",
                                     fontSize: 12, border: "1px solid #ccc", borderRadius: 4,
                                     resize: "vertical", fontFamily: "inherit" }} />
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="submit" className="primary" disabled={proxyBusy}>
                  {proxyBusy ? "申請中…" : "代理申請する（即時承認）"}
                </button>
                <button type="button" className="secondary" disabled={proxyBusy} onClick={() => setShowProxy(false)}>
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
