import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/api";
import BackToMenuLink from "../../components/BackToMenuLink";
import { useAuth } from "../../context/AuthContext";
import { useLeaveBalance } from "../../hooks/useLeaveBalance";

// ── ラベル定義 ──────────────────────────────────────────────────────
const TYPE_LABEL = {
  FULL: "全休",
  HALF_AM: "午前半休",
  HALF_PM: "午後半休",
  CONDOLENCE_OWN_MARRIAGE:   "慶弔（本人結婚）",
  CONDOLENCE_CHILD_MARRIAGE: "慶弔（子供結婚）",
  CONDOLENCE_SPOUSE_BIRTH:   "慶弔（配偶者出産）",
  CONDOLENCE_FUNERAL_1ST:    "忌引き（近親）",
  CONDOLENCE_FUNERAL_2ND:    "忌引き（祖父母・兄弟）",
  MATERNITY_PRE:    "産前休暇",
  MATERNITY_POST:   "産後休暇",
  CHILDCARE_LEAVE:  "育児休職",
  SICK_LEAVE:       "病欠",
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

// ── 休暇カテゴリ定義 ────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "ANNUAL",
    label: "年次有給休暇",
    desc: "年休残数を消費します。",
    types: [
      { value: "FULL",    label: "全休（1日）" },
      { value: "HALF_AM", label: "午前半休（0.5日）" },
      { value: "HALF_PM", label: "午後半休（0.5日）" },
    ],
  },
  {
    key: "CONDOLENCE",
    label: "経弔休暇",
    desc: "年休残数を消費しません。会社規定に基づく有給の特別休暇です。",
    types: [
      { value: "CONDOLENCE_OWN_MARRIAGE",   label: "本人結婚",           maxDays: 5 },
      { value: "CONDOLENCE_CHILD_MARRIAGE", label: "子供結婚",           maxDays: 1 },
      { value: "CONDOLENCE_SPOUSE_BIRTH",   label: "配偶者出産",         maxDays: 3 },
      { value: "CONDOLENCE_FUNERAL_1ST",    label: "忌引き（親・配偶者・子）", maxDays: 5 },
      { value: "CONDOLENCE_FUNERAL_2ND",    label: "忌引き（祖父母・兄弟）",  maxDays: 3 },
    ],
  },
  {
    key: "MATERNITY",
    label: "産休・育休",
    desc: "法定休暇です。年休残数を消費しません。管理者に別途書類の提出が必要な場合があります。",
    types: [
      { value: "MATERNITY_PRE",   label: "産前休暇（最大6週間）" },
      { value: "MATERNITY_POST",  label: "産後休暇（最大8週間）" },
      { value: "CHILDCARE_LEAVE", label: "育児休職（最大2年）" },
    ],
  },
  {
    key: "SICK",
    label: "病欠",
    desc: "会社独自の病欠休暇です。年休残数を消費しません。年次有給休暇で対応する場合は「年次有給休暇」を選択してください。",
    types: [
      { value: "SICK_LEAVE", label: "病欠" },
    ],
  },
];

// ── ユーティリティ ───────────────────────────────────────────────────
function today() {
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
      groups.push({ key, startDate: r.vacationDate, endDate: r.vacationDate, requestIds: [r.requestId], sample: r });
      continue;
    }
    const lastEnd = parseYmd(last.endDate);
    const cur = parseYmd(r.vacationDate);
    if (sameDay(cur, addDays(lastEnd, 1))) {
      last.endDate = r.vacationDate;
      last.requestIds.push(r.requestId);
    } else {
      groups.push({ key, startDate: r.vacationDate, endDate: r.vacationDate, requestIds: [r.requestId], sample: r });
    }
  }

  return groups.sort((a, b) => parseYmd(b.endDate).getTime() - parseYmd(a.endDate).getTime());
}

