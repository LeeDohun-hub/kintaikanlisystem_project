/** 分を勤務表表記 H:MM に変換（累計は24時間超可） */
export function formatMinutesAsHm(totalMinutes) {
  const m = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, "0")}`;
}

/**
 * "H:MM" / "HH:MM" 文字列を分に変換（分は2桁）。
 * @returns {number} 分、形式エラー時は NaN
 */
export function parseHmToMinutes(s) {
  if (s == null || typeof s !== "string") return NaN;
  const t = s.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(mm) || mm < 0 || mm > 59 || h < 0)
    return NaN;
  return h * 60 + mm;
}
