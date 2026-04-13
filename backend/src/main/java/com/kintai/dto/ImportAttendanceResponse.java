package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportAttendanceResponse {

    /** 新規登録＋既存行更新の合計（勤務表）。管理者一括取込は新規のみ。 */
    private int successCount;
    private int errorCount;
    /** 勤務表インポートのみ: DB に既にあった勤務日を Excel 内容で上書きした件数 */
    @Builder.Default
    private int updatedExistingDays = 0;
    private List<RowError> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowError {
        private int row;
        private String message;
    }
}

