package com.kintai.service;

import com.kintai.config.AppInviteProperties;
import com.kintai.dto.WorkTimeResponse;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceReportEmailService {

    private final WorkTimeService workTimeService;
    private final EmployeeRepository employeeRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AppInviteProperties appInviteProperties;
    private final Environment environment;

    /**
     * 指定月の勤怠データをExcelに変換し、管理者宛にメール送信する。
     */
    public void sendMonthlyReport(Long employeeId, String month) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("従業員が見つかりません。"));

        List<WorkTimeResponse> records = workTimeService.listForEmployeeMonth(month, employeeId);
        if (records.isEmpty()) {
            throw new IllegalStateException(month + " の勤務データがありません。");
        }

        byte[] excelBytes = generateExcel(employee, month, records);

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new IllegalStateException(
                    "メール送信が利用できません。spring.mail.host 等を設定してください。");
        }

        String from = resolveFromAddress();
        String adminTo = resolveAdminEmail();

        String employeeName = employee.getEmployeeName() != null ? employee.getEmployeeName().trim() : "";
        String subject = employeeName + " 様の " + month + " 勤務表";
        String fileName = month + "_勤務表_" + employeeName + ".xlsx";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(new InternetAddress(from));
            helper.setTo(new InternetAddress(adminTo.trim()));
            helper.setSubject(subject);

            String body = employeeName + " 様の " + month + " 月分の勤怠レポートを添付ファイルにてお送りします。\n\n"
                    + "件数: " + records.size() + " 日分\n\n"
                    + "※このメールは勤怠管理システムより自動送信されました。";
            helper.setText(body, false);
            helper.addAttachment(fileName,
                    new org.springframework.core.io.ByteArrayResource(excelBytes),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

            mailSender.send(message);
        } catch (Exception ex) {
            throw new IllegalStateException("メールの送信に失敗しました: " + ex.getMessage(), ex);
        }
    }

    private byte[] generateExcel(Employee employee, String month, List<WorkTimeResponse> records) {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet(month + " 勤怠");

            // スタイル定義
            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle titleStyle = wb.createCellStyle();
            Font titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);

            CellStyle centerStyle = wb.createCellStyle();
            centerStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle totalStyle = wb.createCellStyle();
            Font totalFont = wb.createFont();
            totalFont.setBold(true);
            totalStyle.setFont(totalFont);
            totalStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
            totalStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // タイトル行
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            String employeeName = employee.getEmployeeName() != null ? employee.getEmployeeName().trim() : "";
            titleCell.setCellValue(month + " 月 勤怠一覧  (" + employeeName + ")");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));
            titleRow.setHeightInPoints(24);

            // 空白行
            sheet.createRow(1);

            // ヘッダ行
            String[] headers = {"日付", "始業", "終業", "休憩", "実働(当日)", "実働(累計)", "備考"};
            Row headerRow = sheet.createRow(2);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // データ行
            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy/MM/dd");
            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

            int rowIdx = 3;
            for (WorkTimeResponse r : records) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(
                        r.getWorkDate() != null ? r.getWorkDate().format(dateFmt) : "");
                row.createCell(1).setCellValue(
                        r.getStartTime() != null ? r.getStartTime().format(timeFmt) : "");
                row.createCell(2).setCellValue(
                        r.getEndTime() != null ? r.getEndTime().format(timeFmt) : "");
                row.createCell(3).setCellValue(
                        r.getBreakMinutes() != null ? formatMinutes(r.getBreakMinutes()) : "");
                row.createCell(4).setCellValue(
                        r.getDailyWorkHm() != null ? r.getDailyWorkHm()
                                : (r.getWorkMinutes() != null ? formatMinutes(r.getWorkMinutes()) : ""));
                row.createCell(5).setCellValue(
                        r.getCumulativeWorkHm() != null ? r.getCumulativeWorkHm() : "");
                row.createCell(6).setCellValue(
                        r.getRemarks() != null ? r.getRemarks() : "");

                // 日付・時刻列をセンタリング
                for (int c = 0; c <= 5; c++) {
                    row.getCell(c).setCellStyle(centerStyle);
                }
            }

            // 合計行
            int totalWorkMinutes = records.stream()
                    .mapToInt(r -> r.getWorkMinutes() != null ? r.getWorkMinutes() : 0)
                    .sum();
            Row totalRow = sheet.createRow(rowIdx);
            Cell totalLabelCell = totalRow.createCell(0);
            totalLabelCell.setCellValue("合計");
            totalLabelCell.setCellStyle(totalStyle);
            Cell totalValueCell = totalRow.createCell(4);
            totalValueCell.setCellValue(formatMinutes(totalWorkMinutes));
            totalValueCell.setCellStyle(totalStyle);
            for (int c = 1; c <= 3; c++) {
                totalRow.createCell(c).setCellStyle(totalStyle);
            }
            totalRow.createCell(5).setCellStyle(totalStyle);
            totalRow.createCell(6).setCellStyle(totalStyle);

            // 列幅自動調整
            int[] colWidths = {3200, 2200, 2200, 2200, 2800, 2800, 8000};
            for (int i = 0; i < colWidths.length; i++) {
                sheet.setColumnWidth(i, colWidths[i]);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Excelファイルの生成に失敗しました: " + e.getMessage(), e);
        }
    }

    private static String formatMinutes(int minutes) {
        int h = minutes / 60;
        int m = minutes % 60;
        return String.format("%d:%02d", h, m);
    }

    private String resolveFromAddress() {
        String configured = appInviteProperties.getFromAddress() != null
                ? appInviteProperties.getFromAddress().trim() : "";
        if (!configured.isEmpty()) return configured;
        return environment.getProperty("spring.mail.username", "");
    }

    private String resolveAdminEmail() {
        String configured = appInviteProperties.getAdminEmail() != null
                ? appInviteProperties.getAdminEmail().trim() : "";
        if (!configured.isEmpty()) return configured;
        String mailUsername = environment.getProperty("spring.mail.username", "");
        if (mailUsername.isBlank()) {
            throw new IllegalStateException(
                    "管理者メールアドレスが未設定です。app.invite.admin-email または spring.mail.username を設定してください。");
        }
        return mailUsername;
    }
}
