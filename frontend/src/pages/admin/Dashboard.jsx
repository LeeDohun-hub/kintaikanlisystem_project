import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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

function Dashboard() {
  const [month, setMonth] = useYearMonthState();
  const [empCount, setEmpCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setLoading(true);

    const pEmp = api
      .get("/employees")
      .then((r) => r.data?.length ?? 0)
      .catch(() => null);
    const pStats = api
      .get(`/statistics/monthly?month=${month}`)
      .then((r) => r.data)
      .catch(() => null);

    Promise.all([pEmp, pStats]).then(([cnt, s]) => {
      if (cancelled) return;
      const parts = [];
      if (cnt === null) {
        parts.push("社員一覧を読み込めませんでした。");
        setEmpCount(0);
      } else {
        setEmpCount(cnt);
      }
      if (s === null) {
        parts.push("統計を読み込めませんでした。");
        setStats(null);
      } else {
        setStats(s);
      }
      setError(parts.join(" "));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [month]);

  const topEmployees = stats ? sortByWorkMinutesDesc(stats.byEmployee).slice(0, 5) : [];
  const activeCount = stats?.byEmployee?.length ?? 0;
  const hasStats = stats != null;
  const hasWork =
    hasStats && (stats.totalWorkMinutes > 0 || (stats.byEmployee && stats.byEmployee.length > 0));

  return (
    <div className="page-container">
      <h2 className="page-title">ダッシュボード</h2>
      <p className="page-subtitle">
        登録社員と、選択した月の勤務時間サマリーを一覧できます。
      </p>
      {error && <div className="error-msg">{error}</div>}

      <MonthPickerCard label="基準月" month={month} onChange={setMonth} />

      {loading ? (
        <div className="card loading-hint">読み込み中です…</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="stat-tile-label">登録社員</div>
              <div className="stat-tile-value">{empCount}</div>
              <div className="stat-tile-sub">名（マスタ登録数）</div>
            </div>
            {hasStats && (
              <>
                <div className="stat-tile">
                  <div className="stat-tile-label">当月の総労働時間</div>
                  <div className="stat-tile-value">
                    {formatWorkMinutes(stats.totalWorkMinutes)}
                  </div>
                  <div className="stat-tile-sub">{stats.month} の合計</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-tile-label">勤務記録のある人数</div>
                  <div className="stat-tile-value">{activeCount}</div>
                  <div className="stat-tile-sub">当月に実績がある社員</div>
                </div>
              </>
            )}
          </div>

          <div className="card section-card">
            <h3 className="section-title">当月の勤務（上位表示）</h3>
            <p className="section-desc">
              勤務時間が多い順に最大 5 名まで表示しています。全員分は統計ページで確認できます。
            </p>
            {hasStats && hasWork ? (
              <>
                <EmployeeWorkMinutesTable
                  rows={topEmployees}
                  emptyMessage="該当月に勤務記録がありません。"
                />
                <p style={{ marginTop: 16, marginBottom: 0 }}>
                  <Link className="inline-link" to="/statistics">
                    統計ページで一覧・PDF を開く
                  </Link>
                </p>
              </>
            ) : hasStats ? (
              <p className="empty-hint" style={{ margin: 0 }}>
                該当月の勤務記録はまだありません。
              </p>
            ) : (
              <p className="empty-hint" style={{ margin: 0 }}>
                統計を表示できません。
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
