package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.RoomMember;
import com.example.pi_projet.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

    List<RoomMember> findByRoom(ChatRoom room);

    List<RoomMember> findByUser(User user);

    boolean existsByRoomAndUser(ChatRoom room, User user);

    @Transactional
    void deleteByRoomAndUser(ChatRoom room, User user);


    // // Met lastReadMessage à NULL pour tous les membres d'une room
    @Modifying
    @Transactional
    @Query("UPDATE RoomMember rm SET rm.lastReadMessage = null WHERE rm.room.id = :roomId")
    void clearLastReadMessageByRoomId(@Param("roomId") Long roomId);

    @Modifying
    @Transactional
    @Query("UPDATE RoomMember rm SET rm.lastReadMessage = null WHERE rm.lastReadMessage.id = :messageId")
    void clearLastReadMessageByMessageId(@Param("messageId") Long messageId);


    // // Supprime tous les membres d'une room par son id
    @Modifying
    @Transactional
    @Query("DELETE FROM RoomMember rm WHERE rm.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") Long roomId);

    List<RoomMember> findByRoomIn(List<ChatRoom> rooms);

    long countByRoomIn(List<ChatRoom> rooms);
}
