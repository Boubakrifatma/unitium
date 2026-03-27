package com.example.pi_projet.service;

import com.example.pi_projet.dto.RoomMemberDTO;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.RoomMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomMemberService {

    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;

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
        return RoomMemberDTO.from(roomMemberRepository.save(member));
    }

    public void removeMember(Long roomId, Long userId, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getOwnedRoom(roomId, currentUser);

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        roomMemberRepository.deleteByRoomAndUser(room, target);
    }

    public List<RoomMemberDTO> getMembers(Long roomId, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getOwnedRoom(roomId, currentUser);
        return roomMemberRepository.findByRoom(room)
                .stream()
                .map(RoomMemberDTO::from)
                .toList();
    }
}
