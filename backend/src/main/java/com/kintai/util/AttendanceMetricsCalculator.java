package com.kintai.util;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 勤怠1行からの派生指標（実働・残業・休日労働・深夜・疲労スコア）。
 * 深夜帯は各暦日の [00:00–05:00) と [22:00–24:00) とシフト区間の重なり分を合算（跨日・境界の二重計上なし）。
 */
public final class AttendanceMetricsCalculator {

    public static final int REGULAR_DAY_MINUTES = 480;
    public static final int MONTHLY_OVERTIME_THRESHOLD_MINUTES = 2700;

    private AttendanceMetricsCalculator() {}

    /**
     * work_date + start/end 時刻から実打刻相当の開始・終了を求める。
     * 終業が始業以前の時刻なら翌日終業（夜勤勤務）とみなす。
     */
    public static LocalDateTime clockIn(LocalDate workDate, LocalTime startTime) {
        return workDate.atTime(startTime);
    }

    public static LocalDateTime clockOut(LocalDate workDate, LocalTime startTime, LocalTime endTime) {
        LocalDateTime start = workDate.atTime(startTime);
        LocalDateTime endSameDay = workDate.atTime(endTime);
        if (endTime.isAfter(startTime) || endTime.equals(startTime)) {
            return endSameDay;
        }
        return workDate.plusDays(1).atTime(endTime);
    }

    public static int workMinutes(LocalDateTime clockIn, LocalDateTime clockOut, int breakMinutes) {
        if (clockIn == null || clockOut == null || !clockOut.isAfter(clockIn)) {
            return 0;
        }
        long gross = Duration.between(clockIn, clockOut).toMinutes();
        int br = Math.max(0, breakMinutes);
        return (int) Math.max(0, gross - br);
    }

    public static int overtimeMinutes(int workMinutes) {
        return Math.max(0, workMinutes - REGULAR_DAY_MINUTES);
    }

    public static int holidayWorkMinutes(boolean isHoliday, int workMinutes) {
        return isHoliday ? workMinutes : 0;
    }

    /**
     * 22:00–05:00（暦日ごと）に含まれる労働分数。
     */
    public static int nightWorkMinutes(LocalDateTime clockIn, LocalDateTime clockOut) {
        if (clockIn == null || clockOut == null || !clockOut.isAfter(clockIn)) {
            return 0;
        }
        int total = 0;
        LocalDate d = clockIn.toLocalDate();
        LocalDate endDate = clockOut.toLocalDate();
        while (!d.isAfter(endDate)) {
            LocalDateTime dayStart = d.atStartOfDay();
            LocalDateTime dayEnd = d.plusDays(1).atStartOfDay();
            LocalDateTime segLo = clockIn.isAfter(dayStart) ? clockIn : dayStart;
            LocalDateTime segHi = clockOut.isBefore(dayEnd) ? clockOut : dayEnd;
            if (segLo.isBefore(segHi)) {
                LocalDateTime earlyEnd = d.atTime(5, 0);
                LocalDateTime lateStart = d.atTime(22, 0);
                total += overlapMinutes(segLo, segHi, dayStart, earlyEnd);
                total += overlapMinutes(segLo, segHi, lateStart, dayEnd);
            }
            d = d.plusDays(1);
        }
        return total;
    }

    private static int overlapMinutes(LocalDateTime segLo, LocalDateTime segHi,
                                      LocalDateTime winLo, LocalDateTime winHi) {
        if (!winLo.isBefore(winHi) || !segLo.isBefore(segHi)) {
            return 0;
        }
        LocalDateTime a = segLo.isAfter(winLo) ? segLo : winLo;
        LocalDateTime b = segHi.isBefore(winHi) ? segHi : winHi;
        if (!a.isBefore(b)) {
            return 0;
        }
        return (int) Duration.between(a, b).toMinutes();
    }

    /**
     * 日次の重み付き疲労ポイント（月次45h超過ペナルティは含めない）。
     */
    public static double fatiguePointsDaily(int overtimeMinutes, int holidayWorkMinutes, int nightWorkMinutes) {
        return overtimeMinutes * 1.0
                + holidayWorkMinutes * 1.5
                + nightWorkMinutes * 1.8;
    }

    /**
     * 月次集計に対する疲労ポイント（45時間超の残業に追加係数）。
     */
    public static double fatiguePointsMonthly(
            int monthlyOvertimeSum,
            int monthlyHolidayWorkSum,
            int monthlyNightWorkSum
    ) {
        return monthlyOvertimeSum * 1.0
                + monthlyHolidayWorkSum * 1.5
                + monthlyNightWorkSum * 1.8
                + Math.max(0, monthlyOvertimeSum - MONTHLY_OVERTIME_THRESHOLD_MINUTES) * 0.5;
    }

    public static double fatigueIndex(double fatiguePoints, int standardMonthlyMinutes) {
        if (standardMonthlyMinutes <= 0) {
            return 0.0;
        }
        return fatiguePoints / standardMonthlyMinutes * 100.0;
    }
}
