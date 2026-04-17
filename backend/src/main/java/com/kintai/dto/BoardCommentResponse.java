package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardCommentResponse {
    private Long commentId;
    private Long postId;
    private String content;
    private Long authorId;
    private String authorName;
    private LocalDateTime createdAt;
}
