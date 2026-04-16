import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/api";
import { getErrorMessage } from "../../api/error";
import BackToMenuLink from "../../components/BackToMenuLink";

const PAGE_SIZE = 20;

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
  const [successMsg, setSuccessMsg] = useState("");
  const [clearing, setClearing] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const selectAllRef = useRef(null);

  const load = () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    api
      .get("/admin/login-attempts", { params: { limit: 500 } })
      .then((res) => {
        setRows(res.data || []);
        setPage(1);
        setSelectedIds(new Set());
      })
      .catch((err) => {
        setError(getErrorMessage(err, "一覧を読み込めませんでした。"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  // 현재 페이지의 모든 ID
  const pagedIds = useMemo(() => pagedRows.map((r) => r.attemptId), [pagedRows]);

  const allPageSelected =
    pagedIds.length > 0 && pagedIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    pagedIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = somePageSelected;
  }, [somePageSelected]);

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePageAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pagedIds.forEach((id) => next.delete(id));
      } else {
        pagedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        "ログイン履歴を全件削除します。この操作は取り消せません。よろしいですか？",
      )
    )
      return;
    setClearing(true);
    setError("");
    setSuccessMsg("");
    try {
      await api.delete("/admin/login-attempts");
      setRows([]);
      setPage(1);
      setSelectedIds(new Set());
      setSuccessMsg("ログイン履歴を全件削除しました。");
    } catch (err) {
      setError(getErrorMessage(err, "削除に失敗しました。"));
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `選択した ${ids.length} 件のログイン履歴を削除します。よろしいですか？`,
      )
    )
      return;
    setClearing(true);
    setError("");
    setSuccessMsg("");
    try {
      await api.delete("/admin/login-attempts/batch", { data: ids });
      setSuccessMsg(`${ids.length} 件のログイン履歴を削除しました。`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "削除に失敗しました。"));
      setClearing(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="page-container">
      <h2 className="page-title">ログイン確認</h2>
      <p className="page-subtitle">
        ログイン成功・失敗の履歴です。監査・不正アクセスの確認に利用してください。
      </p>

      {error && <div className="error-msg">{error}</div>}
      {successMsg && (
        <div
          className="error-msg"
          style={{
            color: "#067d4a",
            background: "#e8fff4",
            border: "1px solid #a3dcc4",
          }}
        >
          {successMsg}
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 14, color: "#555" }}>
            {loading
              ? "読み込み中…"
              : `全 ${rows.length} 件${selectedCount > 0 ? `　／　${selectedCount} 件選択中` : ""}`}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary"
              onClick={handleDeleteSelected}
              disabled={clearing || loading || selectedCount === 0}
              style={selectedCount > 0 ? { color: "#c0392b", borderColor: "#c0392b" } : {}}
            >
              {clearing && selectedCount > 0
                ? "削除中…"
                : `選択を削除${selectedCount > 0 ? `（${selectedCount}件）` : ""}`}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleClearAll}
              disabled={clearing || loading || rows.length === 0}
              style={{ color: "#c0392b", borderColor: "#c0392b" }}
            >
              {clearing && selectedCount === 0 ? "削除中…" : "全件初期化"}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ margin: 0 }}>読み込み中…</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePageAll}
                      disabled={pagedIds.length === 0}
                      title="このページを全選択"
                      aria-label="このページを全選択"
                    />
                  </th>
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
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>データがありません。</td>
                  </tr>
                ) : (
                  pagedRows.map((r) => (
                    <tr
                      key={r.attemptId}
                      style={
                        selectedIds.has(r.attemptId)
                          ? { background: "#fef9e7" }
                          : undefined
                      }
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.attemptId)}
                          onChange={() => toggleOne(r.attemptId)}
                          aria-label={`${r.loginId} を選択`}
                        />
                      </td>
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

            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  style={{ minWidth: 36, padding: "4px 8px" }}
                >
                  «
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ minWidth: 36, padding: "4px 8px" }}
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || Math.abs(p - page) <= 2,
                  )
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        style={{ padding: "4px 2px", color: "#888" }}
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={item === page ? "primary" : "secondary"}
                        onClick={() => setPage(item)}
                        style={{ minWidth: 36, padding: "4px 8px" }}
                      >
                        {item}
                      </button>
                    ),
                  )}

                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ minWidth: 36, padding: "4px 8px" }}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  style={{ minWidth: 36, padding: "4px 8px" }}
                >
                  »
                </button>

                <span style={{ fontSize: 13, color: "#666", marginLeft: 4 }}>
                  {page} / {totalPages} ページ
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <BackToMenuLink />
    </div>
  );
}
