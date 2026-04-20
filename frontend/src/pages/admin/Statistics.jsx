import React, { useState, useEffect } from "react";
import api from "../../api/api";
import MonthPickerCard from "../../components/MonthPickerCard";
import EmployeeWorkMinutesTable from "../../components/EmployeeWorkMinutesTable";
import { useYearMonthState } from "../../hooks/useYearMonthState";
import { formatWorkMinutes } from "../../utils/formatWorkMinutes";

function sortByWorkMinutesDesc(rows) {
  return [...(rows || [])].sort(
    (a, b) => (b.totalWorkMinutes || 0) - (a.totalWorkMinutes || 0),
  );
}

function Statistics() {
  const [month, setMonth] = useYearMonthState();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setLoading(true);
    api
      .get(`/statistics/monthly?month=${month}`)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError("統計を読み込めませんでした。");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const sortedRows = data ? sortByWorkMinutesDesc(data.byEmployee) : [];
  const activeCount = data?.byEmployee?.length ?? 0;
  const hasWork =
    data &&
    (data.totalWorkMinutes > 0 || (data.byEmployee && data.byEmployee.length > 0));

  return (
    <div className="page-container">
      <h2 className="page-title">統計</h2>
      <p className="page-subtitle">
        月次の勤務時間集計です。必要に応じて PDF レポートを発行できます。
      </p>

      <MonthPickerCard label="表示月" month={month} onChange={setMonth}>
        <button
          type="button"
          className="primary"
          onClick={() =>
            window.open(`/api/reports/monthly.pdf?month=${month}`, "_blank")
          }
        >
          月次レポート PDF
        </button>
      </MonthPickerCard>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="card loading-hint">読み込み中です…</div>
      ) : data ? (
        <>
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="stat-tile-label">総労働時間</div>
              <div className="stat-tile-value">
                {formatWorkMinutes(data.totalWorkMinutes)}
              </div>
              <div className="stat-tile-sub">{data.month} の合計</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile-label">集計対象人数</div>
              <div className="stat-tile-value">{activeCount}</div>
              <div className="stat-tile-sub">勤務記録が 1 件以上ある社員</div>
            </div>
          </div>

          <div className="card section-card">
            <h3 className="section-title">社員別の合計勤務時間</h3>
            <p className="section-desc">
              勤務時間が多い順に並べています。社員コード昇順が必要な場合は PDF をご利用ください。
            </p>
            {hasWork ? (
              <EmployeeWorkMinutesTable
                rows={sortedRows}
                caption={`${data.month} / ${sortedRows.length} 名`}
                emptyMessage="該当月に勤務記録がありません。"
              />
            ) : (
              <p className="empty-hint" style={{ margin: 0 }}>
                該当月の勤務記録はまだありません。
              </p>
            )}
          </div>
        </>
      ) : (
        !error && <div className="card loading-hint">データがありません。</div>
      )}
    </div>
  );
}

export default Statistics;
