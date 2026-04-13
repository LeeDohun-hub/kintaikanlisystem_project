import React from "react";
import MonthPickerCard from "../../components/MonthPickerCard";
import { useYearMonthState } from "../../hooks/useYearMonthState";
import { useWorkTimeByMonth } from "../../hooks/useWorkTimeByMonth";
import { formatMinutesAsHm } from "../../utils/timeFormat";

function WorkView() {
  const [month, setMonth] = useYearMonthState();
  const { rows, error } = useWorkTimeByMonth(month);

  return (
    <div className="page-container">
      <h2 className="page-title">勤務照会（全員）</h2>

      <MonthPickerCard label="表示月" month={month} onChange={setMonth} />

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>社員</th>
              <th>日付</th>
              <th>始業</th>
              <th>終業</th>
              <th>休憩</th>
              <th>実働(当日)</th>
              <th>実働(累計)</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>データがありません。</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.workId ?? i}>
                  <td>{r.employeeName ?? r.employeeCode ?? "-"}</td>
                  <td>{r.workDate}</td>
                  <td>{r.startTime}</td>
                  <td>{r.endTime}</td>
                  <td>{formatMinutesAsHm(r.breakMinutes)}</td>
                  <td>{r.dailyWorkHm ?? formatMinutesAsHm(r.workMinutes)}</td>
                  <td>{r.cumulativeWorkHm ?? "—"}</td>
                  <td style={{ maxWidth: 240, whiteSpace: "pre-wrap" }}>
                    {r.remarks ?? ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WorkView;
