import React, { useMemo } from "react";
import DonutChart from "./DonutChart";

function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((1000 * part) / total) / 10;
}

/**
 * @param {object} props
 * @param {object|null} props.metrics — API AdminAttendanceMetricsResponse
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {boolean} [props.hidden] — 未選択などで非表示
 */
export default function AttendanceMetricsCharts({
  metrics,
  loading,
  error,
  hidden = false,
}) {
  const summary = metrics?.summary;

  const { otPct, nightPct, holPct, fatigueVal, fatigueArc } = useMemo(() => {
    const tw = summary?.totalWorkMinutes ?? 0;
    const ot = summary?.totalOvertimeMinutes ?? 0;
    const nw = summary?.totalNightWorkMinutes ?? 0;
    const hw = summary?.totalHolidayWorkMinutes ?? 0;
    const fi = Number(summary?.fatigueIndexMonthly ?? 0);
    return {
      otPct: pct(ot, tw),
      nightPct: pct(nw, tw),
      holPct: pct(hw, tw),
      fatigueVal: fi,
      fatigueArc: Math.min(100, fi),
    };
  }, [summary]);

  const stdMin = metrics?.standardMonthlyMinutes;

  const formulaTexts = useMemo(
    () => ({
      fatigue: `【疲労ポイント】
  月合計（残業時間）×１
＋月合計（休日労働時間）×１．５
＋月合計（深夜労働時間）×１．８
＋（残業の月合計が２７００分＝４５時間を超える分）×０．５
  ※超えないときこの項は０

【疲労指数】
（疲労ポイント ÷ 標準月間労働時間）×１００

標準月間労働時間 ＝ ${stdMin != null ? `${stdMin}` : "（システム既定）"} 分
※ 上の「月合計」はいずれも「分」`,
      overtime: `【残業時間（各日）】
  その日の実働（分）−４８０分（８時間）が正ならその値、０以下なら０

【残業比率】
（月の残業時間の合計 ÷ 月の実働時間の合計）×１００`,
      night: `【深夜労働時間（各日）】
  その日において２２時～翌５時に重なる労働分
  （暦日単位・二重に数えない）

【深夜比率】
（月の深夜労働時間の合計 ÷ 月の実働時間の合計）×１００`,
      holiday: `【休日労働時間（各日）】
  休日勤務と登録された日 → その日の実働（分）
  それ以外の日 → ０

【休日勤務比率】
（上記の月合計 ÷ 月の実働時間の合計）×１００`,
    }),
    [stdMin],
  );

  if (hidden) {
    return (
      <div className="month-picker-charts-panel month-picker-charts-panel--empty">
        <span className="month-picker-charts-placeholder">
          社員を選択すると指標グラフを表示します。
        </span>
      </div>
    );
  }

  return (
    <div className="month-picker-charts-panel">
      <div className="month-picker-charts-title">月次指標</div>
      <p className="month-picker-charts-hint">
        各グラフにカーソルを置く（またはフォーカスする）と計算式が表示されます。
      </p>
      {loading && (
        <div className="month-picker-charts-loading">読み込み中…</div>
      )}
      {error && !loading && (
        <div className="error-msg month-picker-charts-error">{error}</div>
      )}
      {!loading && !error && summary && (
        <div className="donut-chart-grid">
          <div className="metric-donut-block">
            <DonutChart
              label="疲労指数"
              centerText={
                Number.isFinite(fatigueVal) ? fatigueVal.toFixed(1) : "—"
              }
              percent={fatigueArc}
              color="#9b59b6"
              subtitle="基準月比"
              formula={formulaTexts.fatigue}
            />
          </div>
          <div className="metric-donut-block">
            <DonutChart
              label="残業比率"
              centerText={`${otPct}%`}
              percent={otPct}
              color="#e67e22"
              subtitle="実働比"
              formula={formulaTexts.overtime}
            />
          </div>
          <div className="metric-donut-block">
            <DonutChart
              label="深夜比率"
              centerText={`${nightPct}%`}
              percent={nightPct}
              color="#1abc9c"
              subtitle="実働比"
              formula={formulaTexts.night}
            />
          </div>
          <div className="metric-donut-block">
            <DonutChart
              label="休日勤務比率"
              centerText={`${holPct}%`}
              percent={holPct}
              color="#e74c3c"
              subtitle="実働比"
              formula={formulaTexts.holiday}
            />
          </div>
        </div>
      )}
      {!loading && !error && !summary && (
        <div className="month-picker-charts-placeholder">データがありません。</div>
      )}
    </div>
  );
}
