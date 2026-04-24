package com.kintai.repository;

import com.kintai.entity.BoardCategory;
import com.kintai.entity.BoardPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BoardPostRepository extends JpaRepository<BoardPost, Long> {

    @Query("SELECT p FROM BoardPost p LEFT JOIN FETCH p.author ORDER BY p.pinned DESC, p.createdAt DESC")
    List<BoardPost> findAllWithAuthorOrderByPinnedDescCreatedAtDesc();

    @Query(
            "SELECT p FROM BoardPost p LEFT JOIN FETCH p.author WHERE p.category = :category "
                    + "ORDER BY p.pinned DESC, p.createdAt DESC")
    List<BoardPost> findByCategoryWithAuthorOrderByPinnedDescCreatedAtDesc(@Param("category") BoardCategory category);
}
