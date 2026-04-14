/** 勤務分数を日本語表記（例: 42時間30分）に整形 */
export function formatWorkMinutes(totalMinutes) {
  if (totalMinutes == null || Number.isNaN(Number(totalMinutes))) {
    return "—";
  }
  const n = Math.floor(Number(totalMinutes));
  if (n <= 0) return "0分";
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}
