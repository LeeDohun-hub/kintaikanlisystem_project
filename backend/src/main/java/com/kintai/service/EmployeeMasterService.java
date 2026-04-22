package com.kintai.service;

import com.kintai.dto.EmployeeCreateRequest;
import com.kintai.dto.EmployeeSummaryResponse;
import com.kintai.dto.EmployeeUpdateRequest;
import com.kintai.entity.Employee;
import com.kintai.entity.EmployeeAccount;
import com.kintai.entity.Role;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.repository.EmployeeRepository;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class EmployeeMasterService {

    private static final Pattern EMPLOYEE_CODE = Pattern.compile("^[A-Za-z0-9]{8}$");
    private static final Pattern LOGIN_ID = Pattern.compile("^\\S{1,50}$");

    private static final int PASSWORD_MIN_LEN = 8;
    private static final int PASSWORD_MAX_LEN = 72;

    private final EmployeeRepository employeeRepository;
    private final EmployeeAccountRepository employeeAccountRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public EmployeeSummaryResponse create(EmployeeCreateRequest req) {
        String code = req.getEmployeeCode() != null ? req.getEmployeeCode().trim() : "";
        String name = req.getEmployeeName() != null ? req.getEmployeeName().trim() : "";
        String loginId = req.getLoginId() != null ? req.getLoginId().trim() : "";
        String password = req.getPassword() != null ? req.getPassword() : "";
        String confirm = req.getConfirmPassword() != null ? req.getConfirmPassword() : "";

        if (code.isBlank() || name.isBlank()) {
            throw new IllegalArgumentException("社員コードと氏名は必須です。");
        }
        if (!EMPLOYEE_CODE.matcher(code).matches()) {
            throw new IllegalArgumentException("社員コードは8文字の英数字で入力してください。");
        }
        if (name.length() > 50) {
            throw new IllegalArgumentException("氏名は50文字以下です。");
        }
        if (!LOGIN_ID.matcher(loginId).matches()) {
            throw new IllegalArgumentException("ログインIDは1〜50文字で、空白は使えません。");
        }
        validatePasswordPolicy(password);
        if (!password.equals(confirm)) {
            throw new IllegalArgumentException("パスワードとパスワード（確認）が一致しません。");
        }
        if (employeeRepository.existsByEmployeeCode(code)) {
            throw new IllegalArgumentException("既に使用されている社員コードです。");
        }
        if (employeeAccountRepository.existsByLoginId(loginId)) {
            throw new IllegalArgumentException("既に使用されているログインIDです。");
        }

        if (req.getRole() == null || req.getRole().isBlank()) {
            throw new IllegalArgumentException("区分を選択してください。");
        }
        Role role;
        try {
            role = Role.valueOf(req.getRole().trim().toUpperCase());
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("区分が正しくありません。（ADMIN または EMPLOYEE）");
        }

        BigDecimal hourly = Objects.requireNonNullElse(req.getHourlyCost(), BigDecimal.ZERO);
        Integer active = req.getActiveFlag() != null ? req.getActiveFlag() : 1;
        if (active != 0 && active != 1) {
            throw new IllegalArgumentException("activeFlag は 0 または 1 である必要があります。");
        }

        LocalDate hireDate = req.getHireDate();
        if (hireDate == null) {
            throw new IllegalArgumentException("入社日を入力してください。");
        }
        if (hireDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("入社日に未来の日付は指定できません。");
        }

        String invite = normalizeOptionalInviteEmail(req.getInviteEmail());
        validateOptionalInviteEmail(invite);

        Employee e = Employee.builder()
                .employeeCode(code)
                .employeeName(name)
                .department(req.getDepartment() != null && !req.getDepartment().isBlank() ? req.getDepartment().trim() : null)
                .inviteEmail(invite)
                .hourlyCost(hourly)
                .activeFlag(active)
                .hireDate(hireDate)
                .build();
        employeeRepository.save(e);

        EmployeeAccount account = EmployeeAccount.builder()
                .employee(e)
                .loginId(loginId)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .build();
        employeeAccountRepository.save(account);

        return toSummary(e, account);
    }

    @Transactional
    public EmployeeSummaryResponse update(long employeeId, EmployeeUpdateRequest req) {
        Employee e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("従業員が見つかりません。"));

        String code = req.getEmployeeCode() != null ? req.getEmployeeCode().trim() : "";
        String name = req.getEmployeeName() != null ? req.getEmployeeName().trim() : "";
        if (code.isBlank() || name.isBlank()) {
            throw new IllegalArgumentException("社員コードと氏名は必須です。");
        }
        if (!EMPLOYEE_CODE.matcher(code).matches()) {
            throw new IllegalArgumentException("社員コードは8文字の英数字で入力してください。");
        }
        if (name.length() > 50) {
            throw new IllegalArgumentException("氏名は50文字以下です。");
        }
        if (employeeRepository.existsByEmployeeCodeAndEmployeeIdNot(code, employeeId)) {
            throw new IllegalArgumentException("既に使用されている社員コードです。");
        }

        BigDecimal hourly = Objects.requireNonNullElse(req.getHourlyCost(), BigDecimal.ZERO);
        Integer active = req.getActiveFlag() != null ? req.getActiveFlag() : 1;
        if (active != 0 && active != 1) {
            throw new IllegalArgumentException("activeFlag は 0 または 1 である必要があります。");
        }

        LocalDate hireDate = req.getHireDate();
        if (hireDate == null) {
            throw new IllegalArgumentException("入社日を入力してください。");
        }
        if (hireDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("入社日に未来の日付は指定できません。");
        }

        String invite = normalizeOptionalInviteEmail(req.getInviteEmail());
        validateOptionalInviteEmail(invite);

        e.setEmployeeCode(code);
        e.setEmployeeName(name);
        e.setDepartment(req.getDepartment() != null && !req.getDepartment().isBlank() ? req.getDepartment().trim() : null);
        e.setInviteEmail(invite);
        e.setHourlyCost(hourly);
        e.setActiveFlag(active);
        e.setHireDate(hireDate);
        employeeRepository.save(e);

        Optional<EmployeeAccount> accOpt = employeeAccountRepository.findById(employeeId);
        if (accOpt.isEmpty()) {
            return toSummary(e, null);
        }

        EmployeeAccount account = accOpt.get();
        String loginId = req.getLoginId() != null ? req.getLoginId().trim() : "";
        if (!LOGIN_ID.matcher(loginId).matches()) {
            throw new IllegalArgumentException("ログインIDは1〜50文字で、空白は使えません。");
        }
        if (employeeAccountRepository.existsByLoginIdAndEmployeeIdNot(loginId, employeeId)) {
            throw new IllegalArgumentException("既に使用されているログインIDです。");
        }
        if (req.getRole() == null || req.getRole().isBlank()) {
            throw new IllegalArgumentException("区分を選択してください。");
        }
        Role role;
        try {
            role = Role.valueOf(req.getRole().trim().toUpperCase());
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("区分が正しくありません。（ADMIN または EMPLOYEE）");
        }

        String password = req.getPassword() != null ? req.getPassword() : "";
        String confirm = req.getConfirmPassword() != null ? req.getConfirmPassword() : "";
        boolean passwordTouched = !password.isEmpty() || !confirm.isEmpty();
        if (passwordTouched) {
            validatePasswordPolicy(password);
            if (!password.equals(confirm)) {
                throw new IllegalArgumentException("パスワードとパスワード（確認）が一致しません。");
            }
            account.setPasswordHash(passwordEncoder.encode(password));
        }

        account.setLoginId(loginId);
        account.setRole(role);
        employeeAccountRepository.save(account);

        return toSummary(e, account);
    }

    @Transactional
    public EmployeeSummaryResponse updateInviteEmail(long employeeId, String inviteEmail) {
        Employee e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("従業員が見つかりません。"));
        String normalized = normalizeAndValidateInviteEmail(inviteEmail);
        e.setInviteEmail(normalized);
        employeeRepository.save(e);
        EmployeeAccount account = employeeAccountRepository.findById(employeeId).orElse(null);
        return toSummary(e, account);
    }

    private static String normalizeOptionalInviteEmail(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        return t.isEmpty() ? null : t;
    }

    private static void validateOptionalInviteEmail(String email) {
        if (email == null) {
            return;
        }
        normalizeAndValidateInviteEmail(email);
    }

    private static String normalizeAndValidateInviteEmail(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("メールアドレスを入力してください。");
        }
        String t = raw.trim();
        if (t.length() > 254) {
            throw new IllegalArgumentException("メールアドレスは254文字以下で入力してください。");
        }
        try {
            InternetAddress a = new InternetAddress(t);
            a.validate();
        } catch (AddressException ex) {
            throw new IllegalArgumentException("メールアドレスの形式が正しくありません。");
        }
        return t;
    }

    /**
     * 8文字以上72文字以下。英字・数字・記号（空白以外の英数字以外）をそれぞれ1文字以上含む。
     */
    private static void validatePasswordPolicy(String password) {
        if (password == null) {
            throw new IllegalArgumentException("パスワードを入力してください。");
        }
        int len = password.length();
        if (len < PASSWORD_MIN_LEN || len > PASSWORD_MAX_LEN) {
            throw new IllegalArgumentException(
                    "パスワードは" + PASSWORD_MIN_LEN + "文字以上" + PASSWORD_MAX_LEN + "文字以下で入力してください。");
        }
        boolean hasLetter = password.chars().anyMatch(ch -> (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z'));
        boolean hasDigit = password.chars().anyMatch(ch -> ch >= '0' && ch <= '9');
        boolean hasSpecial = password.chars()
                .anyMatch(ch -> (ch < 'A' || ch > 'Z') && (ch < 'a' || ch > 'z') && (ch < '0' || ch > '9')
                        && !Character.isWhitespace(ch));
        if (!hasLetter || !hasDigit || !hasSpecial) {
            throw new IllegalArgumentException(
                    "パスワードは英字・数字・記号をそれぞれ1文字以上含めてください。（8文字以上）");
        }
    }

    private static EmployeeSummaryResponse toSummary(Employee e, EmployeeAccount a) {
        var b = EmployeeSummaryResponse.builder()
                .employeeId(e.getEmployeeId())
                .employeeCode(e.getEmployeeCode())
                .employeeName(e.getEmployeeName())
                .department(e.getDepartment())
                .inviteEmail(e.getInviteEmail())
                .hourlyCost(e.getHourlyCost())
                .activeFlag(e.getActiveFlag())
                .photoFilename(e.getPhotoFilename());
        if (a == null) {
            return b.loginId(null).role(null).build();
        }
        return b.loginId(a.getLoginId()).role(a.getRole().name()).build();
    }
}
