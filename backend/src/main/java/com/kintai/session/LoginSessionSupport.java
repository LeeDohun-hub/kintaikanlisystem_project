package com.kintai.session;

import com.kintai.dto.LoginResponse;
import jakarta.servlet.http.HttpSession;

import java.util.Map;

/**
 * 세션의 loginUser를 LoginResponse로 통일해 읽습니다.
 * (직렬화/역직렬화로 Map 형태가 되는 환경에서도 동일하게 동작하도록 합니다.)
 */
public final class LoginSessionSupport {

    private LoginSessionSupport() {}

    public static LoginResponse getLoginUser(HttpSession session) {
        if (session == null) {
            return null;
        }
        return resolve(session.getAttribute("loginUser"));
    }

    /** 세션에 로그인 사용자가 있고 {@code id}가 채워져 있을 때만 반환합니다. */
    public static LoginResponse requireAuthenticatedUser(HttpSession session) {
        LoginResponse u = getLoginUser(session);
        if (u == null || u.getId() == null) {
            return null;
        }
        return u;
    }

    public static LoginResponse resolve(Object o) {
        if (o instanceof LoginResponse lr) {
            return lr;
        }
        if (o instanceof Map<?, ?> m) {
            return fromMap(m);
        }
        return null;
    }

    private static LoginResponse fromMap(Map<?, ?> m) {
        try {
            Object id = m.get("id");
            if (id == null) {
                return null;
            }
            long lid = id instanceof Number n ? n.longValue() : Long.parseLong(String.valueOf(id));
            String role = stringVal(m.get("role"));
            if (role == null || role.isBlank()) {
                return null;
            }
            return LoginResponse.builder()
                    .id(lid)
                    .employeeCode(stringVal(m.get("employeeCode")))
                    .name(stringVal(m.get("name")))
                    .role(role)
                    .build();
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private static String stringVal(Object v) {
        return v == null ? null : String.valueOf(v);
    }
}
