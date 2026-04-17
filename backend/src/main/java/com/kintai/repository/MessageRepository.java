package com.kintai.repository;

import com.kintai.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** 2人の会話メッセージを昇順で取得 */
    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.receiver " +
           "WHERE (m.sender.employeeId = :myId AND m.receiver.employeeId = :otherId) " +
           "   OR (m.sender.employeeId = :otherId AND m.receiver.employeeId = :myId) " +
           "ORDER BY m.createdAt ASC")
    List<Message> findConversation(@Param("myId") Long myId, @Param("otherId") Long otherId);

    /** 会話一覧用: 自分が関わる全メッセージを新着順で */
    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.receiver " +
           "WHERE m.sender.employeeId = :myId OR m.receiver.employeeId = :myId " +
           "ORDER BY m.createdAt DESC")
    List<Message> findAllByParticipant(@Param("myId") Long myId);

    /** 既読にする */
    @Modifying
    @Query("UPDATE Message m SET m.read = true " +
           "WHERE m.sender.employeeId = :senderId AND m.receiver.employeeId = :myId AND m.read = false")
    void markAsRead(@Param("senderId") Long senderId, @Param("myId") Long myId);

    /** 未読数 */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiver.employeeId = :myId AND m.read = false")
    long countUnread(@Param("myId") Long myId);
}
