package com.kintai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "batch_import_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchImportHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "import_id")
    private Long importId;

    @Column(name = "file_name", nullable = false, length = 100)
    private String fileName;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "error_message", length = 255)
    private String errorMessage;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @PrePersist
    void prePersist() {
        if (importedAt == null) {
            importedAt = LocalDateTime.now();
        }
    }
}
