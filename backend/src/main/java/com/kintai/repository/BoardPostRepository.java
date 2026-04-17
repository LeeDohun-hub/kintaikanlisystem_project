package com.kintai.repository;

import com.kintai.entity.BoardPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BoardPostRepository extends JpaRepository<BoardPost, Long> {

    @Query("SELECT p FROM BoardPost p LEFT JOIN FETCH p.author ORDER BY p.createdAt DESC")
    List<BoardPost> findAllWithAuthorOrderByCreatedAtDesc();
}
