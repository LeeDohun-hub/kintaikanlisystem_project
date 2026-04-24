package com.kintai.service;

import com.kintai.dto.WorkTimeCreateRequest;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WorkTimeServiceTest {

    @Autowired
    WorkTimeService workTimeService;

    @Autowired
    EmployeeRepository employeeRepository;

    @Test
    void create_rejectsDuplicateWorkDateForSameEmployee() {
        Employee emp = employeeRepository.save(Employee.builder()
                .employeeCode("EMP_T1")
                .employeeName("Test")
                .hourlyCost(BigDecimal.ZERO)
                .activeFlag(1)
                .build());

        WorkTimeCreateRequest req1 = new WorkTimeCreateRequest();
        req1.setWorkDate(LocalDate.of(2026, 4, 9));
        req1.setStartTime(LocalTime.of(9, 0));
        req1.setEndTime(LocalTime.of(18, 0));
        req1.setBreakMinutes(60);
        req1.setRemarks("first");

        workTimeService.create(emp.getEmployeeId(), req1);

        WorkTimeCreateRequest req2 = new WorkTimeCreateRequest();
        req2.setWorkDate(LocalDate.of(2026, 4, 9));
        req2.setStartTime(LocalTime.of(10, 0));
        req2.setEndTime(LocalTime.of(19, 0));
        req2.setBreakMinutes(30);
        req2.setRemarks("dup");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> workTimeService.create(emp.getEmployeeId(), req2));
        assertTrue(ex.getMessage().contains("同一勤務日"));
    }

    @Test
    void create_rejectsOutingLongerThan2hUnlessEndMatchesWorkEnd() {
        Employee emp = employeeRepository.save(Employee.builder()
                .employeeCode("EMP_OUT")
                .employeeName("Outing")
                .hourlyCost(BigDecimal.ZERO)
                .activeFlag(1)
                .build());

        WorkTimeCreateRequest bad = new WorkTimeCreateRequest();
        bad.setWorkDate(LocalDate.of(2026, 5, 1));
        bad.setStartTime(LocalTime.of(9, 0));
        bad.setEndTime(LocalTime.of(18, 0));
        bad.setBreakMinutes(60);
        bad.setOutingStartTime(LocalTime.of(10, 0));
        bad.setOutingEndTime(LocalTime.of(13, 30)); // 210 min

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> workTimeService.create(emp.getEmployeeId(), bad));
        assertTrue(ex.getMessage().contains("2時間"));

        WorkTimeCreateRequest ok = new WorkTimeCreateRequest();
        ok.setWorkDate(LocalDate.of(2026, 5, 2));
        ok.setStartTime(LocalTime.of(9, 0));
        ok.setEndTime(LocalTime.of(13, 30));
        ok.setBreakMinutes(60);
        ok.setOutingStartTime(LocalTime.of(10, 0));
        ok.setOutingEndTime(LocalTime.of(13, 30));

        assertDoesNotThrow(() -> workTimeService.create(emp.getEmployeeId(), ok));
    }
}

