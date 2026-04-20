package com.kintai.repository;

import com.kintai.entity.ConversationLeave;
import com.kintai.entity.ConversationLeaveId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationLeaveRepository extends JpaRepository<ConversationLeave, ConversationLeaveId> {

    List<ConversationLeave> findByLeaverId(Long leaverId);

    boolean existsByLeaverIdAndPartnerId(Long leaverId, Long partnerId);

    void deleteByLeaverIdAndPartnerId(Long leaverId, Long partnerId);
}
