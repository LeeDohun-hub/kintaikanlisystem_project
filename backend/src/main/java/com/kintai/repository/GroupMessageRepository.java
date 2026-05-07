package com.kintai.repository;

import com.kintai.entity.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender " +
           "WHERE m.room.roomId = :roomId ORDER BY m.createdAt ASC")
    List<GroupMessage> findByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender " +
           "WHERE m.room.roomId = :roomId ORDER BY m.createdAt DESC LIMIT 1")
    Optional<GroupMessage> findLatestByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT COUNT(m) FROM GroupMessage m " +
           "WHERE m.room.roomId = :roomId " +
           "AND m.createdAt > :since " +
           "AND m.sender.employeeId != :myId " +
           "AND m.systemType IS NULL")
    long countUnreadInRoom(@Param("roomId") Long roomId,
                           @Param("since") LocalDateTime since,
                           @Param("myId") Long myId);
}
