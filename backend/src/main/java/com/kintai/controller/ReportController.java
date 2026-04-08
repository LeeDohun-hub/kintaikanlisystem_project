package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.MonthlyStatisticsResponse;
import com.kintai.service.StatisticsService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final StatisticsService statisticsService;

    @GetMapping(value = "/monthly.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> monthlyPdf(@RequestParam("month") String month, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();

        MonthlyStatisticsResponse data;
        try {
            data = "ADMIN".equals(user.getRole())
                    ? statisticsService.monthly(month)
                    : statisticsService.monthlyForEmployee(month, user.getId());
        } catch (DateTimeParseException e) {
            return ApiResponses.badRequest("월 형식이 올바르지 않습니다. (YYYY-MM)");
        }

        byte[] pdf = buildMonthlyPdf(data);
        String filename = "monthly-report-" + month + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private static byte[] buildMonthlyPdf(MonthlyStatisticsResponse data) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document();
        PdfWriter.getInstance(doc, out);
        doc.open();

        Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
        Font normal = new Font(Font.HELVETICA, 11);

        Paragraph title = new Paragraph("勤怠 月次レポート " + data.getMonth(), titleFont);
        title.setAlignment(Element.ALIGN_LEFT);
        doc.add(title);
        doc.add(new Paragraph(" ", normal));
        doc.add(new Paragraph("総勤務時間(分): " + data.getTotalWorkMinutes(), normal));
        doc.add(new Paragraph(" ", normal));

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2.2f, 3.2f, 2.2f, 2.4f});

        addHeader(table, "社員コード");
        addHeader(table, "社員名");
        addHeader(table, "勤務(分)");
        addHeader(table, "勤務(時間)");

        if (data.getByEmployee() != null) {
            for (MonthlyStatisticsResponse.ByEmployee e : data.getByEmployee()) {
                addCell(table, e.getEmployeeCode() != null ? e.getEmployeeCode() : "-");
                addCell(table, e.getEmployeeName() != null ? e.getEmployeeName() : "-");
                addCell(table, String.valueOf(e.getTotalWorkMinutes()));
                addCell(table, String.format("%.2f", e.getTotalWorkMinutes() / 60.0));
            }
        }

        doc.add(table);
        doc.close();
        return out.toByteArray();
    }

    private static void addHeader(PdfPTable table, String text) {
        Font font = new Font(Font.HELVETICA, 11, Font.BOLD);
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setPadding(6f);
        table.addCell(cell);
    }

    private static void addCell(PdfPTable table, String text) {
        Font font = new Font(Font.HELVETICA, 11);
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setPadding(6f);
        table.addCell(cell);
    }
}

