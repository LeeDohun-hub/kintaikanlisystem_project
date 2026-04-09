/** 분 단위를 근무표 표기 H:MM 으로 변환 (累計는 24시간 초과 가능) */
export function formatMinutesAsHm(totalMinutes) {
  const m = Math.max(0, Math.floor(Number(totalMinutes) || 0))
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}:${String(mm).padStart(2, '0')}`
}

/**
 * "H:MM" / "HH:MM" 문자열을 분으로 변환 (분 부분은 두 자리).
 * @returns {number} 분, 형식 오류 시 NaN
 */
export function parseHmToMinutes(s) {
  if (s == null || typeof s !== 'string') return NaN
  const t = s.trim()
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return NaN
  const h = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (Number.isNaN(h) || Number.isNaN(mm) || mm < 0 || mm > 59 || h < 0) return NaN
  return h * 60 + mm
}
