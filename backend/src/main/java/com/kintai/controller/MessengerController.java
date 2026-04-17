package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.MessageSendRequest;
import com.kintai.service.MessengerService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messenger")
@RequiredArgsConstructor
public class MessengerController {

    private final MessengerService messengerService;

    @GetMapping("/conversations")
    public ResponseEntity<?> listConversations(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(messengerService.listConversations(user.getId()));
    }

    @GetMapping("/conversation/{partnerId}")
    public ResponseEntity<?> getConversation(
            @PathVariable("partnerId") Long partnerId,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(messengerService.getConversation(user.getId(), partnerId));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PostMapping("/send")
    public ResponseEntity<?> send(@RequestBody MessageSendRequest req, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(messengerService.sendMessage(user, req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(Map.of("count", messengerService.getUnreadCount(user.getId())));
    }
}
