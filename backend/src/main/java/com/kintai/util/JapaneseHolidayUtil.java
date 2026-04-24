package com.kintai.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 日本の祝日・休日を判定するユーティリティ。
 * 対象年: 2000〜2099（実用上十分な範囲）
 */
public final class JapaneseHolidayUtil {

    private JapaneseHolidayUtil() {}

    /** date が祝日・振替休日・国民の休日 のいずれかであれば true */
    public static boolean isPublicHoliday(LocalDate date) {
        if (date == null) return false;
        return getHolidaysForYear(date.getYear()).contains(date);
    }

    /** 土曜・日曜・祝日のいずれかであれば true */
    public static boolean isHolidayOrWeekend(LocalDate date) {
        if (date == null) return false;
        DayOfWeek dow = date.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY || isPublicHoliday(date);
    }

    /** year 年の祝日・振替休日・国民の休日 一覧 */
    public static Set<LocalDate> getHolidaysForYear(int year) {
        Set<LocalDate> h = new HashSet<>();
        addBaseHolidays(h, year);
        addSubstituteHolidays(h, year);
        addCivicHolidays(h, year);
        return h;
    }

    // ──────────────────────────────────────────
    // 基本祝日
    // ──────────────────────────────────────────
    private static void addBaseHolidays(Set<LocalDate> h, int year) {

        // 元日
        h.add(LocalDate.of(year, 1, 1));

        // 成人の日: 2000〜 第2月曜、〜1999 1/15
        if (year >= 2000) h.add(nthMonday(year, 1, 2));
        else              h.add(LocalDate.of(year, 1, 15));

        // 建国記念の日
        if (year >= 1967) h.add(LocalDate.of(year, 2, 11));

        // 天皇誕生日 (令和: 2/23)
        if (year >= 2020) h.add(LocalDate.of(year, 2, 23));

        // 春分の日
        try { h.add(shunbun(year)); } catch (Exception ignored) {}

        // 昭和の日 / みどりの日(1989-2006) / 天皇誕生日(〜1988)
        if (year >= 1989) h.add(LocalDate.of(year, 4, 29));

        // 憲法記念日
        h.add(LocalDate.of(year, 5, 3));

        // みどりの日 (2007〜 5/4)
        if (year >= 2007) h.add(LocalDate.of(year, 5, 4));

        // こどもの日
        h.add(LocalDate.of(year, 5, 5));

        // 海の日
        if (year == 2020)      h.add(LocalDate.of(2020, 7, 23)); // 五輪特例
        else if (year == 2021) h.add(LocalDate.of(2021, 7, 22)); // 五輪特例
        else if (year >= 2003) h.add(nthMonday(year, 7, 3));
        else if (year >= 1996) h.add(LocalDate.of(year, 7, 20));

        // 山の日 (2016〜)
        if (year == 2020)      h.add(LocalDate.of(2020, 8, 10)); // 五輪特例
        else if (year >= 2016) h.add(LocalDate.of(year, 8, 11));

        // 敬老の日: 2003〜 第3月曜、〜2002 9/15
        if (year >= 2003) h.add(nthMonday(year, 9, 3));
        else if (year >= 1966) h.add(LocalDate.of(year, 9, 15));

        // 秋分の日
        try { h.add(shubun(year)); } catch (Exception ignored) {}

        // スポーツの日 / 体育の日
        if (year == 2020)      h.add(LocalDate.of(2020, 7, 24)); // 五輪特例
        else if (year == 2021) h.add(LocalDate.of(2021, 7, 23)); // 五輪特例
        else if (year >= 2000) h.add(nthMonday(year, 10, 2));
        else if (year >= 1966) h.add(LocalDate.of(year, 10, 10));

        // 文化の日
        h.add(LocalDate.of(year, 11, 3));

        // 勤労感謝の日
        h.add(LocalDate.of(year, 11, 23));

        // 天皇誕生日 (平成: 12/23、1989〜2018)
        if (year >= 1989 && year <= 2018) h.add(LocalDate.of(year, 12, 23));

        // 令和改元特例 (2019)
        if (year == 2019) {
            h.add(LocalDate.of(2019, 4, 30));  // 国民の休日
            h.add(LocalDate.of(2019, 5,  1));  // 即位の日
            h.add(LocalDate.of(2019, 5,  2));  // 国民の休日
            h.add(LocalDate.of(2019, 10, 22)); // 即位礼正殿の儀
        }
    }

    // ──────────────────────────────────────────
    // 振替休日: 祝日が日曜の場合、翌平日（既存祝日を跳ばす）
    // ──────────────────────────────────────────
    private static void addSubstituteHolidays(Set<LocalDate> h, int year) {
        // 前年末の祝日が日曜で振替が1/1を超える場合も考慮できるが、
        // 実用上は year 年内のみで十分。
        List<LocalDate> sorted = new ArrayList<>(h);
        sorted.sort(null);

        Set<LocalDate> toAdd = new HashSet<>();
        for (LocalDate d : sorted) {
            if (d.getDayOfWeek() == DayOfWeek.SUNDAY) {
                LocalDate sub = d.plusDays(1);
                while (h.contains(sub) || toAdd.contains(sub)) {
                    sub = sub.plusDays(1);
                }
                toAdd.add(sub);
            }
        }
        h.addAll(toAdd);
    }

    // ──────────────────────────────────────────
    // 国民の休日: 両隣が祝日である平日
    // ──────────────────────────────────────────
    private static void addCivicHolidays(Set<LocalDate> h, int year) {
        Set<LocalDate> toAdd = new HashSet<>();
        LocalDate start = LocalDate.of(year, 1, 2);
        LocalDate end   = LocalDate.of(year, 12, 30);
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (!h.contains(d)
                    && d.getDayOfWeek() != DayOfWeek.SUNDAY
                    && h.contains(d.minusDays(1))
                    && h.contains(d.plusDays(1))) {
                toAdd.add(d);
            }
        }
        h.addAll(toAdd);
    }

    // ──────────────────────────────────────────
    // ヘルパー
    // ──────────────────────────────────────────

    /** month の第 n 月曜日 */
    private static LocalDate nthMonday(int year, int month, int n) {
        LocalDate first = LocalDate.of(year, month, 1);
        int dow = first.getDayOfWeek().getValue(); // 1=Mon … 7=Sun
        int toMonday = (dow == 1) ? 0 : (8 - dow);
        return first.plusDays(toMonday).plusWeeks(n - 1);
    }

    /** 春分の日 (1980〜2099 有効) */
    private static LocalDate shunbun(int year) {
        int d = (int)(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4.0));
        return LocalDate.of(year, 3, d);
    }

    /** 秋分の日 (1980〜2099 有効) */
    private static LocalDate shubun(int year) {
        int d = (int)(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4.0));
        return LocalDate.of(year, 9, d);
    }
}
