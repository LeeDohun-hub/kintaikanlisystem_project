import React, { useMemo } from "react";
import DonutChart from "./DonutChart";

function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((1000 * part) / total) / 10;
}

function toHours(mins) {
  const m = Number(mins ?? 0);
  if (!Number.isFinite(m)) return 0;
  return Math.round((m / 60) * 10) / 10; // 0.1h
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

  const warnings = useMemo(() => {
    if (!summary) return [];
    const overtimeMin = summary.totalOvertimeMinutes ?? 0;
    const holidayWorkMin = summary.totalHolidayWorkMinutes ?? 0;
    const otH = toHours(overtimeMin);
    const otPlusHolH = toHours(overtimeMin + holidayWorkMin);

    const list = [];

    // 基本上限（36協定の原則上限）
    if (otH > 45) {
      list.push({
        level: "warn",
        title: "時間外労働が月45時間超（原則上限）",
        body:
          `現在: 約${otH}時間。原則として時間外労働は月45時間・年360時間が上限です。` +
          "（特別条項を適用する場合でも別途要件があります）",
      });
    }

    // 割増賃金（60時間超）
    if (otH > 60) {
      list.push({
        level: "info",
        title: "時間外労働が月60時間超（割増率の引上げ対象）",
        body:
          `現在: 約${otH}時間。月60時間を超える時間外労働は割増賃金率の引上げ（50%以上等）が必要になる場合があります。`,
      });
    }

    // 特別条項側でよく参照される線（残業+法定休日の合算）
    if (otPlusHolH >= 100) {
      list.push({
        level: "danger",
        title: "残業＋法定休日労働が月100時間以上の可能性",
        body:
          `残業＋休日労働(合算): 約${otPlusHolH}時間。` +
          "36協定の特別条項を含めても『月100時間未満』等の規制が問題になる場合があります。",
      });
    } else if (otPlusHolH >= 80) {
      list.push({
        level: "warn",
        title: "残業＋法定休日労働が月80時間以上（注意ライン）",
        body:
          `残業＋休日労働(合算): 約${otPlusHolH}時間。` +
          "2〜6ヶ月平均80時間以内などの観点で注意が必要になる場合があります。",
      });
    }

    return list;
  }, [summary]);

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
      {!loading && !error && summary && warnings.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {warnings.map((w, idx) => {
            const palette =
              w.level === "danger"
                ? { bg: "#fff1f2", border: "#fda4af", text: "#9f1239", badge: "#e11d48" }
                : w.level === "warn"
                  ? { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", badge: "#f59e0b" }
                  : { bg: "#eff6ff", border: "#93c5fd", text: "#1e3a8a", badge: "#3b82f6" };
            const label = w.level === "danger" ? "重要" : w.level === "warn" ? "注意" : "参考";
            return (
              <div
                key={idx}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${palette.border}`,
                  background: palette.bg,
                  color: palette.text,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: 2,
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: palette.badge,
                      color: "#fff",
                      lineHeight: 1.4,
                    }}
                  >
                    {label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
                      {w.title}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>{w.body}</div>
                    <div style={{ marginTop: 6, fontSize: 11, opacity: 0.9 }}>
                      ※ 本表示は一般的な目安です。最終的な適用可否は労使協定・業種・例外規定等で変わります。
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && !error && !summary && (
        <div className="month-picker-charts-placeholder">データがありません。</div>
      )}
    </div>
  );
}
