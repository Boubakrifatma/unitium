package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.Report;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByRoomInAndStatusOrderByCreatedAtDesc(List<ChatRoom> rooms, ReportStatus status);

    List<Report> findByRoomInOrderByCreatedAtDesc(List<ChatRoom> rooms);

    long countByRoomInAndStatus(List<ChatRoom> rooms, ReportStatus status);

    boolean existsByReporterAndReportedMessage(User reporter, Message message);

    @Modifying
    @Query("delete from Report r where r.reportedMessage.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") Long roomId);
}
