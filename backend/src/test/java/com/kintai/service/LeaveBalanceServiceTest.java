package com.kintai.service;

import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.entity.VacationType;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Import(LeaveBalanceService.class)
class LeaveBalanceServiceTest {

    @Autowired EmployeeRepository employeeRepository;
    @Autowired VacationRequestRepository vacationRequestRepository;
    @Autowired LeaveBalanceService leaveBalanceService;

    @Test
    void grantsAfterSixMonths_andCountsHalfDay() {
        Employee e = employeeRepository.save(Employee.builder()
                .employeeCode("EMP00001")
                .employeeName("Taro")
                .hourlyCost(new java.math.BigDecimal("1000.00"))
                .activeFlag(1)
                .hireDate(LocalDate.of(2026, 1, 1))
                .build());

        // before grant
        var balBefore = leaveBalanceService.forEmployee(e.getEmployeeId(), LocalDate.of(2026, 6, 30));
        assertFalse(balBefore.isGranted());
        assertEquals(new BigDecimal("0.0"), balBefore.getRemainingDays());

        // after grant + usage
        VacationRequest v1 = VacationRequest.builder()
                .employee(e)
                .vacationType(VacationType.FULL)
                .vacationDate(LocalDate.of(2026, 7, 2))
                .status(VacationStatus.APPROVED)
                .build();
        VacationRequest v2 = VacationRequest.builder()
                .employee(e)
                .vacationType(VacationType.HALF_AM)
                .vacationDate(LocalDate.of(2026, 7, 3))
                .status(VacationStatus.PENDING)
                .build();
        vacationRequestRepository.save(v1);
        vacationRequestRepository.save(v2);

        var bal = leaveBalanceService.forEmployee(e.getEmployeeId(), LocalDate.of(2026, 7, 10));
        assertTrue(bal.isGranted());
        assertEquals(new BigDecimal("10.0"), bal.getGrantedDays());
        assertEquals(new BigDecimal("1.5"), bal.getUsedDays());
        assertEquals(new BigDecimal("8.5"), bal.getRemainingDays());
    }
}