// ── コンポーネント ───────────────────────────────────────────────────
function StatusBadge({ status }) {
  const style = STATUS_COLOR[status] || {};
  return (
    <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, ...style }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function LeaveBalancePanel({ balance }) {
  if (!balance) return null;

  if (!balance.granted) {
    return (
      <div style={{ fontSize: 13, color: "#b45309", background: "#fff8e1", border: "1px solid #fde68a", borderRadius: 6, padding: "8px 12px", marginTop: 4 }}>
        入社から6ヶ月経過後（{balance.grantDate}）に年休10日が付与されます。
      </div>
    );
  }

  const mandatory = balance.mandatoryUseDays > 0;
  const mandatoryOk = balance.mandatoryUseSatisfied;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* 残数メイン */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: "#1a56db" }}>
          {balance.remainingDays}
        </span>
        <span style={{ fontSize: 14, color: "#555" }}>日 残</span>
        <span style={{ fontSize: 13, color: "#888" }}>
          （付与 {balance.grantedDays}日 ／ 消化 {balance.usedDays}日）
        </span>
      </div>

      {/* 詳細情報 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: "#7f8c8d" }}>
        {balance.earliestExpiryDate && (
          <span>⏳ 最古付与の消滅日: <strong>{balance.earliestExpiryDate}</strong></span>
        )}
        {balance.nextGrantDate && (
          <span>🔄 次回付与: {balance.nextGrantDate}（+{balance.nextGrantDays}日）</span>
        )}
      </div>

      {/* 義務使用 */}
      {mandatory && (
        <div style={{
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 6,
          background: mandatoryOk ? "#e8fff4" : "#fff8e1",
          border: `1px solid ${mandatoryOk ? "#a3dcc4" : "#fde68a"}`,
          color: mandatoryOk ? "#065f46" : "#b45309",
        }}>
          {mandatoryOk
            ? `✅ 義務使用（年5日）充足済み（今期消化: ${balance.currentPeriodUsed}日）`
            : `⚠️ 義務使用: 今期あと ${(balance.mandatoryUseDays - balance.currentPeriodUsed).toFixed(1)} 日の使用が必要です（今期消化: ${balance.currentPeriodUsed}日 / 目標5日）`
          }
          <span style={{ marginLeft: 8, color: "#999" }}>
            期間: {balance.currentPeriodStart} 〜 {balance.currentPeriodEnd}
          </span>
        </div>
      )}
    </div>
  );
}

