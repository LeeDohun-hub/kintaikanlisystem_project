import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  bulkUpsertWorkTime,
  createWorkTime,
  deleteWorkTime,
  listWorkTimeByMonth,
} from "../../api/worktime";
import { getErrorMessage } from "../../api/error";
import MonthPickerCard from "../../components/MonthPickerCard";
import BackToMenuLink from "../../components/BackToMenuLink";
import EmployeePicker from "../../components/EmployeePicker";
import { useEmployees } from "../../hooks/useEmployees";
import { useYearMonthState } from "../../hooks/useYearMonthState";
import { formatMinutesAsHm, parseHmToMinutes } from "../../utils/timeFormat";

function WorkInput() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { rows: employees, loading: empLoading, error: empError } =
    useEmployees(isAdmin);
  const [employeeId, setEmployeeId] = useState("");
  useEffect(() => {
    if (!isAdmin) return;
    if (employeeId !== "" || employees.length === 0) return;
    setEmployeeId(employees[0].employeeId);
  }, [isAdmin, employees, employeeId]);

  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState("daily"); // daily | monthly
  const [form, setForm] = useState({
    workDate: today,
    startTime: "09:00",
    endTime: "18:00",
    breakHm: "1:00",
    remarks: "",
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // monthly grid
  const [month, setMonth] = useYearMonthState();
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlySaving, setMonthlySaving] = useState(false);
  const [monthlyResult, setMonthlyResult] = useState(null);
  const [monthlyDeletedCount, setMonthlyDeletedCount] = useState(0);
  const [monthlyError, setMonthlyError] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    const breakMinutes = parseHmToMinutes(form.breakHm);
    if (Number.isNaN(breakMinutes)) {
      setError("休憩は H:MM 形式で入力してください。（例: 1:00, 1:30）");
      return;
    }
    if (breakMinutes < 0 || breakMinutes > 24 * 60) {
      setError("休憩時間が正しい範囲かご確認ください。");
      return;
    }
    try {
      await createWorkTime({
        workDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
        breakMinutes,
        remarks: form.remarks.trim() || undefined,
      }, isAdmin ? employeeId : undefined);
      setSuccess("勤務情報を保存しました。");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(getErrorMessage(err, "保存に失敗しました。再度お試しください。"));
    }
  };

  const daysInMonth = useMemo(() => {
    const [y, m] = (month || "").split("-").map((v) => parseInt(v, 10));
    if (!y || !m) return 31;
    return new Date(y, m, 0).getDate();
  }, [month]);

  const dateStrForDay = useMemo(() => {
    const [y, m] = (month || "").split("-");
    const mm = String(m || "").padStart(2, "0");
    return (day) => `${y}-${mm}-${String(day).padStart(2, "0")}`;
  }, [month]);

  const refetchMonthly = async () => {
    setMonthlyError("");
    setMonthlyResult(null);
    setMonthlyLoading(true);
    try {
      const res = await listWorkTimeByMonth(month, isAdmin ? employeeId : undefined);
      const rows = res.data || [];
      const byDate = new Map(rows.map((r) => [r.workDate, r]));

      const next = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const workDate = dateStrForDay(d);
        const existing = byDate.get(workDate);
        next.push({
          _checked: true,
          day: d,
          workDate,
          _workId: existing?.workId ?? null,
          startTime: existing?.startTime?.toString?.().slice(0, 5) || "",
          endTime: existing?.endTime?.toString?.().slice(0, 5) || "",
          breakHm:
            existing?.breakMinutes != null
              ? formatMinutesAsHm(existing.breakMinutes)
              : "1:00",
          remarks: existing?.remarks ?? "",
          _hasExisting: !!existing,
        });
      }
      setMonthlyRows(next);
    } catch (e) {
      setMonthlyRows([]);
      setMonthlyError(getErrorMessage(e, "月データを読み込めませんでした。"));
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "monthly") return;
    refetchMonthly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, month, employeeId]);

  const updateMonthlyCell = (idx, key, value) => {
    setMonthlyRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const setMonthlyCheckedAll = (checked) => {
    setMonthlyRows((prev) => prev.map((r) => ({ ...r, _checked: checked })));
  };

  const selectAllRef = useRef(null);
  const checkedCount = useMemo(
    () => monthlyRows.filter((r) => r._checked).length,
    [monthlyRows],
  );
  const allChecked = monthlyRows.length > 0 && checkedCount === monthlyRows.length;
  const someChecked = checkedCount > 0 && checkedCount < monthlyRows.length;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = someChecked;
  }, [someChecked]);

  const validateMonthlyRow = (r) => {
    if (!r._checked) return { ok: true, skip: true, hasAny: false };
    const hasAny =
      (r.startTime || "").trim() !== "" || (r.endTime || "").trim() !== "";
    if (!hasAny) return { ok: true, skip: false, hasAny: false };
    if (!r.startTime || !r.endTime) {
      return { ok: false, message: "開始/終了を入力してください。", hasAny: true };
    }
    const breakMinutes = parseHmToMinutes(r.breakHm || "");
    if (Number.isNaN(breakMinutes)) {
      return {
        ok: false,
        message: "休憩は H:MM 形式で入力してください。（例: 1:00）",
        hasAny: true,
      };
    }
    if (breakMinutes < 0 || breakMinutes > 24 * 60) {
      return {
        ok: false,
        message: "休憩時間が正しい範囲かご確認ください。",
        hasAny: true,
      };
    }
    const [sh, sm] = r.startTime.split(":").map(Number);
    const [eh, em] = r.endTime.split(":").map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    if (!(startM < endM)) {
      return {
        ok: false,
        message: "開始時刻は終了時刻より前である必要があります。",
        hasAny: true,
      };
    }
    if ((r.remarks || "").length > 500) {
      return { ok: false, message: "備考は500文字以下です。", hasAny: true };
    }
    return { ok: true, skip: false, breakMinutes, hasAny: true };
  };

  const submitMonthly = async () => {
    setMonthlyError("");
    setMonthlyResult(null);
    setMonthlyDeletedCount(0);

    const deleteIds = [];
    const items = [];
    for (const r of monthlyRows) {
      const v = validateMonthlyRow(r);
      if (!v.ok) {
        setMonthlyError(`${r.workDate}: ${v.message}`);
        return;
      }
      if (v.skip) continue;

      // チェック行で開始/終了が空の場合:
      // - 既存データがあれば「削除」として扱う（初期化→保存で勤務を消す要件）
      if (!v.hasAny) {
        if (r._workId != null) deleteIds.push(r._workId);
        continue;
      }

      items.push({
        workDate: r.workDate,
        startTime: r.startTime,
        endTime: r.endTime,
        breakMinutes: v.breakMinutes,
        remarks: (r.remarks || "").trim() || undefined,
      });
    }

    if (items.length === 0 && deleteIds.length === 0) {
      setMonthlyError(
        "チェックされた行がありません。チェックした行のうち、開始/終了が入っている日のみ保存します。",
      );
      return;
    }

    setMonthlySaving(true);
    try {
      if (deleteIds.length > 0) {
        await Promise.all(
          deleteIds.map((id) =>
            deleteWorkTime(id, isAdmin ? employeeId : undefined),
          ),
        );
        setMonthlyDeletedCount(deleteIds.length);
      }
      if (items.length > 0) {
        const res = await bulkUpsertWorkTime(
          { overwriteExisting, items },
          isAdmin ? employeeId : undefined,
        );
        setMonthlyResult(res.data || null);
      } else {
        setMonthlyResult(null);
      }
      await refetchMonthly();
    } catch (e) {
      setMonthlyError(getErrorMessage(e, "月次保存に失敗しました。"));
    } finally {
      setMonthlySaving(false);
    }
  };

  const calcDailyMinutes = () => {
    if (!form.startTime || !form.endTime) return 0;
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    const br = parseHmToMinutes(form.breakHm);
    const breakMins = Number.isNaN(br) ? 0 : br;
    const mins = eh * 60 + em - (sh * 60 + sm) - breakMins;
    return Math.max(0, mins);
  };

  return (
    <div className="page-container">
      <h2 className="page-title">勤務入力</h2>
      {isAdmin ? (
        <>
          {empError && <div className="error-msg">{empError}</div>}
          <EmployeePicker
            employees={employees}
            value={employeeId}
            onChange={setEmployeeId}
            disabled={empLoading}
            helper="管理者は社員を選択して、その社員の勤怠を入力できます。"
          />
        </>
      ) : null}

      {mode === "daily" && success && <div className="success-msg">{success}</div>}
      {mode === "daily" && error && <div className="error-msg">{error}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button
          type="button"
          className={mode === "daily" ? "primary" : "secondary"}
          onClick={() => setMode("daily")}
        >
          日次入力
        </button>
        <button
          type="button"
          className={mode === "monthly" ? "primary" : "secondary"}
          onClick={() => setMode("monthly")}
        >
          月次入力
        </button>
      </div>

      {mode === "daily" ? (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>勤務日 *</label>
                <input
                  type="date"
                  name="workDate"
                  value={form.workDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>開始時刻 *</label>
                <input
                  type="time"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>終了時刻 *</label>
                <input
                  type="time"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>休憩 *</label>
                <input
                  type="text"
                  name="breakHm"
                  value={form.breakHm}
                  onChange={handleChange}
                  placeholder="1:00, 1:30"
                  inputMode="numeric"
                  pattern="\d{1,2}:\d{2}"
                  required
                  autoComplete="off"
                  style={{ maxWidth: 120 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>備考 (任意)</label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                placeholder="納入物・作業内容など"
                style={{ width: "100%", maxWidth: 560, boxSizing: "border-box" }}
              />
            </div>

            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: "#ebf5fb",
                borderRadius: 6,
              }}
            >
              <strong>実働(当日) 参考:</strong>{" "}
              {formatMinutesAsHm(calcDailyMinutes())}{" "}
              <span style={{ color: "#666" }}>(勤務表の H:MM 表記)</span>
            </div>

            <button type="submit" className="primary">
              保存
            </button>
          </form>
        </div>
      ) : (
        <div>
          <MonthPickerCard label="入力月" month={month} onChange={setMonth} />

          {monthlyResult && (
            <div className="success-msg" style={{ marginBottom: 12 }}>
              保存結果: 成功 {monthlyResult.successCount ?? 0} 件 / 更新{" "}
              {monthlyResult.updatedExistingDays ?? 0} 件 / エラー{" "}
              {monthlyResult.errorCount ?? 0} 件
              {monthlyDeletedCount > 0 && (
                <>
                  {" "}
                  / 削除 {monthlyDeletedCount} 件
                </>
              )}
            </div>
          )}
          {!monthlyResult && monthlyDeletedCount > 0 && (
            <div className="success-msg" style={{ marginBottom: 12 }}>
              保存結果: 削除 {monthlyDeletedCount} 件
            </div>
          )}
          {monthlyError && <div className="error-msg">{monthlyError}</div>}

          <div className="card" style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                />
                既存データがある日は上書きする
              </label>
              <span style={{ color: "#666", fontSize: 13 }}>
                {checkedCount}/{monthlyRows.length}
              </span>
              <button
                type="button"
                className="secondary"
                onClick={refetchMonthly}
                disabled={monthlyLoading || monthlySaving}
              >
                再読込
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  // 画面上の入力を初期化（開始/終了を空にする）
                  setMonthlyRows((prev) =>
                    prev.map((r) => ({ ...r, startTime: "", endTime: "" })),
                  );
                }}
                disabled={monthlyLoading || monthlySaving}
              >
                初期化
              </button>
              <button
                type="button"
                className="primary"
                onClick={submitMonthly}
                disabled={monthlyLoading || monthlySaving}
              >
                {monthlySaving ? "保存中…" : "月間を保存"}
              </button>
              <span style={{ color: "#666", fontSize: 13 }}>
                チェックした行のうち、開始/終了が入っている行のみ保存します。
              </span>
            </div>

            {monthlyLoading ? (
              <div style={{ padding: 12, color: "#666" }}>読み込み中…</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) => setMonthlyCheckedAll(e.target.checked)}
                        disabled={monthlyLoading || monthlySaving || monthlyRows.length === 0}
                        aria-label="select all"
                      />
                    </th>
                    <th style={{ width: 84 }}>日付</th>
                    <th style={{ width: 120 }}>開始</th>
                    <th style={{ width: 120 }}>終了</th>
                    <th style={{ width: 120 }}>休憩(H:MM)</th>
                    <th style={{ minWidth: 240 }}>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((r, idx) => (
                    <tr key={r.workDate} style={r._hasExisting ? { background: "rgba(16, 185, 129, 0.06)" } : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!r._checked}
                          onChange={(e) => updateMonthlyCell(idx, "_checked", e.target.checked)}
                        />
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{r.workDate}</td>
                      <td>
                        <input
                          type="time"
                          value={r.startTime}
                          onChange={(e) => updateMonthlyCell(idx, "startTime", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          value={r.endTime}
                          onChange={(e) => updateMonthlyCell(idx, "endTime", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={r.breakHm}
                          onChange={(e) => updateMonthlyCell(idx, "breakHm", e.target.value)}
                          placeholder="1:00"
                          inputMode="numeric"
                          pattern="\d{1,2}:\d{2}"
                          style={{ maxWidth: 110 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={r.remarks}
                          onChange={(e) => updateMonthlyCell(idx, "remarks", e.target.value)}
                          maxLength={500}
                          style={{ width: "100%", minWidth: 220 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {monthlyResult?.errors?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  エラー詳細（行番号は送信した配列の順です）
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {monthlyResult.errors.slice(0, 50).map((e, i) => (
                    <li key={`${e.row}-${i}`}>
                      {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
                {monthlyResult.errors.length > 50 && (
                  <div style={{ color: "#666", marginTop: 6 }}>
                    {monthlyResult.errors.length - 50} 件は省略しました。
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <BackToMenuLink />
    </div>
  );
}

export default WorkInput;
