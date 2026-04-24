package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    List<ChatRoom> findByCreatedBy(User createdBy);
    boolean existsByIdAndCreatedBy(Long id, User createdBy);

    /**
     * Find the unique PO-Manager chatroom for a given project + PO + manager triple.
     * Used to enforce the one-room-per-context business rule.
     */
    @Query("SELECT r FROM ChatRoom r WHERE r.project.id = :projectId " +
           "AND r.roomType = :roomType " +
           "AND r.productOwnerId = :poId " +
           "AND r.createdBy.id = :managerId")
    Optional<ChatRoom> findPoManagerRoom(@Param("projectId") UUID projectId,
                                         @Param("roomType")  RoomType roomType,
                                         @Param("poId")      Long poId,
                                         @Param("managerId") Long managerId);

    /** All rooms where the user is a member (used for PO room listing). */
    @Query("SELECT rm.room FROM RoomMember rm WHERE rm.user.id = :userId")
    List<ChatRoom> findRoomsByMemberId(@Param("userId") Long userId);
}
