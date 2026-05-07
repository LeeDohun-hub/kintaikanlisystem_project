package com.kintai.repository;

import com.kintai.entity.ChatRoomMember;
import com.kintai.entity.ChatRoomMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, ChatRoomMemberId> {

    @Query("SELECT m FROM ChatRoomMember m JOIN FETCH m.employee " +
           "WHERE m.id.roomId = :roomId AND m.leftAt IS NULL")
    List<ChatRoomMember> findActiveMembersByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT m FROM ChatRoomMember m WHERE m.id.roomId = :roomId AND m.id.employeeId = :empId")
    Optional<ChatRoomMember> findByRoomIdAndEmployeeId(@Param("roomId") Long roomId, @Param("empId") Long empId);
}