export default function VacationRequest() {
  const { user } = useAuth();
  const skipLeaveBalance = user?.role === "ADMIN";
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { balance, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useLeaveBalance(skipLeaveBalance);

  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");

  // URLパラメータから初期カテゴリ・タイプを解決
  const validCategoryKeys = CATEGORIES.map(c => c.key);
  const initialCatKey = (categoryParam && validCategoryKeys.includes(categoryParam)) ? categoryParam : "ANNUAL";
  const initialCat = CATEGORIES.find(c => c.key === initialCatKey);

  const [category, setCategory] = useState(initialCatKey);
  const [form, setForm] = useState({
    vacationType: initialCat?.types[0]?.value ?? "FULL",
    vacationStartDate: today(),
    vacationEndDate: today(),
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);

  const currentCat = CATEGORIES.find((c) => c.key === category);
  const requiresAttachment = category !== "ANNUAL";

  // サイドバードロップダウンからのナビゲーション時にカテゴリを同期
  useEffect(() => {
    const resolved = (categoryParam && validCategoryKeys.includes(categoryParam)) ? categoryParam : "ANNUAL";
    setCategory(resolved);
    const cat = CATEGORIES.find(c => c.key === resolved);
    setForm(p => ({ ...p, vacationType: cat?.types[0]?.value ?? "FULL" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  // カテゴリ変更時にタイプ・ファイルをリセット
  const onCategoryChange = (newCat) => {
    setCategory(newCat);
    const cat = CATEGORIES.find((c) => c.key === newCat);
    const firstType = cat?.types[0]?.value ?? "FULL";
    setForm((p) => ({ ...p, vacationType: firstType }));
    setAttachmentFile(null);
  };

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

  const selectedTypeInfo = currentCat?.types.find((t) => t.value === form.vacationType);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      const reqData = {
        vacationType: form.vacationType,
        vacationStartDate: form.vacationStartDate,
        vacationEndDate: form.vacationEndDate,
        reason: form.reason.trim() || undefined,
      };

      const formData = new FormData();
      formData.append("request", new Blob([JSON.stringify(reqData)], { type: "application/json" }));
      if (attachmentFile) {
        formData.append("file", attachmentFile);
      }

      await api.post("/vacations", formData);
      setSuccessMsg("休暇申請を送信しました。管理者の承認をお待ちください。");
      setForm((p) => ({ ...p, vacationStartDate: today(), vacationEndDate: today(), reason: "" }));
      setAttachmentFile(null);
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
        休暇の種類を選択して申請してください。申請中の申請は管理者が承認するまでキャンセルできます。
      </p>

      {/* 年休残数パネル（年休カテゴリ選択時のみ表示） */}
      {!skipLeaveBalance && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "#2c3e50", marginBottom: 6 }}>年休残数</div>
          {balanceLoading ? (
            <div style={{ fontSize: 14, color: "#888" }}>読み込み中…</div>
          ) : balanceError ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "#b91c1c" }}>{balanceError}</div>
          ) : (
            <LeaveBalancePanel balance={balance} />
          )}
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}
      {successMsg && (
        <div className="error-msg" style={{ color: "#067d4a", background: "#e8fff4", border: "1px solid #a3dcc4" }}>
          {successMsg}
        </div>
      )}

      {/* 申請フォーム */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>新規申請</h3>

        {/* カテゴリ選択 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => onCategoryChange(cat.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: category === cat.key ? "2px solid #1a56db" : "1px solid #ccc",
                background: category === cat.key ? "#ebf1ff" : "#f9f9f9",
                color: category === cat.key ? "#1a56db" : "#555",
                fontWeight: category === cat.key ? 700 : 400,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* カテゴリ説明 */}
        {currentCat && (
          <div style={{ fontSize: 12, color: "#666", background: "#f5f7fa", borderRadius: 6, padding: "6px 10px", marginBottom: 12 }}>
            {currentCat.desc}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="form-row" style={{ gap: 12, flexWrap: "wrap" }}>
            {/* 休暇区分 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>休暇区分</label>
              <select name="vacationType" value={form.vacationType} onChange={onChange}>
                {currentCat?.types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}{t.maxDays ? ` （最大${t.maxDays}日）` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 日付 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>開始日</label>
              <input
                type="date"
                name="vacationStartDate"
                value={form.vacationStartDate}
                onChange={onChange}
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

            {/* 申請理由 */}
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

          {/* 添付書類アップロード（経弔・産休育休・病欠のみ） */}
          {requiresAttachment && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#f0f4ff", border: "1px solid #c7d7f5", borderRadius: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#334", display: "block", marginBottom: 6 }}>
                📎 証明書類の添付（PDF / JPEG / PNG、最大10MB）
              </label>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 13 }}
              />
              {attachmentFile && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#1a56db" }}>
                  選択中: {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(0)} KB)
                  <button
                    type="button"
                    onClick={() => setAttachmentFile(null)}
                    style={{ marginLeft: 8, color: "#e53e3e", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}
                  >
                    ✕ 削除
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 経弔休暇の最大日数ヒント */}
          {selectedTypeInfo?.maxDays && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#b45309", background: "#fff8e1", borderRadius: 6, padding: "5px 10px", border: "1px solid #fde68a" }}>
              ⓘ {selectedTypeInfo.label} の最大取得日数は <strong>{selectedTypeInfo.maxDays}日</strong> です。
            </div>
          )}
        </form>
      </div>

      {/* 申請一覧 */}
      <div className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>申請履歴</h3>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #e0e0e0" }}>
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
                <th>添付書類</th>
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
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.hasAttachment ? (
                        <a
                          href={`/api/vacations/${r.requestId}/attachment`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "#1a56db", textDecoration: "none" }}
                          title={r.attachmentName}
                        >
                          📎 書類
                        </a>
                      ) : "—"}
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
