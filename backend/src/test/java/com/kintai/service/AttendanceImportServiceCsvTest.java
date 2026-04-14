package com.kintai.service;

import com.kintai.dto.ImportAttendanceResponse;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkTimeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceImportServiceCsvTest {

    @Autowired
    AttendanceImportService attendanceImportService;

    @Autowired
    EmployeeRepository employeeRepository;

    @Autowired
    WorkTimeRepository workTimeRepository;

    @Test
    void importKintaihyo_acceptsUtf8CsvWithHeader_andUpsertsByDay() {
        Employee emp = employeeRepository.save(Employee.builder()
                .employeeCode("EMP_CSV1")
                .employeeName("Test")
                .hourlyCost(BigDecimal.ZERO)
                .activeFlag(1)
                .build());

        String csv = String.join("\n",
                "workDate,startTime,endTime,breakMinutes,remarks",
                "2026-04-01,09:00,18:00,60,first",
                "20260401,0900,1800,1:00,updated"
        );
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "kintaihyo.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        ImportAttendanceResponse res = attendanceImportService.importKintaihyo(file, emp.getEmployeeId());
        assertEquals(2, res.getSuccessCount());
        assertEquals(0, res.getErrorCount());
        assertEquals(1, res.getUpdatedExistingDays());

        assertTrue(workTimeRepository.existsByEmployeeIdAndWorkDate(emp.getEmployeeId(), LocalDate.of(2026, 4, 1)));
        var saved = workTimeRepository.findFirstByEmployeeIdAndWorkDateOrderByWorkIdAsc(emp.getEmployeeId(), LocalDate.of(2026, 4, 1)).orElseThrow();
        assertEquals("updated", saved.getRemarks());
        assertEquals(60, saved.getBreakMinutes());
    }

    @Test
    void importKintaihyo_allowsBomAndEmptyHeaderNames_fromTrailingCommas() {
        Employee emp = employeeRepository.save(Employee.builder()
                .employeeCode("EMP_CSV_BOM")
                .employeeName("Test")
                .hourlyCost(BigDecimal.ZERO)
                .activeFlag(1)
                .build());

        // Leading BOM + trailing commas produce empty header names in some exports
        String csv = String.join("\n",
                "\uFEFFworkDate,startTime,endTime,breakMinutes,remarks,,,,,,",
                "2026-04-01,09:00,18:00,60,ok,,,,,,"
        );
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "kintaihyo_bom.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        ImportAttendanceResponse res = attendanceImportService.importKintaihyo(file, emp.getEmployeeId());
        assertEquals(1, res.getSuccessCount());
        assertEquals(0, res.getErrorCount());
        assertTrue(workTimeRepository.existsByEmployeeIdAndWorkDate(emp.getEmployeeId(), LocalDate.of(2026, 4, 1)));
    }

    @Test
    void importKintaihyo_acceptsTwoRowHeader_likeMergedExcelHeader() {
        Employee emp = employeeRepository.save(Employee.builder()
                .employeeCode("EMP_CSV_2ROW")
                .employeeName("Test")
                .hourlyCost(BigDecimal.ZERO)
                .activeFlag(1)
                .build());

        // 1st row has merged header "実働時間" spanning two columns; 2nd row has "当日/累計"
        // CSV cannot represent merge, so blanks appear in row1.
        String csv = String.join("\n",
                "\uFEFF月日,始業時刻,終業時刻,休憩,実働時間,,備考",
                ",,,,当日,累計,",
                "2026-04-01,10:00,18:00,1:00,7:00,7:00,ok"
        );

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "kintaihyo_2row.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        ImportAttendanceResponse res = attendanceImportService.importKintaihyo(file, emp.getEmployeeId());
        assertEquals(1, res.getSuccessCount());
        assertEquals(0, res.getErrorCount());
        assertTrue(workTimeRepository.existsByEmployeeIdAndWorkDate(emp.getEmployeeId(), LocalDate.of(2026, 4, 1)));
    }

    @Test
    void importKintaihyo_findsHeaderAfterPrefaceRows_andParsesJapaneseMonthDay() {
        Employee emp = employeeRepository.save(Employee.builder()
                .employeeCode("EMP_CSV_PREFACE")
                .employeeName("Test")
                .hourlyCost(BigDecimal.ZERO)
                .activeFlag(1)
                .build());

        String csv = String.join("\n",
                "2026年4月,分,業務報告書",
                "氏名,李秉勲(Lee DoHun)",
                "",
                "\uFEFF月日,始業時刻,終業時刻,休憩,実働時間,,備考",
                ",,,,当日,累計,",
                "4月1日(金),10:00,18:00,1:00,7:00,7:00,ok"
        );

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "kintaihyo_preface.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        ImportAttendanceResponse res = attendanceImportService.importKintaihyo(file, emp.getEmployeeId());
        assertEquals(1, res.getSuccessCount());
        assertEquals(0, res.getErrorCount());
        assertTrue(workTimeRepository.existsByEmployeeIdAndWorkDate(emp.getEmployeeId(), LocalDate.of(2026, 4, 1)));
    }
}

