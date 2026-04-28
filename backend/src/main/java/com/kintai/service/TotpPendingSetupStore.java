package com.kintai.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 2FA 有効化前の TOTP シークレットを HTTP セッション属性ではなくサーバ側で保持する。
 * プロキシやセッション属性の不整合で enable 時にシークレットが失われる問題を避ける。
 */
@Component
public class TotpPendingSetupStore {

    private static final Duration TTL = Duration.ofMinutes(20);

    private final ConcurrentHashMap<String, Entry> map = new ConcurrentHashMap<>();

    private record Entry(long employeeId, String secret, Instant expiresAt) {}

    public String register(long employeeId, String secret) {
        evictExpired();
        String token = UUID.randomUUID().toString();
        map.put(token, new Entry(employeeId, secret, Instant.now().plus(TTL)));
        return token;
    }

    /**
     * トークンが有効ならシークレットを返す（検証失敗時もトークンは残すので再試行可能）。
     */
    public Optional<String> peekSecret(String token, long employeeId) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String key = token.trim();
        Entry e = map.get(key);
        if (e == null) {
            return Optional.empty();
        }
        if (e.expiresAt.isBefore(Instant.now())) {
            map.remove(key, e);
            return Optional.empty();
        }
        if (e.employeeId != employeeId) {
            return Optional.empty();
        }
        return Optional.of(e.secret);
    }

    public void remove(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        map.remove(token.trim());
    }

    private void evictExpired() {
        Instant now = Instant.now();
        for (Iterator<Map.Entry<String, Entry>> it = map.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<String, Entry> e = it.next();
            if (e.getValue().expiresAt.isBefore(now)) {
                it.remove();
            }
        }
    }
}
