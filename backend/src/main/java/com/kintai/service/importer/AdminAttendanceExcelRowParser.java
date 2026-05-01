package com.kintai.service.importer;

import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * 관리자용 근태 업로드(Excel) 한 행 파서.
 * AttendanceImportService에서 파싱/검증 로직을 분리해, 테스트/유지보수를 쉽게 한다.
 */
@Component
@RequiredArgsConstructor
public class AdminAttendanceExcelRowParser {

    private final EmployeeRepository employeeRepository;

    public record ParsedRow(Long employeeId, LocalDate workDate, LocalTime start, LocalTime end, int breakMinutes, String remarks) {}

    public ParsedRow parseRow(Row row) {
        Long employeeId = resolveEmployeeId(readCellString(row, 0));
        if (employeeId == null) {
            throw new IllegalArgumentException("A列の社員IDが空か、登録されていない社員です。");
        }
        LocalDate workDate = readCellDate(row, 1);
        LocalTime start = readCellTime(row, 2);
        LocalTime end = readCellTime(row, 3);
        int breakMinutes = readBreakMinutes(row, 4);
        String remarks = truncateRemarks(readCellString(row, 5));

        if (workDate == null || start == null || end == null) {
            throw new IllegalArgumentException("B列の日付またはC/D列の時刻形式をご確認ください。（日付: YYYY-MM-DD または Excel 日付、時刻: HH:mm）");
        }
        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("開始時刻は終了時刻より前である必要があります。");
        }
        if (breakMinutes < 0 || breakMinutes > 24 * 60) {
            throw new IllegalArgumentException("E列の休憩（分）は0以上1440以下である必要があります。");
        }
        return new ParsedRow(employeeId, workDate, start, end, breakMinutes, remarks);
    }

    private Long resolveEmployeeId(String raw) {
        if (raw == null) return null;
        String v = raw.trim();
        if (v.isBlank()) return null;
        if (v.matches("^\\d+$")) {
            long id = Long.parseLong(v);
            return employeeRepository.existsById(id) ? id : null;
        }
        Employee emp = employeeRepository.findByEmployeeCode(v).orElse(null);
        return emp != null ? emp.getEmployeeId() : null;
    }

    private static String readCellString(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> {
                double d = c.getNumericCellValue();
                long l = (long) d;
                yield String.valueOf(l);
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> {
                CellType rt = c.getCachedFormulaResultType();
                if (rt == CellType.STRING) yield c.getStringCellValue();
                if (rt == CellType.NUMERIC) {
                    double d = c.getNumericCellValue();
                    yield String.valueOf((long) d);
                }
                if (rt == CellType.BOOLEAN) yield String.valueOf(c.getBooleanCellValue());
                yield null;
            }
            default -> null;
        };
    }

    private static LocalDate readCellDate(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(c)) {
            return c.getLocalDateTimeCellValue().toLocalDate();
        }
        if (c.getCellType() == CellType.STRING) {
            String s = c.getStringCellValue().trim();
            if (s.isBlank()) return null;
            try {
                return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException ex) {
                return null;
            }
        }
        return null;
    }

    private static LocalTime readCellTime(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC) {
            if (DateUtil.isCellDateFormatted(c)) {
                return c.getLocalDateTimeCellValue().toLocalTime().withSecond(0).withNano(0);
            }
            double v = c.getNumericCellValue();
            if (v >= 0 && v < 1) {
                int totalSeconds = (int) Math.round(v * 24 * 60 * 60);
                int hh = totalSeconds / 3600;
                int mm = (totalSeconds % 3600) / 60;
                return LocalTime.of(Math.min(23, hh), Math.min(59, mm));
            }
        }
        if (c.getCellType() == CellType.STRING) {
            String s = c.getStringCellValue().trim();
            if (s.isBlank()) return null;
            try {
                if (s.length() == 5) return LocalTime.parse(s, DateTimeFormatter.ofPattern("HH:mm"));
                return LocalTime.parse(s);
            } catch (DateTimeParseException ex) {
                return null;
            }
        }
        if (c.getCellType() == CellType.FORMULA) {
            CellType rt = c.getCachedFormulaResultType();
            if (rt == CellType.NUMERIC) {
                if (DateUtil.isCellDateFormatted(c)) {
                    return c.getLocalDateTimeCellValue().toLocalTime().withSecond(0).withNano(0);
                }
                double v = c.getNumericCellValue();
                if (v >= 0 && v < 1) {
                    int totalSeconds = (int) Math.round(v * 24 * 60 * 60);
                    int hh = totalSeconds / 3600;
                    int mm = (totalSeconds % 3600) / 60;
                    return LocalTime.of(Math.min(23, hh), Math.min(59, mm));
                }
            }
            if (rt == CellType.STRING) {
                String s = c.getStringCellValue().trim();
                if (s.isBlank()) return null;
                try {
                    if (s.length() == 5) return LocalTime.parse(s, DateTimeFormatter.ofPattern("HH:mm"));
                    return LocalTime.parse(s);
                } catch (DateTimeParseException ex) {
                    return null;
                }
            }
        }
        return null;
    }

    private static int readBreakMinutes(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return 0;
        try {
            return switch (c.getCellType()) {
                case NUMERIC -> {
                    if (DateUtil.isCellDateFormatted(c)) {
                        LocalTime t = c.getLocalDateTimeCellValue().toLocalTime();
                        yield t.getHour() * 60 + t.getMinute();
                    }
                    double v = c.getNumericCellValue();
                    if (v > 0 && v < 1.0) {
                        int totalSeconds = (int) Math.round(v * 24 * 60 * 60);
                        yield totalSeconds / 60;
                    }
                    yield (int) Math.round(v);
                }
                case STRING -> parseBreakMinutesString(c.getStringCellValue().trim());
                case FORMULA -> {
                    CellType rt = c.getCachedFormulaResultType();
                    if (rt == CellType.NUMERIC) {
                        if (DateUtil.isCellDateFormatted(c)) {
                            LocalTime t = c.getLocalDateTimeCellValue().toLocalTime();
                            yield t.getHour() * 60 + t.getMinute();
                        }
                        yield (int) Math.round(c.getNumericCellValue());
                    }
                    if (rt == CellType.STRING) {
                        yield parseBreakMinutesString(c.getStringCellValue().trim());
                    }
                    yield 0;
                }
                default -> 0;
            };
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private static int parseBreakMinutesString(String s) {
        if (s == null || s.isBlank()) return 0;
        if (s.matches("^\\d+:\\d{2}$")) {
            String[] p = s.split(":");
            int h = Integer.parseInt(p[0]);
            int m = Integer.parseInt(p[1]);
            return h * 60 + m;
        }
        return Integer.parseInt(s.trim());
    }

    private static String truncateRemarks(String raw) {
        if (raw == null) return null;
        String t = raw.trim();
        if (t.isEmpty()) return null;
        return t.length() > 500 ? t.substring(0, 500) : t;
    }
}

