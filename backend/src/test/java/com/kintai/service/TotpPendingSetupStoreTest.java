package com.kintai.service;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TotpPendingSetupStoreTest {

    @Test
    void peekThenRemove() {
        TotpPendingSetupStore store = new TotpPendingSetupStore();
        String token = store.register(42L, "MYSECRET");
        Optional<String> s = store.peekSecret(token, 42L);
        assertTrue(s.isPresent());
        assertEquals("MYSECRET", s.get());
        assertTrue(store.peekSecret(token, 42L).isPresent());
        store.remove(token);
        assertTrue(store.peekSecret(token, 42L).isEmpty());
    }

    @Test
    void wrongEmployeeReturnsEmpty() {
        TotpPendingSetupStore store = new TotpPendingSetupStore();
        String token = store.register(1L, "A");
        assertTrue(store.peekSecret(token, 2L).isEmpty());
    }
}
