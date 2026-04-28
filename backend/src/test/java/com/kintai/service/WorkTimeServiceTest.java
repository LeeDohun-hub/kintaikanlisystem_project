package com.kintai.service;

import com.kintai.dto.WorkTimeCreateRequest;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.WorkTimeRepository;
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

    @Autowired
    WorkTimeRepository workTimeRepository;

    @Test
    void create_overwritesSameWorkDateForSameEmployee() {
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

        assertDoesNotThrow(() -> workTimeService.create(emp.getEmployeeId(), req2));

        var rows = workTimeRepository.findAll().stream()
                .filter(w -> w.getEmployeeId().equals(emp.getEmployeeId()) && w.getWorkDate().equals(LocalDate.of(2026, 4, 9)))
                .toList();
        assertEquals(1, rows.size());
        assertEquals(LocalTime.of(10, 0), rows.get(0).getStartTime());
        assertEquals(LocalTime.of(19, 0), rows.get(0).getEndTime());
        assertEquals(30, rows.get(0).getBreakMinutes());
        assertEquals("dup", rows.get(0).getRemarks());
    }

    @Test
    void create_acceptsLongOutingWithinWorkWindow_andShortDayWithOutingToWorkEnd() {
        Employee emp = employeeRepository.save(Employee.builder()
                .employeeCode("EMP_OUT")
                .employeeName("Outing")
                .hourlyCost(BigDecimal.ZERO)
                .activeFlag(1)
                .build());

        WorkTimeCreateRequest longOuting = new WorkTimeCreateRequest();
        longOuting.setWorkDate(LocalDate.of(2026, 5, 1));
        longOuting.setStartTime(LocalTime.of(9, 0));
        longOuting.setEndTime(LocalTime.of(18, 0));
        longOuting.setBreakMinutes(60);
        longOuting.setOutingStartTime(LocalTime.of(10, 0));
        longOuting.setOutingEndTime(LocalTime.of(13, 30)); // 210 min within 9–18

        assertDoesNotThrow(() -> workTimeService.create(emp.getEmployeeId(), longOuting));

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

