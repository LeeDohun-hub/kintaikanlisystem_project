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
}

