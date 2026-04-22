import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/api";
import BackToMenuLink from "../../components/BackToMenuLink";
import { useLeaveBalance } from "../../hooks/useLeaveBalance";

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseYmd(s) {
  // s: "YYYY-MM-DD"
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
  // createdAt 포함: 같은 연속 날짜라도 "다른 신청"을 합치지 않기 위한 안전장치
  // (구간 신청은 saveAll로 거의 같은 createdAt으로 생성됨)
  const created = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 16) : ""; // 분 단위
  return [
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

  // 화면은 최신이 위로 오도록 endDate 기준 내림차순
  return groups.sort((a, b) => parseYmd(b.endDate).getTime() - parseYmd(a.endDate).getTime());
}

export default function VacationRequest() {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { balance, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useLeaveBalance(false);

  const [form, setForm] = useState({
    vacationType: "FULL",
    vacationStartDate: today(),
    vacationEndDate: today(),
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/vacations/my")
      .then((r) => setRequests(r.data || []))
      .catch(() => setError("申請一覧の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredRequests = activeTab
    ? requests.filter((r) => r.status === activeTab)
    : requests;
  const groupedRequests = groupConsecutiveRequests(filteredRequests);

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
        vacationStartDate: form.vacationStartDate,
        vacationEndDate: form.vacationEndDate,
        reason: form.reason.trim() || undefined,
      });
      setSuccessMsg("休暇申請を送信しました。管理者の承認をお待ちください。");
      setForm({ vacationType: "FULL", vacationStartDate: today(), vacationEndDate: today(), reason: "" });
      load();
      refetchBalance();
    } catch (err) {
      setError(err.response?.data?.error || "申請に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async (requestIdOrIds) => {
    const ids = Array.isArray(requestIdOrIds) ? requestIdOrIds : [requestIdOrIds];
    if (!window.confirm(`この申請をキャンセルしますか？（${ids.length}件）`)) return;
    setError("");
    setSuccessMsg("");
    try {
      // 区간 신청은 여러 건이므로 순차 취소
      // eslint-disable-next-line no-restricted-syntax
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await api.delete(`/vacations/${id}`);
      }
      setSuccessMsg("申請をキャンセルしました。");
      load();
      refetchBalance();
    } catch (err) {
      setError(err.response?.data?.error || "キャンセルに失敗しました。");
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">休暇申請</h2>
      <p className="page-subtitle">
        連続した日程の場合は日付ごとに個別に申請してください。
        申請中の申請は管理者が承認するまでキャンセルできます。承認/却下の結果もここで確認できます。
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: "#2c3e50", marginBottom: 6 }}>年休残数</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2c3e50" }}>
          {balanceLoading ? "読み込み中…" : balanceError ? "—" : (balance?.remainingDays ?? "—")}
        </div>
        {!balanceLoading && !balanceError && balance ? (
          <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 4 }}>
            付与日: {balance?.grantDate ?? "—"} / 使用: {balance?.usedDays ?? "—"} / 付与数: {balance?.grantedDays ?? "—"}
          </div>
        ) : null}
        {balanceError ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "#b91c1c" }}>{balanceError}</div>
        ) : null}
      </div>

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
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>開始日</label>
              <input
                type="date"
                name="vacationStartDate"
                value={form.vacationStartDate}
                onChange={onChange}
                min={today()}
                required
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>終了日</label>
              <input
                type="date"
                name="vacationEndDate"
                value={form.vacationEndDate}
                onChange={onChange}
                min={form.vacationStartDate || today()}
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
        <h3 style={{ marginTop: 0 }}>申請履歴（承認/却下ステータス）</h3>

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
            </button>
          ))}
        </div>

        {loading ? (
          <p>読み込み中…</p>
        ) : groupedRequests.length === 0 ? (
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
              {groupedRequests.map((g) => {
                const r = g.sample;
                const rangeText = g.startDate === g.endDate
                  ? g.startDate
                  : `${g.startDate} ~ ${g.endDate}`;
                return (
                  <tr key={`${g.key}-${g.startDate}-${g.endDate}`}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                      {rangeText}
                      {g.requestIds.length > 1 && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: "#888" }}>
                          ({g.requestIds.length}日)
                        </span>
                      )}
                    </td>
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
                          onClick={() => onCancel(g.requestIds)}
                        >
                          取消
                        </button>
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
    </div>
  );
}
