package com.example.pi_projet.service;

import com.example.pi_projet.dto.ChatRoomDTO;
import com.example.pi_projet.dto.MessageDTO;
import com.example.pi_projet.dto.RoomMemberDTO;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.RoomMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.ContentType;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.MessageRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomMemberService {

    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private void checkRole(User user) {
        if (user.getRole() != User.RoleName.MANAGER && user.getRole() != User.RoleName.TUTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only MANAGER or TUTOR can manage room members.");
        }
    }

    private ChatRoom getOwnedRoom(Long roomId, User user) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat room not found."));
        if (!room.getCreatedBy().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this chat room.");
        }
        return room;
    }

    private User.RoleName allowedTargetRole(User.RoleName callerRole) {
        return callerRole == User.RoleName.MANAGER ? User.RoleName.EMPLOYEE : User.RoleName.STUDENT;
    }

    private void broadcastSystemMessage(ChatRoom room, User actor, String text) {
        Message msg = Message.builder()
                .room(room)
                .sender(actor)
                .contentText(text)
                .contentType(ContentType.text)
                .isSystemMessage(true)
                .build();
        MessageDTO dto = MessageDTO.from(messageRepository.save(msg));
        messagingTemplate.convertAndSend("/topic/rooms/" + room.getId(), dto);
    }

    public RoomMemberDTO addMember(Long roomId, Long userId, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getOwnedRoom(roomId, currentUser);

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        User.RoleName expected = allowedTargetRole(currentUser.getRole());
        if (target.getRole() != expected) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    currentUser.getRole() + " can only add " + expected + " users.");
        }

        if (roomMemberRepository.existsByRoomAndUser(room, target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already a member of this room.");
        }

        RoomMember member = RoomMember.builder()
                .room(room)
                .user(target)
                .build();
        RoomMemberDTO result = RoomMemberDTO.from(roomMemberRepository.save(member));
        broadcastSystemMessage(room, currentUser, target.getFullName() + " has been added to the room");
        return result;
    }

    public void removeMember(Long roomId, Long userId, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getOwnedRoom(roomId, currentUser);

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        roomMemberRepository.deleteByRoomAndUser(room, target);
        broadcastSystemMessage(room, currentUser, target.getFullName() + " has been removed from the room");
    }

    public List<RoomMemberDTO> getMembers(Long roomId, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getOwnedRoom(roomId, currentUser);
        return roomMemberRepository.findByRoom(room)
                .stream()
                .map(RoomMemberDTO::from)
                .toList();
    }

    public List<ChatRoomDTO> getMyRooms(User currentUser) {
        if (currentUser.getRole() != User.RoleName.EMPLOYEE && currentUser.getRole() != User.RoleName.STUDENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only EMPLOYEE or STUDENT can use this endpoint.");
        }
        return roomMemberRepository.findByUser(currentUser)
                .stream()
                .map(m -> ChatRoomDTO.from(m.getRoom()))
                .toList();
    }
}
