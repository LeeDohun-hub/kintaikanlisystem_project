package com.kintai.session;

import com.kintai.dto.LoginResponse;
import jakarta.servlet.http.HttpSession;

import java.util.Map;

/**
 * セッションの loginUser を LoginResponse として統一的に読み取ります。
 * （直列化で Map になる環境でも同様に動作します。）
 */
public final class LoginSessionSupport {

    private LoginSessionSupport() {}

    public static LoginResponse getLoginUser(HttpSession session) {
        if (session == null) {
            return null;
        }
        return resolve(session.getAttribute("loginUser"));
    }

    /** セッションにログインユーザーがあり {@code id} が埋まっているときのみ返します。 */
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
