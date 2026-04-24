package com.kintai.controller;

import com.kintai.dto.BoardCommentCreateRequest;
import com.kintai.dto.BoardPostCreateRequest;
import com.kintai.dto.BoardPostPinRequest;
import com.kintai.dto.LoginResponse;
import com.kintai.service.BoardService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/board")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(value = "category", required = false) String category,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(boardService.listPosts(category));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody BoardPostCreateRequest req, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(boardService.createPost(user, req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<?> get(@PathVariable("postId") Long postId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(boardService.getPost(postId));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PutMapping("/posts/{postId}")
    public ResponseEntity<?> update(
            @PathVariable("postId") Long postId,
            @RequestBody BoardPostCreateRequest req,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(boardService.updatePost(user, postId, req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> delete(@PathVariable("postId") Long postId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            boardService.deletePost(user, postId);
            return ApiResponses.message("投稿を削除しました。");
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PatchMapping("/posts/{postId}/pin")
    public ResponseEntity<?> setPin(
            @PathVariable("postId") Long postId,
            @RequestBody BoardPostPinRequest req,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            boolean pinned = req != null && req.isPinned();
            return ResponseEntity.ok(boardService.setPinned(user, postId, pinned));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<?> createComment(
            @PathVariable("postId") Long postId,
            @RequestBody BoardCommentCreateRequest req,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(boardService.createComment(user, postId, req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable("postId") Long postId,
            @PathVariable("commentId") Long commentId,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            boardService.deleteComment(user, postId, commentId);
            return ApiResponses.message("コメントを削除しました。");
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }
}
