import React, { useMemo } from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymd(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseYm(month) {
  const [y, m] = String(month || "").split("-").map((v) => Number(v));
  if (!y || !m) return null;
  return { y, m };
}

function cmp(a, b) {
  if (!a || !b) return 0;
  return String(a).localeCompare(String(b));
}

/**
 * Month calendar with range selection (two-click).
 * - First click: start
 * - Second click: end (swap if earlier)
 * - Third click: new start
 */
export default function MonthCalendarRange({
  month, // "YYYY-MM"
  startDate, // "YYYY-MM-DD" | null
  endDate, // "YYYY-MM-DD" | null
  onChange, // ({startDate,endDate}) => void
  disabled = false,
}) {
  const ym = parseYm(month);

  const days = useMemo(() => {
    if (!ym) return [];
    const { y, m } = ym;
    const first = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0).getDate();
    const startDow = first.getDay(); // 0 Sun
    const cells = [];
    // leading blanks
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay; d++) cells.push(ymd(y, m, d));
    // trailing blanks to complete rows (optional)
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const inRange = (date) => {
    if (!date) return false;
    if (!startDate) return false;
    if (!endDate) return date === startDate;
    const lo = cmp(startDate, endDate) <= 0 ? startDate : endDate;
    const hi = cmp(startDate, endDate) <= 0 ? endDate : startDate;
    return cmp(lo, date) <= 0 && cmp(date, hi) <= 0;
  };

  const isEdge = (date) => date && (date === startDate || date === endDate);

  const clickDate = (date) => {
    if (!date || disabled) return;
    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: date, endDate: null });
      return;
    }
    // start exists and end not set
    if (cmp(date, startDate) < 0) {
      onChange({ startDate: date, endDate: startDate });
    } else {
      onChange({ startDate, endDate: date });
    }
  };

  const clear = () => onChange({ startDate: null, endDate: null });

  return (
    <div className="calendar-card">
      <div className="calendar-card-header">
        <div className="calendar-card-title">カレンダー</div>
        <div className="calendar-card-actions">
          {(startDate || endDate) ? (
            <button type="button" className="secondary" onClick={clear} disabled={disabled}>
              フィルタ解除
            </button>
          ) : null}
        </div>
      </div>
      <div className="calendar-card-sub">
        クリックで日付フィルタ、2回クリックで区間選択（開始→終了）。
      </div>

      <div className={"calendar-grid" + (disabled ? " is-disabled" : "")}>
        {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
          <div key={w} className="calendar-dow">{w}</div>
        ))}
        {days.map((date, idx) => (
          <button
            key={date ?? `blank-${idx}`}
            type="button"
            className={
              "calendar-cell" +
              (date == null ? " is-blank" : "") +
              (date != null && inRange(date) ? " is-in-range" : "") +
              (date != null && isEdge(date) ? " is-edge" : "")
            }
            onClick={() => clickDate(date)}
            disabled={disabled || date == null}
            title={date ?? ""}
          >
            {date ? String(Number(date.slice(8, 10))) : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

