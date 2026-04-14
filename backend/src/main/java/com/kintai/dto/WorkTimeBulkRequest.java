package com.kintai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class WorkTimeBulkRequest {

    /**
     * true の場合、同一勤務日が既に存在するときは更新（上書き）します。
     * false の場合、既存がある勤務日はエラー扱いにします。
     */
    private boolean overwriteExisting = true;

    /** 1日1件方針のため、勤務日単位の配列 */
    @NotNull(message = "items は必須です。")
    @Valid
    private List<WorkTimeCreateRequest> items = new ArrayList<>();
}

