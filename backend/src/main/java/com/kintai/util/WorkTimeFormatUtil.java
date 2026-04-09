package com.kintai.util;

/**
 * 근무표 표시용: 분 단위를 {@code H:MM} 문자열로 변환 (累計는 24시간을 넘을 수 있음).
 */
public final class WorkTimeFormatUtil {

    private WorkTimeFormatUtil() {}

    public static String minutesToHm(int totalMinutes) {
        int m = Math.max(0, totalMinutes);
        int h = m / 60;
        int mm = m % 60;
        return h + ":" + String.format("%02d", mm);
    }
}
