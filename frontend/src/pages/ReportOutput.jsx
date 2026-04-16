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

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.employeeId === employeeId) ?? null,
    [employees, employeeId]
  );

  const pdfUrl = useMemo(() => {
    const qs = new URLSearchParams({ month });
    if (isAdmin && employeeId !== "") qs.set("employeeId", String(employeeId));
    const filename =
      isAdmin && selectedEmployee
        ? encodeURIComponent(selectedEmployee.employeeName) + ".pdf"
        : "monthly.pdf";
    return `/api/reports/${filename}?${qs.toString()}`;
  }, [month, isAdmin, employeeId, selectedEmployee]);

  const canPreview = !isAdmin || (isAdmin && employeeId !== "");

  return (
    <div className="page-container">
      <h2 className="page-title">帳票出力（PDF）</h2>
      <p className="page-subtitle">
        出力条件（月・社員）を指定して PDF をプレビュー／ダウンロードできます。
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
          className="secondary"
          disabled={!canPreview || empLoading}
          onClick={() => window.open(pdfUrl, "_blank")}
        >
          新しいタブで開く
        </button>
      </MonthPickerCard>

      {canPreview && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span style={{ fontWeight: 700, color: "#2c3e50", fontSize: 15 }}>
              PDF プレビュー
            </span>
          </div>
          <iframe
            key={pdfUrl}
            src={pdfUrl}
            title="PDF プレビュー"
            style={{
              width: "100%",
              height: "75vh",
              minHeight: 500,
              border: "1px solid #e0e0e0",
              borderRadius: 4,
            }}
          />
        </div>
      )}

      <BackToMenuLink />
    </div>
  );
}

