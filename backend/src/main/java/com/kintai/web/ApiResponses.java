package com.kintai.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

/**
 * REST API JSON 본문을 일관되게 만듭니다.
 */
public final class ApiResponses {

    private ApiResponses() {}

    public static ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
    }

    public static ResponseEntity<Map<String, String>> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    public static ResponseEntity<Map<String, String>> message(String text) {
        return ResponseEntity.ok(Map.of("message", text));
    }

    public static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
