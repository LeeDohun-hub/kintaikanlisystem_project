package com.kintai.service;

import com.kintai.dto.ImportAttendanceResponse;
import com.kintai.entity.BatchImportHistory;
import com.kintai.entity.Employee;
import com.kintai.entity.WorkTime;
import com.kintai.repository.BatchImportHistoryRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkTimeRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AttendanceImportService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceImportService.class);

    /** 成功0・行エラーなしのとき（書式不一致・空データなど）の案内 */
    private static final String MSG_KINTAIHYO_NO_ROWS =
            "登録された勤務がありません。勤務表テンプレート（例: 202604_勤務表(氏名).xlsx）かご確認ください。 "
                    + "先頭シート、3行目B列に年月（例: 2026年4月）、12行目以降B列の日付・C/D列出退勤が必要です。 "
                    + "公休のみ、または該当月が既にすべて登録済みの場合も0件になることがあります。";

    private static final String MSG_ADMIN_IMPORT_NO_ROWS =
            "登録されたデータがありません。1行目はヘッダとし、2行目から A:社員ID, B:勤務日（YYYY-MM-DD 等）, C:開始, D:終了, E:休憩, F:備考 の形式かご確認ください。";

    private final EmployeeRepository employeeRepository;
    private final WorkTimeRepository workTimeRepository;
    private final BatchImportHistoryRepository batchImportHistoryRepository;

    /**
     * 713 詳細設計に準拠:
     * - MultipartFile 受信
     * - Apache POI で Excel 読取
     * - 行単位検証（社員ID存在、日付/時刻、開始<終了）
     * - DB 一括登録
     * - 結果返却 + batch_import_history 記録
     *
     * Excel フォーマット（想定、1行目ヘッダ）:
     * A: 社員ID (employee_id または employee_code)
     * B: 勤務日 (YYYY-MM-DD または Excel 日付)
     * C: 開始時刻 (HH:mm または Excel 時刻)
     * D: 終了時刻 (HH:mm または Excel 時刻)
     * E: 休憩 — 分(整数)、または H:MM (例 1:00)、または Excel の時刻セル
     * F: 備考 (任意)
     */
    @Transactional
    public ImportAttendanceResponse importExcel(MultipartFile file) {
        log.info("[IMPORT] start fileName={}, size={}", file != null ? file.getOriginalFilename() : null, file != null ? file.getSize() : -1);

        List<ImportAttendanceResponse.RowError> errors = new ArrayList<>();
        List<WorkTime> toSave = new ArrayList<>();

        int success = 0;
        int rowNumForMsg = 0;

        try (InputStream in = file.getInputStream(); Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                throw new IllegalArgumentException("使用するシートがありません。データのある先頭シートをご確認ください。");
            }

            int last = sheet.getLastRowNum();
            Set<String> seenInFile = new HashSet<>();
            for (int r = 1; r <= last; r++) { // r=0 header
                Row row = sheet.getRow(r);
                rowNumForMsg = r + 1; // Excel 行番号は 1 始まり
                if (row == null) continue;

                try {
                    ParsedRow parsed = parseRow(row);

                    // 同一社員は同一勤務日1件のみ（時刻不問）：ファイル内＋DB 重複をブロック
                    String key = parsed.employeeId() + "|" + parsed.workDate();
                    if (!seenInFile.add(key)) {
                        throw new IllegalArgumentException("ファイル内に同一社員・同一勤務日が重複しています。");
                    }
                    if (workTimeRepository.existsByEmployeeIdAndWorkDate(parsed.employeeId(), parsed.workDate())) {
                        throw new IllegalArgumentException("既に登録済みの勤務日です。（同一社員・同一日は1件のみ）");
                    }

                    int workMinutes = computeWorkMinutes(parsed.start(), parsed.end(), parsed.breakMinutes());
                    WorkTime wt = WorkTime.builder()
                            .employeeId(parsed.employeeId())
                            .workDate(parsed.workDate())
                            .startTime(parsed.start())
                            .endTime(parsed.end())
                            .breakMinutes(parsed.breakMinutes())
                            .workMinutes(workMinutes)
                            .remarks(parsed.remarks())
                            .build();
                    toSave.add(wt);
                    success++;
                } catch (RuntimeException ex) {
                    log.warn("[IMPORT] row {} invalid: {}", rowNumForMsg, ex.getMessage());
                    errors.add(ImportAttendanceResponse.RowError.builder()
                            .row(rowNumForMsg)
                            .message(ex.getMessage() != null ? ex.getMessage() : "行処理エラー")
                            .build());
                }
            }

            if (success == 0 && errors.isEmpty()) {
                errors.add(ImportAttendanceResponse.RowError.builder()
                        .row(0)
                        .message(MSG_ADMIN_IMPORT_NO_ROWS)
                        .build());
            }

            if (!toSave.isEmpty()) {
                workTimeRepository.saveAll(toSave);
            }
        } catch (EncryptedDocumentException ex) {
            log.error("[IMPORT] encrypted workbook", ex);
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message("パスワード保護された Excel は取り込めません。")
                    .build());
        } catch (IOException ex) {
            log.error("[IMPORT] io error", ex);
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message("Excel ファイルを開けません。.xlsx または .xls か、破損していないかご確認ください。")
                    .build());
        } catch (IllegalArgumentException ex) {
            log.warn("[IMPORT] invalid argument: {}", ex.getMessage());
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message(ex.getMessage() != null ? ex.getMessage() : "ファイル形式が正しくありません。")
                    .build());
        } catch (Exception ex) {
            log.error("[IMPORT] failed", ex);
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(rowNumForMsg == 0 ? 0 : rowNumForMsg)
                    .message(friendlyUnexpectedImportMessage(ex))
                    .build());
        }

        int errorCount = errors.size();
        String status = errorCount == 0 ? "SUCCESS" : "ERROR";
        String errMsg = errorCount == 0 ? null : ("errorCount=" + errorCount);

        batchImportHistoryRepository.save(BatchImportHistory.builder()
                .fileName(file != null ? safeFileName(file.getOriginalFilename()) : "unknown")
                .status(status)
                .errorMessage(errMsg)
                .build());

        log.info("[IMPORT] end success={}, errors={}", success, errorCount);
        return ImportAttendanceResponse.builder()
                .successCount(success)
                .errorCount(errorCount)
                .updatedExistingDays(0)
                .errors(errors)
                .build();
    }

    private record ParsedRow(Long employeeId, LocalDate workDate, LocalTime start, LocalTime end, int breakMinutes, String remarks) {}

    private ParsedRow parseRow(Row row) {
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

    private static int computeWorkMinutes(LocalTime start, LocalTime end, int breakMinutes) {
        int startM = start.getHour() * 60 + start.getMinute();
        int endM = end.getHour() * 60 + end.getMinute();
        return Math.max(0, endM - startM - breakMinutes);
    }

    private Long resolveEmployeeId(String raw) {
        if (raw == null) return null;
        String v = raw.trim();
        if (v.isBlank()) return null;
        // numeric -> employee_id
        if (v.matches("^\\d+$")) {
            long id = Long.parseLong(v);
            return employeeRepository.existsById(id) ? id : null;
        }
        // otherwise treat as employee_code
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

    private static int readBreakMinutes(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) {
            return 0;
        }
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
        if (s == null || s.isBlank()) {
            return 0;
        }
        if (s.matches("^\\d+:\\d{2}$")) {
            String[] p = s.split(":");
            int h = Integer.parseInt(p[0]);
            int m = Integer.parseInt(p[1]);
            return h * 60 + m;
        }
        return Integer.parseInt(s.trim());
    }

    private static String truncateRemarks(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        return t.length() > 500 ? t.substring(0, 500) : t;
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
            // Excel time as fraction of a day
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
            // allow HH:mm or HH:mm:ss
            try {
                if (s.length() == 5) return LocalTime.parse(s, DateTimeFormatter.ofPattern("HH:mm"));
                return LocalTime.parse(s);
            } catch (DateTimeParseException ex) {
                return null;
            }
        }
        return null;
    }

    /**
     * 勤務表フォーマット (202604_勤務表(氏名).xlsx) のインポート。
     * - Row 3 (index 2), Col B (index 1): "2026年4月" → 年月を取得
     * - Row 12 (index 11)〜: 日付=B列（「4月1日(火)」文字列 or Excel 日付シリアル数値）, 出勤=C, 退勤=D, 休憩=E, 備考=H
     * - 出勤・退勤が空の行(土日・祝日)はスキップ
     * - employeeId はセッションのログインユーザーを使用
     * - 同一 employeeId + work_date が既にある場合は行を更新(Excel の値で上書き)、無ければ新規挿入
     */
    @Transactional
    public ImportAttendanceResponse importKintaihyo(MultipartFile file, Long employeeId) {
        log.info("[KINTAIHYO] start fileName={}, employeeId={}", file != null ? file.getOriginalFilename() : null, employeeId);

        List<ImportAttendanceResponse.RowError> errors = new ArrayList<>();
        List<WorkTime> toSave = new ArrayList<>();
        int inserted = 0;
        int updated = 0;

        String originalName = file != null ? file.getOriginalFilename() : null;
        if (originalName != null && originalName.toLowerCase().endsWith(".csv")) {
            return importKintaihyoCsv(file, employeeId);
        }

        try (InputStream in = file.getInputStream(); Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                throw new IllegalArgumentException("使用するシートがありません。データのある先頭シートをご確認ください。");
            }

            int year = extractKintaihyoYear(sheet);
            int dataStart = 11; // 1-based row 12
            int last = sheet.getLastRowNum();
            log.info("[KINTAIHYO] year={}, dataStart={}, lastRow={}", year, dataStart + 1, last + 1);

            for (int r = dataStart; r <= last; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String totalRowProbe = readKintaihyoDateAsRawString(row, 1);
                if (totalRowProbe != null && totalRowProbe.contains("合計")) break;

                LocalDate workDate = readKintaihyoWorkDate(row, 1, year, wb);
                log.debug("[KINTAIHYO] row={} workDate={}", r + 1, workDate);
                if (workDate == null) continue;

                LocalTime start = readKintaihyoTime(row, 2);
                LocalTime end   = readKintaihyoTime(row, 3);
                log.debug("[KINTAIHYO] row={} workDate={} start={} end={}", r + 1, workDate, start, end);
                if (start == null || end == null) continue; // 土日・祝日

                int rowNumForMsg = r + 1;
                try {
                    if (!start.isBefore(end)) {
                        throw new IllegalArgumentException("開始時刻は終了時刻より前である必要があります。");
                    }

                    int breakMinutes = readKintaihyoBreakMinutes(row, 4);
                    String remarks = truncateRemarks(readCellString(row, 7));
                    int workMinutes = computeWorkMinutes(start, end, breakMinutes);

                    Optional<WorkTime> existing =
                            workTimeRepository.findFirstByEmployeeIdAndWorkDateOrderByWorkIdAsc(employeeId, workDate);
                    if (existing.isPresent()) {
                        WorkTime w = existing.get();
                        w.setStartTime(start);
                        w.setEndTime(end);
                        w.setBreakMinutes(breakMinutes);
                        w.setWorkMinutes(workMinutes);
                        w.setRemarks(remarks);
                        updated++;
                    } else {
                        toSave.add(WorkTime.builder()
                                .employeeId(employeeId)
                                .workDate(workDate)
                                .startTime(start)
                                .endTime(end)
                                .breakMinutes(breakMinutes)
                                .workMinutes(workMinutes)
                                .remarks(remarks)
                                .build());
                        inserted++;
                    }
                } catch (RuntimeException ex) {
                    log.warn("[KINTAIHYO] row {} invalid: {}", rowNumForMsg, ex.getMessage());
                    errors.add(ImportAttendanceResponse.RowError.builder()
                            .row(rowNumForMsg)
                            .message(ex.getMessage() != null ? ex.getMessage() : "行処理エラー")
                            .build());
                }
            }

            int applied = inserted + updated;
            if (applied == 0 && errors.isEmpty()) {
                errors.add(ImportAttendanceResponse.RowError.builder()
                        .row(0)
                        .message(MSG_KINTAIHYO_NO_ROWS)
                        .build());
            }

            if (!toSave.isEmpty()) workTimeRepository.saveAll(toSave);

        } catch (EncryptedDocumentException ex) {
            log.error("[KINTAIHYO] encrypted workbook", ex);
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message("パスワード保護された Excel は取り込めません。")
                    .build());
        } catch (IOException ex) {
            log.error("[KINTAIHYO] io error", ex);
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message("Excel ファイルを開けません。.xlsx または .xls か、破損していないかご確認ください。")
                    .build());
        } catch (IllegalArgumentException ex) {
            log.warn("[KINTAIHYO] invalid argument: {}", ex.getMessage());
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message(ex.getMessage() != null ? ex.getMessage() : "ファイル形式が正しくありません。")
                    .build());
        } catch (Exception ex) {
            log.error("[KINTAIHYO] failed", ex);
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message(friendlyUnexpectedImportMessage(ex))
                    .build());
        }

        int errorCount = errors.size();
        batchImportHistoryRepository.save(BatchImportHistory.builder()
                .fileName(file != null ? safeFileName(file.getOriginalFilename()) : "unknown")
                .status(errorCount == 0 ? "SUCCESS" : "ERROR")
                .errorMessage(errorCount == 0 ? null : "errorCount=" + errorCount)
                .build());

        int appliedTotal = inserted + updated;
        log.info("[KINTAIHYO] end inserted={}, updated={}, errors={}", inserted, updated, errorCount);
        return ImportAttendanceResponse.builder()
                .successCount(appliedTotal)
                .errorCount(errorCount)
                .updatedExistingDays(updated)
                .errors(errors)
                .build();
    }

    private static final String MSG_KINTAIHYO_CSV_NO_ROWS =
            "登録された勤務がありません。CSV は UTF-8、1行目ヘッダ付きで、少なくとも 日付/開始/終了 の列が必要です。"
                    + "（列名例: workDate,startTime,endTime,breakMinutes,remarks）";

    /**
     * 勤務表（CSV, UTF-8, ヘッダあり）のインポート。
     * - employeeId はセッションのログインユーザーを使用
     * - 同一 employeeId + work_date が既にある場合は行を更新、無ければ新規挿入
     * - 日付/時刻は固定フォーマットではないため複数パターンを許容（例: 2026-04-01 / 2026/4/1 / 20260401, 9:00 / 0900）
     */
    @Transactional
    protected ImportAttendanceResponse importKintaihyoCsv(MultipartFile file, Long employeeId) {
        log.info("[KINTAIHYO-CSV] start fileName={}, employeeId={}", file != null ? file.getOriginalFilename() : null, employeeId);

        List<ImportAttendanceResponse.RowError> errors = new ArrayList<>();
        // 同一勤務日が CSV 内で複数回出た場合は「後勝ち」で upsert したいので、日付単位で保持する
        java.util.Map<LocalDate, WorkTime> pendingInsertsByDate = new java.util.HashMap<>();
        int inserted = 0;
        int updated = 0;

        try {
            byte[] bytes = file.getBytes();
            CharsetDecoder dec = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT);

            try (
                    InputStream in = new ByteArrayInputStream(bytes);
                    InputStreamReader reader = new InputStreamReader(in, dec);
                    CSVParser parser = CSVFormat.DEFAULT
                            .builder()
                            // ヘッダ2段（例: 実働時間 の下に 当日/累計）を CSV で表現すると
                            // 1行目/2行目がヘッダとして存在するため、ここでは自前でヘッダ行を解釈する。
                            .setTrim(true)
                            .setIgnoreSurroundingSpaces(true)
                            .setIgnoreEmptyLines(true)
                            .build()
                            .parse(reader)
            ) {
                List<CSVRecord> records = parser.getRecords();
                if (records.isEmpty()) {
                    throw new IllegalArgumentException("CSV の内容が空です。");
                }

                HeaderInfo header = analyzeHeader(records);
                HeaderIndex idx = resolveKintaihyoCsvHeader(header.names());

                int dataStart = header.headerStartRow() + header.headerRows();
                int rowNum = dataStart; // 1-based line number (roughly)
                for (int i = dataStart; i < records.size(); i++) {
                    CSVRecord rec = records.get(i);
                    rowNum = i + 1; // 1-based line number in CSV (roughly)
                    try {
                        String dateRaw = safeGet(rec, idx.workDate);
                        String startRaw = safeGet(rec, idx.startTime);
                        String endRaw = safeGet(rec, idx.endTime);
                        String breakRaw = idx.breakMinutes >= 0 ? safeGet(rec, idx.breakMinutes) : null;
                        String remarksRaw = idx.remarks >= 0 ? safeGet(rec, idx.remarks) : null;

                        // Excel 勤務表と同様: 出勤・退勤が空の行はスキップ
                        if ((startRaw == null || startRaw.isBlank()) && (endRaw == null || endRaw.isBlank())) {
                            continue;
                        }

                        LocalDate workDate = parseKintaihyoCsvDate(dateRaw, header.year());
                        if (workDate == null) {
                            throw new IllegalArgumentException("日付の形式が正しくありません。");
                        }
                        LocalTime start = parseFlexibleTime(startRaw);
                        LocalTime end = parseFlexibleTime(endRaw);
                        if (start == null || end == null) {
                            throw new IllegalArgumentException("開始/終了時刻の形式が正しくありません。");
                        }
                        if (!start.isBefore(end)) {
                            throw new IllegalArgumentException("開始時刻は終了時刻より前である必要があります。");
                        }

                        int breakMinutes = parseFlexibleBreakMinutes(breakRaw);
                        if (breakMinutes < 0 || breakMinutes > 24 * 60) {
                            throw new IllegalArgumentException("休憩（分）は0以上1440以下である必要があります。");
                        }

                        String remarks = truncateRemarks(remarksRaw);
                        int workMinutes = computeWorkMinutes(start, end, breakMinutes);

                        Optional<WorkTime> existing =
                                workTimeRepository.findFirstByEmployeeIdAndWorkDateOrderByWorkIdAsc(employeeId, workDate);
                        if (existing.isPresent()) {
                            WorkTime w = existing.get();
                            w.setStartTime(start);
                            w.setEndTime(end);
                            w.setBreakMinutes(breakMinutes);
                            w.setWorkMinutes(workMinutes);
                            w.setRemarks(remarks);
                            updated++;
                        } else {
                            WorkTime pending = pendingInsertsByDate.get(workDate);
                            if (pending != null) {
                                // 同一ファイル内の重複日は「更新」として扱う（最後の行で上書き）
                                pending.setStartTime(start);
                                pending.setEndTime(end);
                                pending.setBreakMinutes(breakMinutes);
                                pending.setWorkMinutes(workMinutes);
                                pending.setRemarks(remarks);
                                updated++;
                            } else {
                                pendingInsertsByDate.put(workDate, WorkTime.builder()
                                    .employeeId(employeeId)
                                    .workDate(workDate)
                                    .startTime(start)
                                    .endTime(end)
                                    .breakMinutes(breakMinutes)
                                    .workMinutes(workMinutes)
                                    .remarks(remarks)
                                    .build());
                                inserted++;
                            }
                        }
                    } catch (RuntimeException ex) {
                        errors.add(ImportAttendanceResponse.RowError.builder()
                                .row(rowNum)
                                .message(ex.getMessage() != null ? ex.getMessage() : "行処理エラー")
                                .build());
                    }
                }

                int applied = inserted + updated;
                if (applied == 0 && errors.isEmpty()) {
                    errors.add(ImportAttendanceResponse.RowError.builder()
                            .row(0)
                            .message(MSG_KINTAIHYO_CSV_NO_ROWS)
                            .build());
                }
                if (!pendingInsertsByDate.isEmpty()) {
                    workTimeRepository.saveAll(pendingInsertsByDate.values());
                }
            }
        } catch (IllegalArgumentException ex) {
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message(ex.getMessage() != null ? ex.getMessage() : "CSV 形式が正しくありません。")
                    .build());
        } catch (Exception ex) {
            log.error("[KINTAIHYO-CSV] failed", ex);
            errors.add(ImportAttendanceResponse.RowError.builder()
                    .row(0)
                    .message(friendlyUnexpectedImportMessage(ex))
                    .build());
        }

        int errorCount = errors.size();
        batchImportHistoryRepository.save(BatchImportHistory.builder()
                .fileName(file != null ? safeFileName(file.getOriginalFilename()) : "unknown")
                .status(errorCount == 0 ? "SUCCESS" : "ERROR")
                .errorMessage(errorCount == 0 ? null : "errorCount=" + errorCount)
                .build());

        int appliedTotal = inserted + updated;
        log.info("[KINTAIHYO-CSV] end inserted={}, updated={}, errors={}", inserted, updated, errorCount);
        return ImportAttendanceResponse.builder()
                .successCount(appliedTotal)
                .errorCount(errorCount)
                .updatedExistingDays(updated)
                .errors(errors)
                .build();
    }

    private record HeaderInfo(int headerStartRow, int headerRows, List<String> names, Integer year) {}

    private record HeaderIndex(
            int workDate,
            int startTime,
            int endTime,
            int breakMinutes,
            int remarks,
            List<String> workDateNames,
            List<String> startTimeNames,
            List<String> endTimeNames,
            List<String> breakNames,
            List<String> remarksNames
    ) {}

    private static HeaderIndex resolveKintaihyoCsvHeader(List<String> headerNames) {
        // canonical names + japanese variants
        List<String> date = List.of("workdate", "work_date", "date", "勤務日", "日付", "月日");
        List<String> start = List.of("starttime", "start_time", "start", "始業", "開始", "出勤", "始業時刻", "開始時刻");
        List<String> end = List.of("endtime", "end_time", "end", "終業", "終了", "退勤", "終業時刻", "終了時刻");
        List<String> br = List.of("breakminutes", "break_minutes", "break", "休憩", "休憩分", "休憩時間", "休憩時刻");
        List<String> rem = List.of("remarks", "remark", "memo", "備考", "メモ", "コメント");

        int dateIdx = findHeaderIndex(headerNames, date);
        int startIdx = findHeaderIndex(headerNames, start);
        int endIdx = findHeaderIndex(headerNames, end);
        int breakIdx = findHeaderIndex(headerNames, br);
        int remarksIdx = findHeaderIndex(headerNames, rem);

        if (dateIdx < 0 || startIdx < 0 || endIdx < 0) {
            throw new IllegalArgumentException(
                    "CSV のヘッダに必要な列がありません。必須: 日付/開始/終了（例: workDate,startTime,endTime）");
        }
        return new HeaderIndex(dateIdx, startIdx, endIdx, breakIdx, remarksIdx, date, start, end, br, rem);
    }

    private static int findHeaderIndex(List<String> headerNames, List<String> candidates) {
        if (headerNames == null || headerNames.isEmpty()) return -1;
        for (int i = 0; i < headerNames.size(); i++) {
            String nk = normalizeHeaderKey(headerNames.get(i));
            for (String c : candidates) {
                if (nk.equalsIgnoreCase(normalizeHeaderKey(c))) {
                    return i;
                }
            }
        }
        return -1;
    }

    private static String normalizeHeaderKey(String s) {
        if (s == null) return "";
        return s.trim()
                .replace("\uFEFF", "") // BOM
                .replaceAll("[\\s_\\-]", "")
                .toLowerCase();
    }

    private static HeaderInfo analyzeHeader(List<CSVRecord> records) {
        Integer year = extractYearFromRecords(records);

        int headerStart = findHeaderStartRow(records);
        if (headerStart < 0) {
            // fallback: treat first row as header
            headerStart = 0;
        }

        CSVRecord r0 = records.get(headerStart);
        CSVRecord r1 = (records.size() > headerStart + 1) ? records.get(headerStart + 1) : null;

        boolean hasTwoRowHeader = false;
        if (r1 != null) {
            String row1 = joinRowForProbe(r1);
            String row0 = joinRowForProbe(r0);
            hasTwoRowHeader = (row1.contains("当日") || row1.contains("累計")) && row0.contains("実働");
        }

        int cols = r0.size();
        List<String> names = new ArrayList<>(cols);
        for (int i = 0; i < cols; i++) {
            String h1 = safeGet(r0, i);
            String h2 = (hasTwoRowHeader && r1 != null) ? safeGet(r1, i) : null;
            String name = (h1 != null && !h1.isBlank()) ? h1 : (h2 != null && !h2.isBlank() ? h2 : ("col" + i));
            names.add(name);
        }
        return new HeaderInfo(headerStart, hasTwoRowHeader ? 2 : 1, names, year);
    }

    private static String joinRowForProbe(CSVRecord r) {
        if (r == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < r.size(); i++) {
            String v = r.get(i);
            if (v != null) sb.append(v.trim());
        }
        return sb.toString();
    }

    private static Integer extractYearFromRecords(List<CSVRecord> records) {
        int limit = Math.min(30, records.size());
        for (int i = 0; i < limit; i++) {
            CSVRecord r = records.get(i);
            for (int c = 0; c < r.size(); c++) {
                String v = safeGet(r, c);
                if (v == null) continue;
                Matcher m = YEAR_PATTERN.matcher(v);
                if (m.find()) {
                    try {
                        return Integer.parseInt(m.group(1));
                    } catch (RuntimeException ignored) {
                        // continue
                    }
                }
            }
        }
        return null;
    }

    private static int findHeaderStartRow(List<CSVRecord> records) {
        // try to locate a row that contains date/start/end keywords (e.g. 月日, 始業時刻, 終業時刻)
        List<String> mustHaveAny = List.of("月日", "勤務日", "日付", "workDate", "work_date", "date");
        List<String> startAny = List.of("始業時刻", "開始時刻", "始業", "開始", "出勤", "startTime", "start_time", "start");
        List<String> endAny = List.of("終業時刻", "終了時刻", "終業", "終了", "退勤", "endTime", "end_time", "end");

        int limit = Math.min(30, records.size());
        for (int i = 0; i < limit; i++) {
            CSVRecord r = records.get(i);
            boolean hasDate = rowHasAnyHeaderToken(r, mustHaveAny);
            boolean hasStart = rowHasAnyHeaderToken(r, startAny);
            boolean hasEnd = rowHasAnyHeaderToken(r, endAny);
            if (hasDate && hasStart && hasEnd) return i;
        }
        return -1;
    }

    private static boolean rowHasAnyHeaderToken(CSVRecord r, List<String> tokens) {
        if (r == null || tokens == null) return false;
        for (int c = 0; c < r.size(); c++) {
            String v = safeGet(r, c);
            if (v == null || v.isBlank()) continue;
            String nv = normalizeHeaderKey(v);
            for (String t : tokens) {
                if (nv.equalsIgnoreCase(normalizeHeaderKey(t))) return true;
            }
        }
        return false;
    }

    private static LocalDate parseKintaihyoCsvDate(String raw, Integer yearFromFile) {
        if (raw == null) return null;
        String s = raw.trim().replace("\uFEFF", "");
        if (s.isBlank()) return null;

        // Prefer existing flexible parsers first (YYYY-MM-DD, YYYY/M/D, YYYYMMDD)
        LocalDate d = parseFlexibleDate(s);
        if (d != null) return d;

        // Handle "4月1日(金)" / "4月1日" without a year using extracted year (or current year fallback)
        int y = (yearFromFile != null) ? yearFromFile : LocalDate.now().getYear();
        // 「N月N日」の直後の (曜) / （曜） のみ除去（備考内の括弧は残す）
        String cleaned = stripParentheticalsAfterJapaneseMonthDay(s);
        LocalDate kd = parseKintaihyoDate(cleaned, y);
        if (kd != null) return kd;

        return null;
    }

    private static String safeGet(CSVRecord rec, int idx) {
        if (idx < 0) return null;
        try {
            String v = rec.get(idx);
            return v != null ? v.trim() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String safeGetAny(CSVRecord rec, List<String> names) {
        if (names == null) return null;
        for (String n : names) {
            try {
                if (rec.isMapped(n)) {
                    String v = rec.get(n);
                    if (v != null && !v.trim().isEmpty()) return v.trim();
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private static LocalDate parseFlexibleDate(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.isEmpty()) return null;
        s = s.replace("\uFEFF", "");

        // YYYYMMDD
        if (s.matches("^\\d{8}$")) {
            try {
                int y = Integer.parseInt(s.substring(0, 4));
                int m = Integer.parseInt(s.substring(4, 6));
                int d = Integer.parseInt(s.substring(6, 8));
                return LocalDate.of(y, m, d);
            } catch (RuntimeException ignored) {
                return null;
            }
        }

        // allow separators: -, /, .
        String normalized = s.replace('.', '/').replace('-', '/');
        // try yyyy/M/d
        try {
            DateTimeFormatter f = DateTimeFormatter.ofPattern("yyyy/M/d");
            return LocalDate.parse(normalized, f);
        } catch (DateTimeParseException ignored) {
        }
        // try ISO yyyy-MM-dd
        try {
            return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException ignored) {
        }
        return null;
    }

    private static LocalTime parseFlexibleTime(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.isEmpty()) return null;
        s = s.replace("\uFEFF", "");

        // HHmm / Hmm
        if (s.matches("^\\d{3,4}$")) {
            try {
                int v = Integer.parseInt(s);
                int h = v / 100;
                int m = v % 100;
                if (h < 0 || h > 23 || m < 0 || m > 59) return null;
                return LocalTime.of(h, m);
            } catch (RuntimeException ignored) {
                return null;
            }
        }

        // H:mm / HH:mm / HH:mm:ss
        if (s.matches("^\\d{1,2}:\\d{2}(:\\d{2})?$")) {
            try {
                if (s.length() == 5) {
                    return LocalTime.parse(s, DateTimeFormatter.ofPattern("HH:mm"));
                }
                if (s.matches("^\\d{1,2}:\\d{2}$")) {
                    return LocalTime.parse(String.format("%02d:%s", Integer.parseInt(s.split(":")[0]), s.split(":")[1]),
                            DateTimeFormatter.ofPattern("HH:mm"));
                }
                return LocalTime.parse(s);
            } catch (RuntimeException ignored) {
                return null;
            }
        }
        return null;
    }

    private static int parseFlexibleBreakMinutes(String raw) {
        if (raw == null || raw.trim().isEmpty()) return 0;
        String s = raw.trim();
        s = s.replace("\uFEFF", "");
        if (s.matches("^\\d+:\\d{2}$")) {
            String[] p = s.split(":");
            int h = Integer.parseInt(p[0]);
            int m = Integer.parseInt(p[1]);
            return h * 60 + m;
        }
        if (s.matches("^\\d+$")) {
            return Integer.parseInt(s);
        }
        // allow decimal like "60.0"
        if (s.matches("^\\d+\\.\\d+$")) {
            return (int) Math.round(Double.parseDouble(s));
        }
        throw new IllegalArgumentException("休憩の形式が正しくありません。（分 または H:MM）");
    }

    private static final Pattern YEAR_PATTERN  = Pattern.compile("(\\d{4})年");
    private static final Pattern DATE_PATTERN  = Pattern.compile("(\\d{1,2})月(\\d{1,2})日");
    /** 「4月1日(火)」「4月1日（水）」の括弧内（曜日など）を除去 */
    private static final Pattern MONTH_DAY_PAREN_SUFFIX =
            Pattern.compile("(\\d{1,2}月\\d{1,2}日)(\\s*[(（][^)）]*[)）])+");

    private static String stripParentheticalsAfterJapaneseMonthDay(String s) {
        if (s == null || s.isBlank()) {
            return s;
        }
        return MONTH_DAY_PAREN_SUFFIX.matcher(s.trim()).replaceAll("$1");
    }

    private int extractKintaihyoYear(Sheet sheet) {
        Row r = sheet.getRow(2); // row index 2 = Excel row 3
        if (r != null) {
            String h = readCellString(r, 1);
            if (h != null) {
                Matcher m = YEAR_PATTERN.matcher(h);
                if (m.find()) return Integer.parseInt(m.group(1));
            }
        }
        return LocalDate.now().getYear();
    }

    private static LocalDate parseKintaihyoDate(String dateStr, int year) {
        Matcher m = DATE_PATTERN.matcher(dateStr);
        if (!m.find()) return null;
        try {
            int month = Integer.parseInt(m.group(1));
            int day   = Integer.parseInt(m.group(2));
            return LocalDate.of(year, month, day);
        } catch (Exception e) {
            return null;
        }
    }

    /** B列が文字列のときだけ（合計行判定用）。数値日付セルでは null。 */
    private static String readKintaihyoDateAsRawString(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        CellType t = c.getCellType();
        if (t == CellType.FORMULA) {
            t = c.getCachedFormulaResultType();
        }
        if (t != CellType.STRING) return null;
        String s = c.getStringCellValue();
        return s != null ? s.trim() : null;
    }

    /**
     * 勤務表 B列: 「4月1日(火)」形式の文字列、または Excel 日付シリアル（表示は日付だが内部が数値）を {@link LocalDate} に変換。
     */
    private static LocalDate readKintaihyoWorkDate(Row row, int idx, int yearFromHeader, Workbook wb) {
        Cell c = row.getCell(idx);
        if (c == null) return null;

        CellType type = c.getCellType();
        if (type == CellType.FORMULA) {
            type = c.getCachedFormulaResultType();
        }

        if (type == CellType.STRING) {
            String s = c.getStringCellValue().trim();
            if (s.isBlank()) return null;
            s = stripParentheticalsAfterJapaneseMonthDay(s);
            return parseKintaihyoDate(s, yearFromHeader);
        }

        if (type == CellType.NUMERIC) {
            double v = c.getNumericCellValue();
            try {
                if (DateUtil.isCellDateFormatted(c)) {
                    return c.getLocalDateTimeCellValue().toLocalDate();
                }
                // 書式が「日付」でなくてもシリアル値として有効なら日付列とみなす（時刻のみの小数は除外）
                if (v >= 1.0 && DateUtil.isValidExcelDate(v)) {
                    boolean use1904 = wb instanceof Date1904Support && ((Date1904Support) wb).isDate1904();
                    Date d = DateUtil.getJavaDate(v, use1904);
                    return d.toInstant().atZone(ZoneId.of("Asia/Seoul")).toLocalDate();
                }
            } catch (Exception ignored) {
                return null;
            }
        }

        return null;
    }

    /** 勤務表の時刻セル（STRING "9:00" または Excel time fraction または FORMULA）を LocalTime に変換 */
    private static LocalTime readKintaihyoTime(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return null;
        CellType type = c.getCellType();
        if (type == CellType.FORMULA) {
            type = c.getCachedFormulaResultType();
        }
        if (type == CellType.STRING) {
            String s = c.getStringCellValue().trim();
            if (s.isBlank()) return null;
            return parseKintaihyoTime(s);
        }
        if (type == CellType.NUMERIC) {
            double v = c.getNumericCellValue();
            if (v >= 0 && v < 1.0) {
                int totalSeconds = (int) Math.round(v * 24 * 3600);
                int h = totalSeconds / 3600;
                int m = (totalSeconds % 3600) / 60;
                return LocalTime.of(Math.min(23, h), Math.min(59, m));
            }
        }
        return null;
    }

    private static LocalTime parseKintaihyoTime(String s) {
        if (s == null || s.isBlank()) return null;
        s = s.trim();
        try {
            if (s.matches("\\d{1,2}:\\d{2}")) {
                String[] p = s.split(":");
                return LocalTime.of(Integer.parseInt(p[0]), Integer.parseInt(p[1]));
            }
            return LocalTime.parse(s);
        } catch (Exception e) {
            return null;
        }
    }

    /** 勤務表の休憩セル（STRING "1:00" または Excel time fraction または 整数分）を分に変換 */
    private static int readKintaihyoBreakMinutes(Row row, int idx) {
        Cell c = row.getCell(idx);
        if (c == null) return 0;
        if (c.getCellType() == CellType.STRING) {
            String s = c.getStringCellValue().trim();
            if (s.isBlank()) return 0;
            if (s.matches("\\d{1,2}:\\d{2}")) {
                String[] p = s.split(":");
                return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
            }
            try { return Integer.parseInt(s); } catch (NumberFormatException e) { return 0; }
        }
        if (c.getCellType() == CellType.NUMERIC) {
            double v = c.getNumericCellValue();
            if (v > 0 && v < 1.0) {
                int totalSeconds = (int) Math.round(v * 24 * 3600);
                return totalSeconds / 60;
            }
            return (int) Math.round(v);
        }
        return 0;
    }

    private static String safeFileName(String name) {
        if (name == null) return "unknown";
        return name.length() > 100 ? name.substring(0, 100) : name;
    }

    private static String friendlyUnexpectedImportMessage(Throwable ex) {
        String raw = ex.getMessage();
        if (raw != null) {
            String lower = raw.toLowerCase();
            if (lower.contains("zip") || lower.contains("ooxml") || lower.contains("invalid header")) {
                return "Excel（.xlsx）ファイルではないか、破損している可能性があります。正しいファイルかご確認ください。";
            }
        }
        return raw != null && !raw.isBlank()
                ? "取り込み中にエラーが発生しました: " + raw
                : "取り込み中に不明なエラーが発生しました。";
    }
}

