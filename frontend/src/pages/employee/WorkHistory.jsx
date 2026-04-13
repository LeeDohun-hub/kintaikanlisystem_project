import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import MonthPickerCard from "../../components/MonthPickerCard";
import { useYearMonthState } from "../../hooks/useYearMonthState";
import { useWorkTimeByMonth } from "../../hooks/useWorkTimeByMonth";
import { useAuth } from "../../context/AuthContext";
import { deleteWorkTime, updateWorkTime } from "../../api/worktime";
import { getErrorMessage } from "../../api/error";
import { formatMinutesAsHm, parseHmToMinutes } from "../../utils/timeFormat";

function WorkHistory() {
  const { user } = useAuth();
  const [month, setMonth] = useYearMonthState();
  const { rows, error, refetch } = useWorkTimeByMonth(month);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllRef = useRef(null);

  const isMine = (r) =>
    user != null && Number(r.employeeId) === Number(user.id);

  const mineRows = useMemo(() => rows.filter(isMine), [rows, user]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [month]);

  useEffect(() => {
    const valid = new Set(rows.map((r) => r.workId));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const allMineSelected =
    mineRows.length > 0 && mineRows.every((r) => selectedIds.has(r.workId));
  const selectedMineCount = mineRows.filter((r) =>
    selectedIds.has(r.workId),
  ).length;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate =
      selectedMineCount > 0 && selectedMineCount < mineRows.length;
  }, [selectedMineCount, mineRows.length]);

  const toggleSelect = useCallback((workId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(workId)) next.delete(workId);
      else next.add(workId);
      return next;
    });
  }, []);

  const toggleSelectAllMine = useCallback(() => {
    const mineIds = mineRows.map((r) => r.workId);
    setSelectedIds((prev) => {
      const allOn = mineIds.length > 0 && mineIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOn) {
        mineIds.forEach((id) => next.delete(id));
      } else {
        mineIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [mineRows]);

  const startEdit = (r) => {
    setEditingId(r.workId);
    setFormError("");
    setEditForm({
      workDate: r.workDate,
      startTime: (r.startTime || "").toString().slice(0, 5),
      endTime: (r.endTime || "").toString().slice(0, 5),
      breakHm: formatMinutesAsHm(r.breakMinutes),
      remarks: r.remarks ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setFormError("");
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingId || !editForm) return;
    setFormError("");
    const breakMinutes = parseHmToMinutes(editForm.breakHm);
    if (Number.isNaN(breakMinutes)) {
      setFormError("休憩は H:MM 形式で入力してください。（例: 1:00, 1:30）");
      return;
    }
    if (breakMinutes < 0 || breakMinutes > 24 * 60) {
      setFormError("休憩時間が正しい範囲かご確認ください。");
      return;
    }
    setSaving(true);
    try {
      await updateWorkTime(editingId, {
        workDate: editForm.workDate,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        breakMinutes,
        remarks: editForm.remarks.trim() || undefined,
      });
      cancelEdit();
      refetch();
    } catch (err) {
      setFormError(getErrorMessage(err, "保存に失敗しました。"));
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (workId) => {
    if (!window.confirm("この勤務記録を削除しますか？")) return;
    try {
      await deleteWorkTime(workId);
      if (editingId === workId) cancelEdit();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(workId);
        return next;
      });
      refetch();
    } catch (err) {
      window.alert(getErrorMessage(err, "削除に失敗しました。"));
    }
  };

  const deleteSelected = async () => {
    const ids = mineRows
      .map((r) => r.workId)
      .filter((id) => selectedIds.has(id));
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `選択した ${ids.length} 件の勤務記録を削除しますか？この操作は取り消せません。`,
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    try {
      for (const id of ids) {
        await deleteWorkTime(id);
      }
      if (editingId != null && ids.includes(editingId)) cancelEdit();
      setSelectedIds(new Set());
      refetch();
    } catch (err) {
      window.alert(getErrorMessage(err, "削除に失敗しました。"));
      refetch();
    } finally {
      setBulkDeleting(false);
    }
  };

  const colCount = 9;

  return (
    <div className="page-container">
      <h2 className="page-title">勤務履歴</h2>

      <MonthPickerCard label="表示月" month={month} onChange={setMonth} />

      <div style={{ margin: "8px 0 12px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          className="primary"
          onClick={() =>
            window.open(`/api/reports/monthly.pdf?month=${month}`, "_blank")
          }
        >
          月次レポート PDF
        </button>
        <button
          type="button"
          className="secondary"
          disabled={selectedMineCount === 0 || bulkDeleting}
          onClick={deleteSelected}
        >
          {bulkDeleting
            ? "削除中…"
            : `選択を削除${selectedMineCount > 0 ? `（${selectedMineCount}件）` : ""}`}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 44, textAlign: "center" }}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allMineSelected}
                  onChange={toggleSelectAllMine}
                  disabled={mineRows.length === 0}
                  title="自分の行をすべて選択"
                  aria-label="自分の行をすべて選択"
                />
              </th>
              <th>日付</th>
              <th>始業</th>
              <th>終業</th>
              <th>休憩</th>
              <th>実働(当日)</th>
              <th>実働(累計)</th>
              <th>備考</th>
              <th style={{ minWidth: 140 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount}>データがありません。</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.workId ?? i}
                  style={
                    editingId === r.workId
                      ? { background: "rgba(59, 130, 246, 0.08)" }
                      : undefined
                  }
                >
                  <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                    {isMine(r) ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.workId)}
                        onChange={() => toggleSelect(r.workId)}
                        aria-label={`${r.workDate} を選択`}
                      />
                    ) : (
                      <span style={{ color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td>{r.workDate}</td>
                  <td>{r.startTime}</td>
                  <td>{r.endTime}</td>
                  <td>{formatMinutesAsHm(r.breakMinutes)}</td>
                  <td>{r.dailyWorkHm ?? formatMinutesAsHm(r.workMinutes)}</td>
                  <td>{r.cumulativeWorkHm ?? "—"}</td>
                  <td style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>
                    {r.remarks ?? ""}
                  </td>
                  <td>
                    {isMine(r) ? (
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        <button
                          type="button"
                          className="primary"
                          style={{ padding: "4px 10px", fontSize: 13 }}
                          onClick={() => startEdit(r)}
                        >
                          修正
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: "4px 10px", fontSize: 13 }}
                          onClick={() => removeRow(r.workId)}
                        >
                          削除
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#999", fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editForm && editingId != null && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>選択した行を修正</h3>
          {formError && <div className="error-msg">{formError}</div>}
          <form onSubmit={saveEdit}>
            <div className="form-row">
              <div className="form-group">
                <label>勤務日 *</label>
                <input
                  type="date"
                  name="workDate"
                  value={editForm.workDate}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>開始時刻 *</label>
                <input
                  type="time"
                  name="startTime"
                  value={editForm.startTime}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>終了時刻 *</label>
                <input
                  type="time"
                  name="endTime"
                  value={editForm.endTime}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>休憩 *</label>
                <input
                  type="text"
                  name="breakHm"
                  value={editForm.breakHm}
                  onChange={handleEditChange}
                  placeholder="1:00"
                  required
                  style={{ maxWidth: 120 }}
                />
              </div>
            </div>
            <div className="form-group">
              <label>備考</label>
              <textarea
                name="remarks"
                value={editForm.remarks}
                onChange={handleEditChange}
                rows={3}
                maxLength={500}
                style={{
                  width: "100%",
                  maxWidth: 560,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={cancelEdit}
                disabled={saving}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default WorkHistory;
