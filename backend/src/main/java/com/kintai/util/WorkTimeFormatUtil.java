package com.kintai.util;

/**
 * 勤務表表示用：分を {@code H:MM} 文字列へ変換（累計は24時間を超え得る）。
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
