package com.kintai.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * JSON 역직렬화는 Jackson JavaTimeModule 기본(ISO-8601)을 사용합니다.
 * {@code @JsonFormat(pattern = "HH:mm")} 는 "09:00:00" 등을 거부해 POST 시 500/역직렬화 오류가 날 수 있습니다.
 */
@Data
public class WorkTimeCreateRequest {

    private LocalDate workDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer breakMinutes;
}
