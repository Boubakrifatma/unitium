package com.example.pi_projet.service;

import com.example.pi_projet.dto.ChatRoomDTO;
import com.example.pi_projet.dto.MemberSuggestionDTO;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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


    // gérer les membres de tes propres chatrooms
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


    //diffuse en temps réel un message système :
    // Puis l'envoie via WebSocket dans chatrooms : ex: "Bob has been removed from the room"
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

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "ADDED_TO_ROOM");
        notification.put("roomId", room.getId());
        notification.put("roomName", room.getName());
        notification.put("addedByName", currentUser.getFullName());
        notification.put("sentAt", LocalDateTime.now().toString());
        messagingTemplate.convertAndSend("/topic/notifications/" + target.getId(), (Object) notification);

        return result;
    }

    public void removeMember(Long roomId, Long userId, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getOwnedRoom(roomId, currentUser);

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "REMOVED_FROM_ROOM");
        notification.put("roomId", room.getId());
        notification.put("roomName", room.getName());
        notification.put("removedByName", currentUser.getFullName());
        notification.put("sentAt", LocalDateTime.now().toString());
        messagingTemplate.convertAndSend("/topic/notifications/" + target.getId(), (Object) notification);

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

    public List<MemberSuggestionDTO> getMemberSuggestions(Long roomId, User currentUser) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat room not found."));

        boolean isOwner = room.getCreatedBy().getId().equals(currentUser.getId());
        boolean isMember = roomMemberRepository.existsByRoomAndUser(room, currentUser);
        if (!isOwner && !isMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this room.");
        }

        List<MemberSuggestionDTO> suggestions = new ArrayList<>();

        roomMemberRepository.findByRoom(room).stream()
                .map(m -> new MemberSuggestionDTO(
                        m.getUser().getId(),
                        m.getUser().getFullName(),
                        m.getUser().getRole().name()))
                .forEach(suggestions::add);

        User owner = room.getCreatedBy();
        MemberSuggestionDTO ownerDto = new MemberSuggestionDTO(
                owner.getId(), owner.getFullName(), owner.getRole().name());
        if (suggestions.stream().noneMatch(s -> s.id().equals(owner.getId()))) {
            suggestions.add(ownerDto);
        }

        return suggestions;
    }

    public List<ChatRoomDTO> getMyRooms(User currentUser) {
        User.RoleName role = currentUser.getRole();

        // PRODUCT_OWNER, EMPLOYEE and STUDENT all use the membership table.
        // PRODUCT_OWNER is automatically added to po_manager rooms on deliverable acceptance.
        if (role == User.RoleName.PRODUCT_OWNER
                || role == User.RoleName.EMPLOYEE
                || role == User.RoleName.STUDENT) {
            return roomMemberRepository.findByUser(currentUser)
                    .stream()
                    .map(m -> ChatRoomDTO.from(m.getRoom()))
                    .toList();
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Only EMPLOYEE, STUDENT or PRODUCT_OWNER can use this endpoint.");
    }
}
