package com.kintai.controller;

import com.kintai.dto.*;
import com.kintai.service.GroupMessengerService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/group-messenger")
@RequiredArgsConstructor
public class GroupMessengerController {

    private final GroupMessengerService groupMessengerService;

    @GetMapping("/rooms")
    public ResponseEntity<?> listRooms(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(groupMessengerService.listRooms(user.getId()));
    }

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@RequestBody CreateGroupRoomRequest req, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(groupMessengerService.createRoom(user.getId(), req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> getMessages(@PathVariable("roomId") Long roomId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(groupMessengerService.getMessages(user.getId(), roomId));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable("roomId") Long roomId,
            @RequestBody GroupMessageRequest req,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(groupMessengerService.sendMessage(user.getId(), roomId, req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PostMapping("/rooms/{roomId}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable("roomId") Long roomId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            groupMessengerService.leaveRoom(user.getId(), roomId);
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PostMapping("/rooms/{roomId}/members")
    public ResponseEntity<?> addMembers(
            @PathVariable("roomId") Long roomId,
            @RequestBody AddMembersRequest req,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            groupMessengerService.addMembers(user.getId(), roomId, req.getMemberIds());
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(Map.of("count", groupMessengerService.getTotalUnreadCount(user.getId())));
    }
}
