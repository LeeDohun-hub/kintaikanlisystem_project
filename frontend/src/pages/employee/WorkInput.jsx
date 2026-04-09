import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { createWorkTime } from "../../api/worktime";
import { getErrorMessage } from "../../api/error";
import AttendanceImportCard from "../../components/AttendanceImportCard";
import { formatMinutesAsHm, parseHmToMinutes } from "../../utils/timeFormat";

function WorkInput() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    workDate: today,
    startTime: "09:00",
    endTime: "18:00",
    breakHm: "1:00",
    remarks: "",
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    const breakMinutes = parseHmToMinutes(form.breakHm);
    if (Number.isNaN(breakMinutes)) {
      setError("휴식은 H:MM 형식으로 입력하세요. (예: 1:00, 1:30)");
      return;
    }
    if (breakMinutes < 0 || breakMinutes > 24 * 60) {
      setError("휴식 시간이 올바른 범위인지 확인하세요.");
      return;
    }
    try {
      await createWorkTime({
        workDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
        breakMinutes,
        remarks: form.remarks.trim() || undefined,
      });
      setSuccess("근무 정보가 저장되었습니다.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(getErrorMessage(err, "저장에 실패했습니다. 다시 시도해주세요."));
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
      <h2 className="page-title">근무 입력</h2>

      {success && <div className="success-msg">{success}</div>}
      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>근무일 *</label>
              <input
                type="date"
                name="workDate"
                value={form.workDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>시작 시간 *</label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>종료 시간 *</label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>휴식 *</label>
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
            저장
          </button>
        </form>
      </div>

      {user?.role === "ADMIN" && (
        <AttendanceImportCard
          title="CSV/Excel Import (관리자)"
          helperText="XLSX: A社員ID, B勤務日, C開始, D終了, E休憩(分またはH:MM例1:00), F備考(任意) — 1行目ヘッダ"
        />
      )}
    </div>
  );
}

export default WorkInput;
