package com.kintai.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * JSON 逆直列化は Jackson JavaTimeModule 既定（ISO-8601）を使用します。
 * {@code @JsonFormat(pattern = "HH:mm")} は "09:00:00" 等を拒否し POST 時に 500/逆直列化エラーになることがあります。
 */
@Data
public class WorkTimeCreateRequest {

    private LocalDate workDate;
    private LocalTime startTime;
    private LocalTime endTime;

    /** 外出開始（任意） */
    private LocalTime outingStartTime;

    /** 外出復帰（任意） */
    private LocalTime outingEndTime;

    private Integer breakMinutes;

    /** 休日勤務日（管理者用）。未指定は false 扱い。 */
    private Boolean isHoliday;

    /** 備考 (任意、最大500文字) */
    @Size(max = 500, message = "備考は500文字以下です。")
    private String remarks;
}
