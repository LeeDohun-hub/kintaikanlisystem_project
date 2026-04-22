import React, { useId } from "react";

/**
 * @param {object} props
 * @param {string} props.label — 凡例タイトル
 * @param {string|number} props.centerText — 中央表示（例: "12.3%" や "45"）
 * @param {number} props.percent — 弧の長さ 0–100（超過分はクリップ可）
 * @param {string} [props.color] — アーク色
 * @param {string} [props.subtitle] — 中央下の補足
 * @param {string} [props.formula] — ホバー時に表示する計算式（複数行可）
 */
export default function DonutChart({
  label,
  centerText,
  percent,
  color = "#3498db",
  subtitle,
  formula,
}) {
  const uid = useId();
  const tipId = useId();
  const r = 40;
  const stroke = 10;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const dash = (p / 100) * c;

  const chartBody = (
    <>
      <div className="donut-chart-label">{label}</div>
      <svg width={112} height={100} viewBox="0 0 112 100" className="donut-chart-svg">
        <defs>
          <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <g transform="translate(56,50)">
          <circle
            r={r}
            fill="none"
            stroke="#e8ecf1"
            strokeWidth={stroke}
            transform="rotate(-90)"
          />
          <circle
            r={r}
            fill="none"
            stroke={`url(#${uid}-g)`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90)"
          />
        </g>
        <text
          x="56"
          y="52"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-chart-center"
        >
          {centerText}
        </text>
      </svg>
      {subtitle ? <div className="donut-chart-sub">{subtitle}</div> : null}
    </>
  );

  if (!formula) {
    return (
      <div className="donut-chart" role="img" aria-label={`${label}: ${centerText}`}>
        {chartBody}
      </div>
    );
  }

  return (
    <div
      className="donut-chart-hover-wrap"
      tabIndex={0}
      aria-describedby={tipId}
    >
      <div className="donut-chart" role="img" aria-label={`${label}: ${centerText}`}>
        {chartBody}
      </div>
      <div id={tipId} className="donut-chart-tooltip" role="tooltip">
        <div className="donut-chart-tooltip-header">計算式</div>
        <pre className="donut-chart-tooltip-pre">{formula}</pre>
      </div>
    </div>
  );
}
