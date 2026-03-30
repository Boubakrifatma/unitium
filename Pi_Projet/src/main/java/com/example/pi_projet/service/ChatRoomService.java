package com.example.pi_projet.service;

import com.example.pi_projet.dto.ChatRoomDTO;
import com.example.pi_projet.dto.ChatRoomRequest;
import org.springframework.dao.DataIntegrityViolationException;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.RoomType;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.MessageReactionRepository;
import com.example.pi_projet.repository.MessageRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ProjectRepository projectRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final MessageRepository messageRepository;
    private final RoomMemberRepository roomMemberRepository;

    private void checkRole(User user) {
        if (user.getRole() != User.RoleName.MANAGER && user.getRole() != User.RoleName.TUTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only MANAGER or TUTOR can manage chat rooms.");
        }
    }

    private ChatRoom getOwnedRoom(Long id, User user) {
        ChatRoom room = chatRoomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat room not found."));
        if (!room.getCreatedBy().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this chat room.");
        }
        return room;
    }

    public ChatRoomDTO createRoom(ChatRoomRequest body, User currentUser) {
        checkRole(currentUser);
        if (body.projectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "projectId is required.");
        }
        Project project = projectRepository.findById(body.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found."));
        ChatRoom room = ChatRoom.builder()
                .project(project)
                .name(body.name())
                .description(body.description())
                .roomType(body.roomType())
                .createdBy(currentUser)
                .build();
        try {
            return ChatRoomDTO.from(chatRoomRepository.save(room));
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A chatroom with the same project, name, and type already exists");
        }
    }

    public List<ChatRoomDTO> getRooms(User currentUser) {
        checkRole(currentUser);
        return chatRoomRepository.findByCreatedBy(currentUser)
                .stream()
                .map(ChatRoomDTO::from)   // convertit chaque ChatRoom en DTO
                .toList();
    }

    public ChatRoomDTO getRoom(Long id, User currentUser) {
        checkRole(currentUser);
        return ChatRoomDTO.from(getOwnedRoom(id, currentUser));
    }

    public ChatRoomDTO updateRoom(Long id, ChatRoomRequest body, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getOwnedRoom(id, currentUser);
        if (body.name() != null)        room.setName(body.name());
        if (body.description() != null) room.setDescription(body.description());
        if (body.roomType() != null)    room.setRoomType(body.roomType());
        try {
            return ChatRoomDTO.from(chatRoomRepository.save(room));
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A chatroom with the same project, name, and type already exists");
        }
    }



    //delete avec l'ordre

    //@Transactional = si une étape échoue, tout est annulé . L'ordre de suppression est important pour respecter les contraintes de clés étrangères
    @Transactional
    public void deleteRoom(Long id, User currentUser) {
        checkRole(currentUser);
        getOwnedRoom(id, currentUser);
        messageReactionRepository.deleteByRoomId(id);
        roomMemberRepository.clearLastReadMessageByRoomId(id);
        roomMemberRepository.deleteByRoomId(id);
        messageRepository.deleteByRoomId(id);
        chatRoomRepository.deleteById(id);
    }
}
