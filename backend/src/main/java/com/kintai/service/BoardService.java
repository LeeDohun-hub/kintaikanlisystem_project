package com.kintai.service;

import com.kintai.dto.*;
import com.kintai.entity.BoardCategory;
import com.kintai.entity.BoardComment;
import com.kintai.entity.BoardPost;
import com.kintai.entity.Employee;
import com.kintai.repository.BoardCommentRepository;
import com.kintai.repository.BoardPostRepository;
import com.kintai.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardPostRepository boardPostRepository;
    private final BoardCommentRepository boardCommentRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public List<BoardPostSummaryResponse> listPosts(String categoryParam) {
        List<BoardPost> posts;
        if (categoryParam == null || categoryParam.isBlank()) {
            posts = boardPostRepository.findAllWithAuthorOrderByPinnedDescCreatedAtDesc();
        } else {
            BoardCategory cat = parseCategory(categoryParam);
            posts = boardPostRepository.findByCategoryWithAuthorOrderByPinnedDescCreatedAtDesc(cat);
        }
        Map<Long, Integer> commentCounts = commentCountsFor(posts);
        return posts.stream().map(p -> toSummary(p, commentCounts.getOrDefault(p.getPostId(), 0))).toList();
    }

    @Transactional(readOnly = true)
    public BoardPostDetailResponse getPost(Long postId) {
        BoardPost post = findPost(postId);
        return toDetail(post);
    }

    @Transactional
    public BoardPostDetailResponse createPost(LoginResponse loginUser, BoardPostCreateRequest req) {
        String title = req.getTitle() != null ? req.getTitle().trim() : "";
        String content = req.getContent() != null ? req.getContent().trim() : "";
        if (title.isBlank()) throw new IllegalArgumentException("タイトルを入力してください。");
        if (title.length() > 200) throw new IllegalArgumentException("タイトルは200文字以下で入力してください。");
        if (content.isBlank()) throw new IllegalArgumentException("本文を入力してください。");

        BoardCategory category = resolveCategoryForCreate(loginUser, req.getCategory());

        Employee author = findEmployee(loginUser.getId());
        BoardPost post = BoardPost.builder()
                .category(category)
                .title(title)
                .content(content)
                .author(author)
                .build();
        boardPostRepository.save(post);
        return toDetail(post);
    }

    @Transactional
    public BoardPostDetailResponse updatePost(LoginResponse loginUser, Long postId, BoardPostCreateRequest req) {
        BoardPost post = findPost(postId);
        checkOwnerOrAdmin(loginUser, post.getAuthor().getEmployeeId());

        String title = req.getTitle() != null ? req.getTitle().trim() : "";
        String content = req.getContent() != null ? req.getContent().trim() : "";
        if (title.isBlank()) throw new IllegalArgumentException("タイトルを入力してください。");
        if (title.length() > 200) throw new IllegalArgumentException("タイトルは200文字以下で入力してください。");
        if (content.isBlank()) throw new IllegalArgumentException("本文を入力してください。");

        post.setTitle(title);
        post.setContent(content);
        boardPostRepository.save(post);
        return toDetail(post);
    }

    @Transactional
    public void deletePost(LoginResponse loginUser, Long postId) {
        BoardPost post = findPost(postId);
        checkOwnerOrAdmin(loginUser, post.getAuthor().getEmployeeId());
        boardPostRepository.delete(post);
    }

    @Transactional
    public BoardCommentResponse createComment(LoginResponse loginUser, Long postId, BoardCommentCreateRequest req) {
        String content = req.getContent() != null ? req.getContent().trim() : "";
        if (content.isBlank()) throw new IllegalArgumentException("コメントを入力してください。");

        BoardPost post = findPost(postId);
        Employee author = findEmployee(loginUser.getId());
        BoardComment comment = BoardComment.builder()
                .post(post)
                .content(content)
                .author(author)
                .build();
        boardCommentRepository.save(comment);
        return toCommentResponse(comment);
    }

    @Transactional
    public void deleteComment(LoginResponse loginUser, Long postId, Long commentId) {
        BoardComment comment = boardCommentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("コメントが見つかりません。"));
        if (!comment.getPost().getPostId().equals(postId)) {
            throw new IllegalArgumentException("コメントが見つかりません。");
        }
        checkOwnerOrAdmin(loginUser, comment.getAuthor().getEmployeeId());
        boardCommentRepository.delete(comment);
    }

    @Transactional
    public BoardPostDetailResponse setPinned(LoginResponse loginUser, Long postId, boolean pinned) {
        if (!"ADMIN".equals(loginUser.getRole())) {
            throw new IllegalArgumentException("ピン留めは管理者のみが設定できます。");
        }
        BoardPost post = findPost(postId);
        post.setPinned(pinned);
        boardPostRepository.save(post);
        return toDetail(post);
    }

    private Map<Long, Integer> commentCountsFor(List<BoardPost> posts) {
        List<Long> ids = posts.stream().map(BoardPost::getPostId).toList();
        if (ids.isEmpty()) return Map.of();
        Map<Long, Integer> map = new HashMap<>();
        for (Object[] row : boardCommentRepository.countCommentsByPostIds(ids)) {
            Long postId = (Long) row[0];
            Number cnt = (Number) row[1];
            map.put(postId, cnt.intValue());
        }
        for (Long id : ids) {
            map.putIfAbsent(id, 0);
        }
        return map;
    }

    private BoardCategory parseCategory(String raw) {
        try {
            return BoardCategory.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("無効なカテゴリです。");
        }
    }

    private BoardCategory resolveCategoryForCreate(LoginResponse loginUser, String categoryRaw) {
        if (categoryRaw == null || categoryRaw.isBlank()) {
            return BoardCategory.FREE;
        }
        BoardCategory cat = parseCategory(categoryRaw);
        if (cat == BoardCategory.NOTICE && !"ADMIN".equals(loginUser.getRole())) {
            throw new IllegalArgumentException("お知らせへの投稿は管理者のみです。");
        }
        return cat;
    }

    private BoardPost findPost(Long postId) {
        return boardPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("投稿が見つかりません。"));
    }

    private Employee findEmployee(Long employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));
    }

    private void checkOwnerOrAdmin(LoginResponse loginUser, Long ownerId) {
        boolean isOwner = loginUser.getId().equals(ownerId);
        boolean isAdmin = "ADMIN".equals(loginUser.getRole());
        if (!isOwner && !isAdmin) {
            throw new IllegalArgumentException("この操作を行う権限がありません。");
        }
    }

    private BoardPostSummaryResponse toSummary(BoardPost p, int commentCount) {
        return BoardPostSummaryResponse.builder()
                .postId(p.getPostId())
                .category(p.getCategory().name())
                .pinned(p.isPinned())
                .title(p.getTitle())
                .authorId(p.getAuthor().getEmployeeId())
                .authorName(p.getAuthor().getEmployeeName())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .commentCount(commentCount)
                .build();
    }

    private BoardPostDetailResponse toDetail(BoardPost post) {
        List<BoardCommentResponse> comments = post.getComments().stream()
                .map(this::toCommentResponse)
                .toList();
        return BoardPostDetailResponse.builder()
                .postId(post.getPostId())
                .category(post.getCategory().name())
                .pinned(post.isPinned())
                .title(post.getTitle())
                .content(post.getContent())
                .authorId(post.getAuthor().getEmployeeId())
                .authorName(post.getAuthor().getEmployeeName())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .comments(comments)
                .build();
    }

    private BoardCommentResponse toCommentResponse(BoardComment c) {
        return BoardCommentResponse.builder()
                .commentId(c.getCommentId())
                .postId(c.getPost().getPostId())
                .content(c.getContent())
                .authorId(c.getAuthor().getEmployeeId())
                .authorName(c.getAuthor().getEmployeeName())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
