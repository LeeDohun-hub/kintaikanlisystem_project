package com.kintai.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AttendanceMetricsCalculatorTest {

    @Test
    void night_sameCalendarDay_earlyMorning() {
        LocalDate d = LocalDate.of(2026, 4, 1);
        LocalDateTime in = d.atTime(2, 0);
        LocalDateTime out = d.atTime(10, 0);
        assertEquals(3 * 60, AttendanceMetricsCalculator.nightWorkMinutes(in, out));
    }

    @Test
    void night_crossMidnight() {
        LocalDate d = LocalDate.of(2026, 4, 1);
        LocalDateTime in = d.atTime(23, 0);
        LocalDateTime out = d.plusDays(1).atTime(2, 0);
        assertEquals(3 * 60, AttendanceMetricsCalculator.nightWorkMinutes(in, out));
    }

    @Test
    void night_lateEvening_only() {
        LocalDate d = LocalDate.of(2026, 4, 1);
        LocalDateTime in = d.atTime(22, 30);
        LocalDateTime out = d.atTime(23, 30);
        assertEquals(60, AttendanceMetricsCalculator.nightWorkMinutes(in, out));
    }

    @Test
    void workAndOvertime() {
        LocalDate d = LocalDate.of(2026, 4, 1);
        LocalDateTime in = d.atTime(9, 0);
        LocalDateTime out = d.atTime(18, 0);
        int wm = AttendanceMetricsCalculator.workMinutes(in, out, 60);
        assertEquals(8 * 60, wm);
        assertEquals(0, AttendanceMetricsCalculator.overtimeMinutes(wm));
        int wmLong = AttendanceMetricsCalculator.workMinutes(in, d.atTime(20, 0), 60);
        assertEquals(10 * 60, wmLong);
        assertEquals(10 * 60 - 480, AttendanceMetricsCalculator.overtimeMinutes(wmLong));
    }

    @Test
    void clockOut_nextDay_whenEndBeforeStart() {
        LocalDate d = LocalDate.of(2026, 4, 1);
        LocalDateTime co = AttendanceMetricsCalculator.clockOut(d, LocalTime.of(22, 0), LocalTime.of(6, 0));
        assertEquals(d.plusDays(1).atTime(6, 0), co);
    }

    @Test
    void fatigueMonthly_includesThresholdPenalty() {
        double fp = AttendanceMetricsCalculator.fatiguePointsMonthly(3000, 0, 0);
        assertEquals(3000.0 + (3000 - 2700) * 0.5, fp, 1e-9);
    }
}
