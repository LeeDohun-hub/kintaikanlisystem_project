import React from "react";
import { formatWorkMinutes } from "../utils/formatWorkMinutes";

export default function EmployeeWorkMinutesTable({
  rows,
  emptyMessage = "表示するデータがありません。",
  caption,
}) {
  const list = Array.isArray(rows) ? rows : [];

  if (list.length === 0) {
    return <p className="empty-hint">{emptyMessage}</p>;
  }

  return (
    <div className="table-wrap">
      {caption && <p className="table-caption">{caption}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>社員コード</th>
            <th>氏名</th>
            <th className="col-numeric">合計勤務時間</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.employeeId ?? `${row.employeeCode}-${row.employeeName}`}>
              <td>{row.employeeCode ?? "—"}</td>
              <td>{row.employeeName ?? "—"}</td>
              <td className="col-numeric">
                {formatWorkMinutes(row.totalWorkMinutes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
