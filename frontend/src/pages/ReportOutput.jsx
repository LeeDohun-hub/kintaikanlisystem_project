import React, { useEffect, useMemo, useState } from "react";
import MonthPickerCard from "../components/MonthPickerCard";
import AttendanceMetricsCharts from "../components/AttendanceMetricsCharts";
import MonthCalendarRange from "../components/MonthCalendarRange";
import { useYearMonthState } from "../hooks/useYearMonthState";
import BackToMenuLink from "../components/BackToMenuLink";
import { useAuth } from "../context/AuthContext";
import { useEmployees } from "../hooks/useEmployees";
import EmployeePicker from "../components/EmployeePicker";
import { useWorkTimeByMonth } from "../hooks/useWorkTimeByMonth";
import { useAttendanceMetrics } from "../hooks/useAttendanceMetrics";
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
  const [dateFilter, setDateFilter] = useState({ startDate: null, endDate: null }); // YYYY-MM-DD

  useEffect(() => {
    if (!isAdmin) return;
    if (employeeId !== "" || employees.length === 0) return;
    setEmployeeId(employees[0].employeeId);
  }, [isAdmin, employees, employeeId]);

  useEffect(() => {
    // 月が変わったらフィルタ解除（別月の選択日が残らないように）
    setDateFilter({ startDate: null, endDate: null });
  }, [month]);

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

  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useAttendanceMetrics(
    month,
    employeeId !== "" ? employeeId : undefined,
    skipHistoryFetch,
  );

  const metricsByWorkId = useMemo(() => {
    const map = new Map();
    (metrics?.rows ?? []).forEach((row) => {
      if (row.workId != null) map.set(Number(row.workId), row);
    });
    return map;
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    if (!metrics) return metrics;
    const { startDate, endDate } = dateFilter || {};
    if (!startDate && !endDate) return metrics;

    const lo = endDate ? (String(startDate) <= String(endDate) ? startDate : endDate) : startDate;
    const hi = endDate ? (String(startDate) <= String(endDate) ? endDate : startDate) : startDate;

    const rows = (metrics.rows || []).filter((r) => {
      const d = r?.workDate;
      if (!d) return false;
      return String(lo) <= String(d) && String(d) <= String(hi);
    });

    const sum = (arr, key) =>
      arr.reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0);

    const totalWorkMinutes = sum(rows, "workMinutes");
    const totalOvertimeMinutes = sum(rows, "overtimeMinutes");
    const totalHolidayWorkMinutes = sum(rows, "holidayWorkMinutes");
    const totalNightWorkMinutes = sum(rows, "nightWorkMinutes");

    const fatiguePointsMonthly =
      totalOvertimeMinutes * 1.0 +
      totalHolidayWorkMinutes * 1.5 +
      totalNightWorkMinutes * 1.8 +
      Math.max(0, totalOvertimeMinutes - 2700) * 0.5;

    const std = Number(metrics.standardMonthlyMinutes) || 0;
    const fatigueIndexMonthly = std > 0 ? (fatiguePointsMonthly / std) * 100.0 : 0;

    return {
      ...metrics,
      rows,
      summary: {
        totalWorkMinutes,
        totalOvertimeMinutes,
        totalHolidayWorkMinutes,
        totalNightWorkMinutes,
        fatiguePointsMonthly: Math.round(fatiguePointsMonthly * 10000) / 10000,
        fatigueIndexMonthly: Math.round(fatigueIndexMonthly * 10000) / 10000,
      },
    };
  }, [metrics, dateFilter]);

  const filteredHistoryRows = useMemo(() => {
    const { startDate, endDate } = dateFilter || {};
    if (!startDate && !endDate) return historyRows;
    const lo = endDate ? (String(startDate) <= String(endDate) ? startDate : endDate) : startDate;
    const hi = endDate ? (String(startDate) <= String(endDate) ? endDate : startDate) : startDate;
    return (historyRows || []).filter((r) => {
      const d = r?.workDate;
      if (!d) return false;
      return String(lo) <= String(d) && String(d) <= String(hi);
    });
  }, [historyRows, dateFilter]);

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

      <div className="month-picker-with-charts">
        <MonthPickerCard label="対象月" month={month} onChange={setMonth} actionsBelow>
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
          {activeTab === TAB_HISTORY ? (
            <MonthCalendarRange
              month={month}
              startDate={dateFilter.startDate}
              endDate={dateFilter.endDate}
              onChange={setDateFilter}
              disabled={skipHistoryFetch}
            />
          ) : null}
        </MonthPickerCard>
        {activeTab === TAB_HISTORY ? (
          <AttendanceMetricsCharts
            metrics={filteredMetrics}
            loading={metricsLoading}
            error={metricsError}
            hidden={isAdmin && employeeId === ""}
          />
        ) : null}
      </div>

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
                  <th className="col-numeric">残業</th>
                  <th className="col-numeric">深夜</th>
                  <th className="col-numeric">休日勤</th>
                  <th>実働(累計)</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryRows.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      {skipHistoryFetch ? "—" : "データがありません。"}
                    </td>
                  </tr>
                ) : (
                  filteredHistoryRows.map((r, i) => (
                    <tr key={r.workId ?? i}>
                      <td>
                        {r.workDate}
                        {metricsByWorkId.get(Number(r.workId))?.holiday ? (
                          <span
                            title="休日勤務日"
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#c0392b",
                              verticalAlign: "middle",
                            }}
                          >
                            休
                          </span>
                        ) : null}
                      </td>
                      <td>{r.startTime}</td>
                      <td>{r.endTime}</td>
                      <td>{formatMinutesAsHm(r.breakMinutes)}</td>
                      <td>
                        {r.dailyWorkHm ?? formatMinutesAsHm(r.workMinutes)}
                      </td>
                      {(() => {
                        const mx = metricsByWorkId.get(Number(r.workId));
                        return (
                          <>
                            <td className="col-numeric">
                              {mx
                                ? formatMinutesAsHm(mx.overtimeMinutes ?? 0)
                                : metricsLoading
                                  ? "…"
                                  : "—"}
                            </td>
                            <td className="col-numeric">
                              {mx
                                ? formatMinutesAsHm(mx.nightWorkMinutes ?? 0)
                                : metricsLoading
                                  ? "…"
                                  : "—"}
                            </td>
                            <td className="col-numeric">
                              {mx
                                ? formatMinutesAsHm(mx.holidayWorkMinutes ?? 0)
                                : metricsLoading
                                  ? "…"
                                  : "—"}
                            </td>
                          </>
                        );
                      })()}
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
