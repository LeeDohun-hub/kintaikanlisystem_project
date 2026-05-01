package com.kintai.service.importer;

import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAttendanceExcelRowParserTest {

    @Mock
    EmployeeRepository employeeRepository;

    @Test
    void parseRow_acceptsNumericEmployeeIdAndParsesCells() throws Exception {
        when(employeeRepository.existsById(100L)).thenReturn(true);

        AdminAttendanceExcelRowParser parser = new AdminAttendanceExcelRowParser(employeeRepository);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("s1");
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("100");               // A employee id
            row.createCell(1).setCellValue("2026-04-01");        // B work date
            row.createCell(2).setCellValue("09:00");             // C start
            row.createCell(3).setCellValue("18:00");             // D end
            row.createCell(4).setCellValue("60");                // E break minutes
            row.createCell(5).setCellValue("  remark  ");        // F remarks

            AdminAttendanceExcelRowParser.ParsedRow parsed = parser.parseRow(row);
            assertEquals(100L, parsed.employeeId());
            assertEquals(LocalDate.of(2026, 4, 1), parsed.workDate());
            assertEquals(LocalTime.of(9, 0), parsed.start());
            assertEquals(LocalTime.of(18, 0), parsed.end());
            assertEquals(60, parsed.breakMinutes());
            assertEquals("remark", parsed.remarks());
        }
    }

    @Test
    void parseRow_acceptsEmployeeCode() throws Exception {
        when(employeeRepository.findByEmployeeCode("E001")).thenReturn(Optional.of(
                Employee.builder().employeeId(7L).employeeCode("E001").build()
        ));

        AdminAttendanceExcelRowParser parser = new AdminAttendanceExcelRowParser(employeeRepository);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("s1");
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("E001");              // A employee code
            row.createCell(1).setCellValue("2026-04-01");        // B work date
            row.createCell(2).setCellValue("09:00");             // C start
            row.createCell(3).setCellValue("18:00");             // D end
            row.createCell(4).setCellValue("0");                 // E break minutes

            AdminAttendanceExcelRowParser.ParsedRow parsed = parser.parseRow(row);
            assertEquals(7L, parsed.employeeId());
        }
    }
}

