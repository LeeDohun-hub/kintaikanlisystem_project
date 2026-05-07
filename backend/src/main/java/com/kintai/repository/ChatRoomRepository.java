package com.kintai.repository;

import com.kintai.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    @Query("SELECT cr FROM ChatRoom cr WHERE cr.roomId IN " +
           "(SELECT m.id.roomId FROM ChatRoomMember m WHERE m.id.employeeId = :empId AND m.leftAt IS NULL)")
    List<ChatRoom> findRoomsForEmployee(@Param("empId") Long empId);
}
