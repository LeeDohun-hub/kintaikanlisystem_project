package com.kintai.service;

import com.kintai.entity.Employee;
import com.kintai.entity.EmployeeAccount;
import com.kintai.entity.Role;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.entity.VacationType;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(LeaveBalanceService.class)
class LeaveBalanceServiceTest {

    @Autowired EmployeeRepository employeeRepository;
    @Autowired EmployeeAccountRepository employeeAccountRepository;
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
        assertEquals(0, BigDecimal.ZERO.compareTo(balBefore.getRemainingDays()));

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

        // 初回付与後（有効付与は 6ヶ月目付与の 10 日のみ）
        var bal = leaveBalanceService.forEmployee(e.getEmployeeId(), LocalDate.of(2026, 7, 10));
        assertTrue(bal.isGranted());
        assertEquals(new BigDecimal("10.0"), bal.getGrantedDays());
        assertEquals(0L, bal.getMonthsSinceGrant());
        assertEquals(new BigDecimal("1.5"), bal.getUsedDays());
        assertEquals(new BigDecimal("8.5"), bal.getRemainingDays());

        var bal1m = leaveBalanceService.forEmployee(e.getEmployeeId(), LocalDate.of(2026, 8, 1));
        assertEquals(new BigDecimal("10.0"), bal1m.getGrantedDays());
        assertEquals(0L, bal1m.getMonthsSinceGrant());
        assertEquals(new BigDecimal("8.5"), bal1m.getRemainingDays());

        var bal3m = leaveBalanceService.forEmployee(e.getEmployeeId(), LocalDate.of(2026, 10, 1));
        assertEquals(new BigDecimal("10.0"), bal3m.getGrantedDays());
        assertEquals(0L, bal3m.getMonthsSinceGrant());
    }

    @Test
    void admin_hasUnlimitedAnnualLeave_balanceIgnoresQuota() {
        Employee e = employeeRepository.save(Employee.builder()
                .employeeCode("ADM00001")
                .employeeName("AdminUser")
                .hourlyCost(new java.math.BigDecimal("1000.00"))
                .activeFlag(1)
                .hireDate(LocalDate.of(2026, 4, 15))
                .build());
        employeeAccountRepository.save(EmployeeAccount.builder()
                .employee(e)
                .loginId("admin_leave_test")
                .passwordHash("{noop}x")
                .role(Role.ADMIN)
                .build());

        var balEarly = leaveBalanceService.forEmployee(e.getEmployeeId(), LocalDate.of(2026, 5, 1));
        assertTrue(balEarly.isGranted());
        assertTrue(balEarly.isUnlimitedAnnualLeave());
        assertNull(balEarly.getRemainingDays());
        assertNull(balEarly.getGrantedDays());
        assertEquals(new BigDecimal("0.0"), balEarly.getUsedDays());

        VacationRequest usedEarly = VacationRequest.builder()
                .employee(e)
                .vacationType(VacationType.FULL)
                .vacationDate(LocalDate.of(2026, 5, 10))
                .status(VacationStatus.APPROVED)
                .build();
        vacationRequestRepository.save(usedEarly);

        var balAfterUse = leaveBalanceService.forEmployee(e.getEmployeeId(), LocalDate.of(2026, 5, 20));
        assertTrue(balAfterUse.isUnlimitedAnnualLeave());
        assertNull(balAfterUse.getRemainingDays());
        assertEquals(new BigDecimal("1.0"), balAfterUse.getUsedDays());
    }
}

