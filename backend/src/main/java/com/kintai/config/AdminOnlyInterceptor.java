package com.kintai.config;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.LoginResponse;
import com.kintai.session.LoginSessionSupport;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AdminOnlyInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod hm)) {
            return true;
        }

        boolean adminOnly = hm.getMethodAnnotation(AdminOnly.class) != null
                || hm.getBeanType().getAnnotation(AdminOnly.class) != null;
        if (!adminOnly) {
            return true;
        }

        HttpSession session = request.getSession(false);
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"Unauthorized\"}");
            return false;
        }
        if (!"ADMIN".equals(user.getRole())) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"管理者のみアクセスできます。\"}");
            return false;
        }
        return true;
    }
}

