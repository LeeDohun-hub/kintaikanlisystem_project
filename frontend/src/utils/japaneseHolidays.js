/**
 * 日本の祝日・振替休日・国民の休日を判定するユーティリティ。
 * 対象年: 2000〜2099
 * 注: Date演算はすべてローカル時刻ベースで行い、toISOString()（UTC）は使用しない。
 */

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr, n) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

function dayOfWeek(dateStr) {
  return parseLocalDate(dateStr).getDay(); // 0=Sun, 6=Sat
}

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nthMonday(year, month, n) {
  const first = new Date(year, month - 1, 1);
  const dow = first.getDay(); // 0=Sun…6=Sat
  const toMonday = dow === 1 ? 0 : (8 - dow) % 7 || 7;
  const d = new Date(year, month - 1, 1 + toMonday + (n - 1) * 7);
  return toLocalDateStr(d);
}

function shunbun(year) {
  const d = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return ymd(year, 3, d);
}

function shubun(year) {
  const d = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return ymd(year, 9, d);
}

function getBaseHolidays(year) {
  const h = new Set();

  h.add(ymd(year, 1, 1));

  if (year >= 2000) h.add(nthMonday(year, 1, 2));
  else h.add(ymd(year, 1, 15));

  if (year >= 1967) h.add(ymd(year, 2, 11));
  if (year >= 2020) h.add(ymd(year, 2, 23));

  h.add(shunbun(year));

  if (year >= 1989) h.add(ymd(year, 4, 29));

  h.add(ymd(year, 5, 3));
  if (year >= 2007) h.add(ymd(year, 5, 4));
  h.add(ymd(year, 5, 5));

  if (year === 2020) h.add(ymd(2020, 7, 23));
  else if (year === 2021) h.add(ymd(2021, 7, 22));
  else if (year >= 2003) h.add(nthMonday(year, 7, 3));
  else if (year >= 1996) h.add(ymd(year, 7, 20));

  if (year === 2020) h.add(ymd(2020, 8, 10));
  else if (year >= 2016) h.add(ymd(year, 8, 11));

  if (year >= 2003) h.add(nthMonday(year, 9, 3));
  else if (year >= 1966) h.add(ymd(year, 9, 15));

  h.add(shubun(year));

  if (year === 2020) h.add(ymd(2020, 7, 24));
  else if (year === 2021) h.add(ymd(2021, 7, 23));
  else if (year >= 2000) h.add(nthMonday(year, 10, 2));
  else if (year >= 1966) h.add(ymd(year, 10, 10));

  h.add(ymd(year, 11, 3));
  h.add(ymd(year, 11, 23));

  if (year >= 1989 && year <= 2018) h.add(ymd(year, 12, 23));

  if (year === 2019) {
    h.add(ymd(2019, 4, 30));
    h.add(ymd(2019, 5, 1));
    h.add(ymd(2019, 5, 2));
    h.add(ymd(2019, 10, 22));
  }

  return h;
}

function addSubstituteHolidays(h) {
  const sorted = [...h].sort();
  const toAdd = new Set();
  for (const d of sorted) {
    if (dayOfWeek(d) === 0) { // Sunday
      let sub = addDays(d, 1);
      let safety = 0;
      while ((h.has(sub) || toAdd.has(sub)) && safety < 30) {
        sub = addDays(sub, 1);
        safety++;
      }
      if (safety < 30) toAdd.add(sub);
    }
  }
  for (const d of toAdd) h.add(d);
}

function addCivicHolidays(h, year) {
  const toAdd = new Set();
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDay = month === 1 ? 2 : 1;
    const endDay = month === 12 ? 30 : daysInMonth;
    for (let day = startDay; day <= endDay; day++) {
      const ds = ymd(year, month, day);
      const dow = dayOfWeek(ds);
      if (!h.has(ds) && dow !== 0 && h.has(addDays(ds, -1)) && h.has(addDays(ds, 1))) {
        toAdd.add(ds);
      }
    }
  }
  for (const d of toAdd) h.add(d);
}

const _cache = new Map();

export function getHolidaysForYear(year) {
  if (_cache.has(year)) return _cache.get(year);
  const h = getBaseHolidays(year);
  addSubstituteHolidays(h);
  addCivicHolidays(h, year);
  _cache.set(year, h);
  return h;
}

export function isPublicHoliday(dateStr) {
  if (!dateStr) return false;
  const year = parseInt(dateStr.slice(0, 4), 10);
  return getHolidaysForYear(year).has(dateStr);
}

export function isHolidayOrWeekend(dateStr) {
  if (!dateStr) return false;
  const dow = dayOfWeek(dateStr);
  return dow === 0 || dow === 6 || isPublicHoliday(dateStr);
}
