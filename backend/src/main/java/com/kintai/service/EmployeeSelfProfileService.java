package com.kintai.service;

import com.kintai.dto.MyProfileResponse;
import com.kintai.dto.MyProfileUpdateRequest;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EmployeeSelfProfileService {

    private static final int ADDRESS_MAX = 200;
    private static final int PHONE_MAX = 20;
    private static final Set<String> GENDERS = Set.of("男性", "女性", "その他");

    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public MyProfileResponse getProfile(Long employeeId) {
        Employee e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));
        return toResponse(e);
    }

    @Transactional
    public MyProfileResponse updateProfile(Long employeeId, MyProfileUpdateRequest req) {
        Employee e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));

        String address = normalizeBounded(req.getAddress(), ADDRESS_MAX, "住所は200文字以内で入力してください。");
        String phone = normalizeBounded(req.getPhoneNumber(), PHONE_MAX, "電話番号は20文字以内で入力してください。");
        String gender = normalizeGender(req.getGender());
        LocalDate birth = req.getBirthDate();
        if (birth != null && birth.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("生年月日に未来の日付は指定できません。");
        }

        e.setAddress(address);
        e.setPhoneNumber(phone);
        e.setBirthDate(birth);
        e.setGender(gender);
        employeeRepository.save(e);
        return toResponse(e);
    }

    private static MyProfileResponse toResponse(Employee e) {
        String fn = e.getPhotoFilename();
        boolean hasPhoto = fn != null && !fn.isBlank();
        return MyProfileResponse.builder()
                .employeeCode(e.getEmployeeCode())
                .employeeName(e.getEmployeeName())
                .department(e.getDepartment())
                .address(e.getAddress())
                .phoneNumber(e.getPhoneNumber())
                .birthDate(e.getBirthDate())
                .gender(e.getGender())
                .hasPhoto(hasPhoto)
                .build();
    }

    private static String normalizeBounded(String raw, int maxLen, String tooLongMessage) {
        if (raw == null) {
            return null;
        }
        String s = raw.trim();
        if (s.length() > maxLen) {
            throw new IllegalArgumentException(tooLongMessage);
        }
        return s.isEmpty() ? null : s;
    }

    private static String normalizeGender(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.trim();
        if (s.isEmpty()) {
            return null;
        }
        if (!GENDERS.contains(s)) {
            throw new IllegalArgumentException("性別の値が正しくありません。");
        }
        return s;
    }
}
