package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.RoomMember;
import com.example.pi_projet.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

    List<RoomMember> findByRoom(ChatRoom room);

    List<RoomMember> findByUser(User user);

    boolean existsByRoomAndUser(ChatRoom room, User user);

    @Transactional
    void deleteByRoomAndUser(ChatRoom room, User user);
}
