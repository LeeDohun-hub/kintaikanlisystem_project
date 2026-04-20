package com.kintai.service;

import com.kintai.dto.ConversationResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.MessageResponse;
import com.kintai.dto.MessageSendRequest;
import com.kintai.entity.ConversationLeave;
import com.kintai.entity.Employee;
import com.kintai.entity.Message;
import com.kintai.repository.ConversationLeaveRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessengerService {

    private static final String PREVIEW_PARTNER_LEFT = "님이 대화방을 나갔습니다";

    private final MessageRepository messageRepository;
    private final EmployeeRepository employeeRepository;
    private final ConversationLeaveRepository conversationLeaveRepository;

    @Transactional(readOnly = true)
    public List<ConversationResponse> listConversations(Long myId) {
        Set<Long> hiddenPartners = conversationLeaveRepository.findByLeaverId(myId).stream()
                .map(ConversationLeave::getPartnerId)
                .collect(Collectors.toSet());

        List<Message> all = messageRepository.findAllByParticipant(myId);

        // 相手IDごとに最新メッセージとグループ化
        Map<Long, Message> lastByPartner = new LinkedHashMap<>();
        Map<Long, Integer> unreadByPartner = new LinkedHashMap<>();

        for (Message m : all) {
            Long partnerId = m.getSender().getEmployeeId().equals(myId)
                    ? m.getReceiver().getEmployeeId()
                    : m.getSender().getEmployeeId();

            if (hiddenPartners.contains(partnerId)) {
                continue;
            }

            lastByPartner.putIfAbsent(partnerId, m); // already DESC order, first = latest
            if (!m.isRead() && m.getReceiver().getEmployeeId().equals(myId)) {
                unreadByPartner.merge(partnerId, 1, Integer::sum);
            }
        }

        return lastByPartner.entrySet().stream()
                .map(e -> {
                    Long partnerId = e.getKey();
                    Message last = e.getValue();
                    Employee partner = last.getSender().getEmployeeId().equals(partnerId)
                            ? last.getSender()
                            : last.getReceiver();
                    return ConversationResponse.builder()
                            .partnerId(partnerId)
                            .partnerName(partner.getEmployeeName())
                            .lastMessage(lastMessagePreview(last))
                            .lastMessageAt(last.getCreatedAt())
                            .unreadCount(unreadByPartner.getOrDefault(partnerId, 0))
                            .build();
                })
                .toList();
    }

    private String lastMessagePreview(Message last) {
        if (Message.SYSTEM_TYPE_PARTNER_LEFT.equals(last.getSystemType())) {
            return last.getSender().getEmployeeName() + PREVIEW_PARTNER_LEFT;
        }
        return last.getContent();
    }

    @Transactional
    public List<MessageResponse> getConversation(Long myId, Long otherId) {
        messageRepository.markAsRead(otherId, myId);
        return messageRepository.findConversation(myId, otherId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public MessageResponse sendMessage(LoginResponse loginUser, MessageSendRequest req) {
        if (req.getReceiverId() == null) throw new IllegalArgumentException("送信先を指定してください。");
        if (loginUser.getId().equals(req.getReceiverId())) throw new IllegalArgumentException("自分自身にはメッセージを送れません。");

        String content = req.getContent() != null ? req.getContent().trim() : "";
        if (content.isBlank()) throw new IllegalArgumentException("メッセージを入力してください。");
        if (content.length() > 2000) throw new IllegalArgumentException("メッセージは2000文字以内で入力してください。");

        Employee sender = findEmployee(loginUser.getId());
        Employee receiver = findEmployee(req.getReceiverId());

        Message m = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .build();
        messageRepository.save(m);

        // どちらかが一度「退出」していても、新規メッセージで会話を復帰
        conversationLeaveRepository.deleteByLeaverIdAndPartnerId(sender.getEmployeeId(), receiver.getEmployeeId());
        conversationLeaveRepository.deleteByLeaverIdAndPartnerId(receiver.getEmployeeId(), sender.getEmployeeId());

        return toResponse(m);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long myId) {
        return messageRepository.countUnread(myId);
    }

    /**
     * 自分だけ会話一覧から外し、相手側には履歴を残して「退出」システムメッセージを送る。
     */
    @Transactional
    public void leaveConversation(Long myId, Long partnerId) {
        if (partnerId == null) throw new IllegalArgumentException("相手を指定してください。");
        if (myId.equals(partnerId)) throw new IllegalArgumentException("無効な指定です。");
        findEmployee(partnerId);
        if (conversationLeaveRepository.existsByLeaverIdAndPartnerId(myId, partnerId)) {
            return;
        }

        Employee me = findEmployee(myId);
        Employee partner = findEmployee(partnerId);

        conversationLeaveRepository.save(ConversationLeave.builder()
                .leaverId(myId)
                .partnerId(partnerId)
                .build());

        Message system = Message.builder()
                .sender(me)
                .receiver(partner)
                .content("")
                .systemType(Message.SYSTEM_TYPE_PARTNER_LEFT)
                .build();
        messageRepository.save(system);
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));
    }

    private MessageResponse toResponse(Message m) {
        return MessageResponse.builder()
                .messageId(m.getMessageId())
                .senderId(m.getSender().getEmployeeId())
                .senderName(m.getSender().getEmployeeName())
                .receiverId(m.getReceiver().getEmployeeId())
                .receiverName(m.getReceiver().getEmployeeName())
                .content(m.getContent())
                .systemType(m.getSystemType())
                .read(m.isRead())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
