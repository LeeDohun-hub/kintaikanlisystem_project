import React, { useEffect, useMemo, useState } from "react";
import MonthPickerCard from "../components/MonthPickerCard";
import { useYearMonthState } from "../hooks/useYearMonthState";
import BackToMenuLink from "../components/BackToMenuLink";
import { useAuth } from "../context/AuthContext";
import { useEmployees } from "../hooks/useEmployees";
import EmployeePicker from "../components/EmployeePicker";

export default function ReportOutput() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [month, setMonth] = useYearMonthState();
  const { rows: employees, loading: empLoading, error: empError } =
    useEmployees(isAdmin);
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    if (employeeId !== "" || employees.length === 0) return;
    setEmployeeId(employees[0].employeeId);
  }, [isAdmin, employees, employeeId]);

  const pdfUrl = useMemo(() => {
    const qs = new URLSearchParams({ month });
    if (isAdmin && employeeId !== "") qs.set("employeeId", String(employeeId));
    return `/api/reports/monthly.pdf?${qs.toString()}`;
  }, [month, isAdmin, employeeId]);

  return (
    <div className="page-container">
      <h2 className="page-title">帳票出力（PDF）</h2>
      <p className="page-subtitle">
        出力条件（月）を指定して PDF をダウンロードします。
      </p>

      {isAdmin ? (
        <>
          {empError && <div className="error-msg">{empError}</div>}
          <EmployeePicker
            employees={employees}
            value={employeeId}
            onChange={setEmployeeId}
            disabled={empLoading}
            helper="管理者は社員を選択して、その社員の月次 PDF を出力できます。"
          />
        </>
      ) : null}

      <MonthPickerCard label="出力月" month={month} onChange={setMonth}>
        <button
          type="button"
          className="primary"
          onClick={() =>
            window.open(pdfUrl, "_blank")
          }
        >
          PDF ダウンロード
        </button>
      </MonthPickerCard>

      <BackToMenuLink />
    </div>
  );
}

