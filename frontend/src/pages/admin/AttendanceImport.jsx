import React from "react";
import AttendanceImportCard from "../../components/AttendanceImportCard";

function AttendanceImport() {
  return (
    <div className="page-container">
      <h2 className="page-title">근태 Excel Import</h2>
      <AttendanceImportCard
        title="근태 Excel Import"
        helperText="XLSX: A社員ID, B勤務日, C開始, D終了, E休憩(分またはH:MM例1:00), F備考(任意) — 1行目ヘッダ"
      />
    </div>
  );
}

export default AttendanceImport;
