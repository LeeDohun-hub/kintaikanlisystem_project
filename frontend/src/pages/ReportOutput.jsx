import React, { useEffect, useMemo, useState } from "react";
import MonthPickerCard from "../components/MonthPickerCard";
import { useYearMonthState } from "../hooks/useYearMonthState";
import BackToMenuLink from "../components/BackToMenuLink";
import { useAuth } from "../context/AuthContext";
import { useEmployees } from "../hooks/useEmployees";
import EmployeePicker from "../components/EmployeePicker";
import { useWorkTimeByMonth } from "../hooks/useWorkTimeByMonth";
import { formatMinutesAsHm } from "../utils/timeFormat";

const TAB_HISTORY = "history";
const TAB_PDF = "pdf";

export default function ReportOutput() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [month, setMonth] = useYearMonthState();
  const { rows: employees, loading: empLoading, error: empError } =
    useEmployees(isAdmin);
  const [employeeId, setEmployeeId] = useState("");
  const [activeTab, setActiveTab] = useState(TAB_HISTORY);

  useEffect(() => {
    if (!isAdmin) return;
    if (employeeId !== "" || employees.length === 0) return;
    setEmployeeId(employees[0].employeeId);
  }, [isAdmin, employees, employeeId]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.employeeId === employeeId) ?? null,
    [employees, employeeId],
  );

  const skipHistoryFetch = isAdmin && employeeId === "";
  const { rows: historyRows, error: historyError } = useWorkTimeByMonth(
    month,
    employeeId !== "" ? employeeId : undefined,
    skipHistoryFetch,
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

  const tabButtonStyle = (id) => ({
    padding: "10px 20px",
    border: "none",
    borderBottom:
      activeTab === id ? "3px solid #3498db" : "3px solid transparent",
    background: activeTab === id ? "#f0f6fc" : "transparent",
    fontWeight: activeTab === id ? 700 : 500,
    cursor: "pointer",
    color: "#2c3e50",
    fontSize: 15,
    marginBottom: -1,
  });

  return (
    <div className="page-container">
      <h2 className="page-title">勤怠履歴</h2>
      <p className="page-subtitle">
        勤務履歴で社員・月ごとの勤務を確認するか、PDF
        プレビューで月次レポートを表示できます。対象月・社員は両タブで共通です。
      </p>

      {isAdmin ? (
        <>
          {empError && <div className="error-msg">{empError}</div>}
          <EmployeePicker
            employees={employees}
            value={employeeId}
            onChange={setEmployeeId}
            disabled={empLoading}
            helper="表示・PDF 出力の対象となる社員を選びます。"
          />
        </>
      ) : null}

      <MonthPickerCard label="対象月" month={month} onChange={setMonth}>
        {activeTab === TAB_PDF ? (
          <button
            type="button"
            className="secondary"
            disabled={!canPreview || empLoading}
            onClick={() => window.open(pdfUrl, "_blank")}
          >
            新しいタブで開く
          </button>
        ) : null}
      </MonthPickerCard>

      <div
        role="tablist"
        aria-label="勤怠履歴の表示切替"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #dde3ec",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          role="tab"
          id="tab-work-history"
          aria-selected={activeTab === TAB_HISTORY}
          style={tabButtonStyle(TAB_HISTORY)}
          onClick={() => setActiveTab(TAB_HISTORY)}
        >
          勤務履歴
        </button>
        <button
          type="button"
          role="tab"
          id="tab-pdf-preview"
          aria-selected={activeTab === TAB_PDF}
          style={tabButtonStyle(TAB_PDF)}
          onClick={() => setActiveTab(TAB_PDF)}
        >
          PDF プレビュー
        </button>
      </div>

      {activeTab === TAB_HISTORY && (
        <div
          role="tabpanel"
          id="panel-work-history"
          aria-labelledby="tab-work-history"
        >
          {isAdmin && employeeId === "" && !empLoading ? (
            <div className="error-msg" style={{ marginBottom: 12 }}>
              社員を選択すると、その方の勤務履歴を表示します。
            </div>
          ) : null}
          {historyError && <div className="error-msg">{historyError}</div>}
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
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
                {historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      {skipHistoryFetch ? "—" : "データがありません。"}
                    </td>
                  </tr>
                ) : (
                  historyRows.map((r, i) => (
                    <tr key={r.workId ?? i}>
                      <td>{r.workDate}</td>
                      <td>{r.startTime}</td>
                      <td>{r.endTime}</td>
                      <td>{formatMinutesAsHm(r.breakMinutes)}</td>
                      <td>
                        {r.dailyWorkHm ?? formatMinutesAsHm(r.workMinutes)}
                      </td>
                      <td>{r.cumulativeWorkHm ?? "—"}</td>
                      <td style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>
                        {r.remarks ?? ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === TAB_PDF && (
        <div
          role="tabpanel"
          id="panel-pdf-preview"
          aria-labelledby="tab-pdf-preview"
        >
          {!canPreview ? (
            <div className="error-msg">
              社員を選択すると PDF を表示できます。
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{ fontWeight: 700, color: "#2c3e50", fontSize: 15 }}
                >
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
        </div>
      )}

      <BackToMenuLink />
    </div>
  );
}
