package com.kintai.repository;

import com.kintai.entity.BoardComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BoardCommentRepository extends JpaRepository<BoardComment, Long> {

    @Query("SELECT c.post.postId, COUNT(c) FROM BoardComment c WHERE c.post.postId IN :ids GROUP BY c.post.postId")
    List<Object[]> countCommentsByPostIds(@Param("ids") List<Long> ids);
}
