import React from "react";
import AttendanceImportCard from "../../components/AttendanceImportCard";

function AttendanceImport() {
  return (
    <div className="page-container">
      <h2 className="page-title">勤怠 Excel 取込</h2>
      <AttendanceImportCard
        title="勤怠 Excel 取込"
        helperText="XLSX: A社員ID, B勤務日, C開始, D終了, E休憩（分または H:MM 例 1:00）, F備考（任意）— 1行目ヘッダ"
      />
    </div>
  );
}

export default AttendanceImport;
