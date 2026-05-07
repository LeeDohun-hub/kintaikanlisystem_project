package com.kintai.service;

import com.kintai.dto.*;
import com.kintai.entity.*;
import com.kintai.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupMessengerService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public GroupRoomResponse createRoom(Long myId, CreateGroupRoomRequest req) {
        if (req.getRoomName() == null || req.getRoomName().isBlank())
            throw new IllegalArgumentException("グループ名を入力してください。");
        if (req.getRoomName().length() > 100)
            throw new IllegalArgumentException("グループ名は100文字以内で入力してください。");
        if (req.getMemberIds() == null || req.getMemberIds().isEmpty())
            throw new IllegalArgumentException("メンバーを1人以上選択してください。");

        Employee creator = findEmployee(myId);
        ChatRoom room = ChatRoom.builder()
                .roomName(req.getRoomName().trim())
                .createdBy(creator)
                .build();
        chatRoomRepository.save(room);

        addMemberInternal(room, creator);

        for (Long memberId : req.getMemberIds()) {
            if (!memberId.equals(myId)) {
                addMemberInternal(room, findEmployee(memberId));
            }
        }

        return toRoomResponse(room, myId);
    }

    @Transactional(readOnly = true)
    public List<GroupRoomResponse> listRooms(Long myId) {
        return chatRoomRepository.findRoomsForEmployee(myId).stream()
                .map(r -> toRoomResponse(r, myId))
                .sorted(Comparator.comparing(GroupRoomResponse::getLastMessageAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<GroupMessageResponse> getMessages(Long myId, Long roomId) {
        assertActiveMember(myId, roomId);

        chatRoomMemberRepository.findByRoomIdAndEmployeeId(roomId, myId).ifPresent(m -> {
            m.setLastReadAt(LocalDateTime.now());
            chatRoomMemberRepository.save(m);
        });

        return groupMessageRepository.findByRoomId(roomId).stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public GroupMessageResponse sendMessage(Long myId, Long roomId, GroupMessageRequest req) {
        assertActiveMember(myId, roomId);

        String content = req.getContent() != null ? req.getContent().trim() : "";
        if (content.isBlank()) throw new IllegalArgumentException("メッセージを入力してください。");
        if (content.length() > 2000) throw new IllegalArgumentException("メッセージは2000文字以内で入力してください。");

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("グループが見つかりません。"));
        Employee sender = findEmployee(myId);

        GroupMessage msg = GroupMessage.builder()
                .room(room)
                .sender(sender)
                .content(content)
                .build();
        groupMessageRepository.save(msg);

        chatRoomMemberRepository.findByRoomIdAndEmployeeId(roomId, myId).ifPresent(m -> {
            m.setLastReadAt(LocalDateTime.now());
            chatRoomMemberRepository.save(m);
        });

        return toMessageResponse(msg);
    }

    @Transactional
    public void leaveRoom(Long myId, Long roomId) {
        ChatRoomMember member = chatRoomMemberRepository.findByRoomIdAndEmployeeId(roomId, myId)
                .orElseThrow(() -> new IllegalArgumentException("このグループのメンバーではありません。"));
        if (member.getLeftAt() != null) return;

        member.setLeftAt(LocalDateTime.now());
        chatRoomMemberRepository.save(member);

        ChatRoom room = chatRoomRepository.findById(roomId).orElseThrow();
        Employee me = findEmployee(myId);

        GroupMessage systemMsg = GroupMessage.builder()
                .room(room)
                .sender(me)
                .content(me.getEmployeeName() + "がグループを退出しました")
                .systemType(GroupMessage.SYSTEM_TYPE_MEMBER_LEFT)
                .build();
        groupMessageRepository.save(systemMsg);
    }

    @Transactional
    public void addMembers(Long myId, Long roomId, List<Long> memberIds) {
        assertActiveMember(myId, roomId);
        if (memberIds == null || memberIds.isEmpty()) return;

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("グループが見つかりません。"));
        Employee me = findEmployee(myId);

        for (Long memberId : memberIds) {
            Optional<ChatRoomMember> existing = chatRoomMemberRepository.findByRoomIdAndEmployeeId(roomId, memberId);
            if (existing.isPresent()) {
                if (existing.get().getLeftAt() != null) {
                    existing.get().setLeftAt(null);
                    existing.get().setLastReadAt(LocalDateTime.now());
                    chatRoomMemberRepository.save(existing.get());
                    sendJoinedSystemMessage(room, findEmployee(memberId));
                }
                continue;
            }
            Employee emp = findEmployee(memberId);
            addMemberInternal(room, emp);
            sendJoinedSystemMessage(room, emp);
        }
    }

    @Transactional(readOnly = true)
    public long getTotalUnreadCount(Long myId) {
        List<ChatRoom> rooms = chatRoomRepository.findRoomsForEmployee(myId);
        long total = 0;
        for (ChatRoom room : rooms) {
            total += getUnreadCountForRoom(myId, room.getRoomId());
        }
        return total;
    }

    private void addMemberInternal(ChatRoom room, Employee emp) {
        ChatRoomMemberId id = ChatRoomMemberId.builder()
                .roomId(room.getRoomId())
                .employeeId(emp.getEmployeeId())
                .build();
        chatRoomMemberRepository.save(ChatRoomMember.builder()
                .id(id)
                .room(room)
                .employee(emp)
                .build());
    }

    private void sendJoinedSystemMessage(ChatRoom room, Employee emp) {
        groupMessageRepository.save(GroupMessage.builder()
                .room(room)
                .sender(emp)
                .content(emp.getEmployeeName() + "がグループに参加しました")
                .systemType(GroupMessage.SYSTEM_TYPE_MEMBER_JOINED)
                .build());
    }

    private void assertActiveMember(Long myId, Long roomId) {
        ChatRoomMember m = chatRoomMemberRepository.findByRoomIdAndEmployeeId(roomId, myId)
                .orElseThrow(() -> new IllegalArgumentException("このグループのメンバーではありません。"));
        if (m.getLeftAt() != null)
            throw new IllegalArgumentException("このグループから退出済みです。");
    }

    private long getUnreadCountForRoom(Long myId, Long roomId) {
        return chatRoomMemberRepository.findByRoomIdAndEmployeeId(roomId, myId)
                .map(m -> {
                    LocalDateTime since = m.getLastReadAt() != null ? m.getLastReadAt() : m.getJoinedAt();
                    return groupMessageRepository.countUnreadInRoom(roomId, since, myId);
                })
                .orElse(0L);
    }

    private GroupRoomResponse toRoomResponse(ChatRoom room, Long myId) {
        List<ChatRoomMember> activeMembers = chatRoomMemberRepository.findActiveMembersByRoomId(room.getRoomId());
        Optional<GroupMessage> lastMsg = groupMessageRepository.findLatestByRoomId(room.getRoomId());
        long unread = getUnreadCountForRoom(myId, room.getRoomId());

        List<GroupRoomResponse.MemberInfo> members = activeMembers.stream()
                .map(m -> GroupRoomResponse.MemberInfo.builder()
                        .employeeId(m.getEmployee().getEmployeeId())
                        .employeeName(m.getEmployee().getEmployeeName())
                        .build())
                .collect(Collectors.toList());

        return GroupRoomResponse.builder()
                .roomId(room.getRoomId())
                .roomName(room.getRoomName())
                .memberCount(activeMembers.size())
                .members(members)
                .lastMessage(lastMsg.map(GroupMessage::getContent).orElse(null))
                .lastMessageAt(lastMsg.map(GroupMessage::getCreatedAt).orElse(room.getCreatedAt()))
                .unreadCount((int) unread)
                .build();
    }

    private GroupMessageResponse toMessageResponse(GroupMessage m) {
        return GroupMessageResponse.builder()
                .messageId(m.getMessageId())
                .roomId(m.getRoom().getRoomId())
                .senderId(m.getSender().getEmployeeId())
                .senderName(m.getSender().getEmployeeName())
                .content(m.getContent())
                .systemType(m.getSystemType())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));
    }
}
