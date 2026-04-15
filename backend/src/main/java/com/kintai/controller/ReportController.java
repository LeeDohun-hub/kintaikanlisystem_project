package com.kintai.controller;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.MonthlyStatisticsResponse;
import com.kintai.dto.WorkTimeResponse;
import com.kintai.pdf.PdfFontSupport;
import com.kintai.service.StatisticsService;
import com.kintai.service.WorkTimeService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.util.WorkTimeFormatUtil;
import com.kintai.web.ApiResponses;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final StatisticsService statisticsService;
    private final WorkTimeService workTimeService;

    @AdminOnly
    @GetMapping(value = "/monthly.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> monthlyPdf(
            @RequestParam("month") String month,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();

        MonthlyStatisticsResponse data;
        List<WorkTimeResponse> detailLines;
        try {
            if ("ADMIN".equals(user.getRole())) {
                if (employeeId != null) {
                    data = statisticsService.monthlyForEmployee(month, employeeId);
                    detailLines = workTimeService.listForEmployeeMonth(month, employeeId);
                } else {
                    data = statisticsService.monthly(month);
                    detailLines = workTimeService.listByMonth(month, user);
                }
            } else {
                data = statisticsService.monthlyForEmployee(month, user.getId());
                detailLines = workTimeService.listByMonth(month, user);
            }
        } catch (DateTimeParseException e) {
            return ApiResponses.badRequest("月の形式が正しくありません。（YYYY-MM）");
        }

        byte[] pdf = buildMonthlyPdf(data, detailLines);
        String filename = "monthly-report-" + month + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private static byte[] buildMonthlyPdf(MonthlyStatisticsResponse data, List<WorkTimeResponse> detailLines) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // 横置き: 勤務履歴と同じ7列+備考が1ページ目で収まりやすい（従来の集計4列表は省略）
        Document doc = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(doc, out);
        doc.open();

        Font titleFont = PdfFontSupport.font(16, Font.BOLD);
        Font normal = PdfFontSupport.font(11, Font.NORMAL);
        Font headerFont = PdfFontSupport.font(11, Font.BOLD);

        Paragraph title = new Paragraph("勤怠 月次レポート " + data.getMonth(), titleFont);
        title.setAlignment(Element.ALIGN_LEFT);
        doc.add(title);
        doc.add(new Paragraph(" ", normal));
        doc.add(new Paragraph("総勤務時間(分): " + data.getTotalWorkMinutes(), normal));
        doc.add(new Paragraph(" ", normal));
        doc.add(new Paragraph(" ", normal));

        // work-history 画面と同一: 日付 / 始業 / 終業 / 休憩 / 実働(当日) / 実働(累計) / 備考
        PdfPTable detailTable = new PdfPTable(7);
        detailTable.setWidthPercentage(100);
        detailTable.setWidths(new float[]{2.6f, 1.5f, 1.5f, 1.4f, 1.6f, 1.6f, 5.0f});
        detailTable.setHeaderRows(1);

        addHeader(detailTable, "日付", headerFont);
        addHeader(detailTable, "始業", headerFont);
        addHeader(detailTable, "終業", headerFont);
        addHeader(detailTable, "休憩", headerFont);
        addHeader(detailTable, "実働(当日)", headerFont);
        addHeader(detailTable, "実働(累計)", headerFont);
        addHeader(detailTable, "備考", headerFont);

        if (detailLines == null || detailLines.isEmpty()) {
            addCell(detailTable, "データなし", normal);
            addCell(detailTable, "-", normal);
            addCell(detailTable, "-", normal);
            addCell(detailTable, "-", normal);
            addCell(detailTable, "-", normal);
            addCell(detailTable, "-", normal);
            addCell(detailTable, "-", normal);
        } else {
            for (WorkTimeResponse w : detailLines) {
                addCell(detailTable, formatPdfDate(w.getWorkDate()), normal);
                addCell(detailTable, formatPdfTime(w.getStartTime()), normal);
                addCell(detailTable, formatPdfTime(w.getEndTime()), normal);
                int br = w.getBreakMinutes() != null ? w.getBreakMinutes() : 0;
                addCell(detailTable, WorkTimeFormatUtil.minutesToHm(br), normal);
                int daily = w.getWorkMinutes() != null ? w.getWorkMinutes() : 0;
                String dailyHm = w.getDailyWorkHm() != null ? w.getDailyWorkHm() : WorkTimeFormatUtil.minutesToHm(daily);
                addCell(detailTable, dailyHm, normal);
                String cumHm = w.getCumulativeWorkHm() != null ? w.getCumulativeWorkHm() : "—";
                addCell(detailTable, cumHm, normal);
                addWrappedCell(detailTable, w.getRemarks() != null ? w.getRemarks() : "", normal);
            }
        }

        doc.add(detailTable);
        doc.close();
        return out.toByteArray();
    }

    /** PDF 用 yyyy-MM-dd */
    private static String formatPdfDate(LocalDate d) {
        return d != null ? d.toString() : "-";
    }

    private static String formatPdfTime(LocalTime t) {
        if (t == null) {
            return "-";
        }
        return String.format("%02d:%02d", t.getHour(), t.getMinute());
    }

    private static void addHeader(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setPadding(6f);
        table.addCell(cell);
    }

    private static void addCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setPadding(6f);
        table.addCell(cell);
    }

    /** 備考: 長文を折り返し */
    private static void addWrappedCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Paragraph(text != null ? text : "", font));
        cell.setPadding(6f);
        cell.setNoWrap(false);
        table.addCell(cell);
    }
}

