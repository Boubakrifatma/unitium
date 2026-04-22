package com.example.pi_projet.service;

import com.example.pi_projet.dto.ModerationActionRequest;
import com.example.pi_projet.dto.ReportDTO;
import com.example.pi_projet.dto.ReportRequest;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.enums.ModerationAction;
import com.example.pi_projet.enums.ReportCategory;
import com.example.pi_projet.enums.ReportStatus;
import com.example.pi_projet.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ModerationService {

    private final ReportRepository reportRepository;
    private final UserMuteRepository userMuteRepository;
    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final UserRepository userRepository;
    private final RoomMemberService roomMemberService;
    private final SimpMessagingTemplate messagingTemplate;

    private static final Set<String> OFFENSIVE_WORDS = Set.of(
            "idiot", "stupid", "hate", "kill"
    );

    // ── createReport ────────────────────────────────────────────────────────────
    @Transactional
    public ReportDTO createReport(ReportRequest body, User currentUser) {
        if (currentUser.getRole() != User.RoleName.EMPLOYEE
                && currentUser.getRole() != User.RoleName.STUDENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only EMPLOYEE or STUDENT can submit reports.");
        }

        ChatRoom room = chatRoomRepository.findById(body.roomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found."));

        boolean isOwner = room.getCreatedBy().getId().equals(currentUser.getId());
        boolean isMember = roomMemberRepository.existsByRoomAndUser(room, currentUser);
        if (!isOwner && !isMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this room.");
        }

        Message message = messageRepository.findById(body.messageId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));

        if (!message.getRoom().getId().equals(room.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Message does not belong to this room.");
        }

        if (reportRepository.existsByReporterAndReportedMessage(currentUser, message)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "You have already reported this message.");
        }

        ReportCategory category = null;
        try {
            category = ReportCategory.valueOf(body.category());
        } catch (IllegalArgumentException | NullPointerException ignored) {
            // leave null if invalid
        }

        String aiSuggestion = generateAiSuggestion(message.getContentText());

        Report report = Report.builder()
                .reportedMessage(message)
                .reporter(currentUser)
                .room(room)
                .category(category)
                .description(body.description())
                .anonymous(body.anonymous())
                .aiSuggestion(aiSuggestion)
                .build();

        report = reportRepository.save(report);

        // Notify room owner
        User roomOwner = room.getCreatedBy();
        String preview = message.getContentText() != null
                ? message.getContentText().substring(0, Math.min(60, message.getContentText().length()))
                : "";

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "NEW_REPORT");
        notification.put("reportId", report.getId());
        notification.put("roomId", room.getId());
        notification.put("roomName", room.getName());
        notification.put("category", body.category());
        notification.put("messagePreview", preview);
        notification.put("isAnonymous", body.anonymous());
        notification.put("reporterName", body.anonymous() ? null : currentUser.getFullName());
        notification.put("createdAt", report.getCreatedAt().toString());
        messagingTemplate.convertAndSend("/topic/notifications/" + roomOwner.getId(), (Object) notification);

        return ReportDTO.from(report);
    }

    // ── getPendingReports ───────────────────────────────────────────────────────
    public List<ReportDTO> getPendingReports(User currentUser) {
        checkModeratorRole(currentUser);
        List<ChatRoom> ownedRooms = chatRoomRepository.findByCreatedBy(currentUser);
        return reportRepository
                .findByRoomInAndStatusOrderByCreatedAtDesc(ownedRooms, ReportStatus.PENDING)
                .stream()
                .map(ReportDTO::from)
                .toList();
    }

    // ── getAllReports ───────────────────────────────────────────────────────────
    public List<ReportDTO> getAllReports(User currentUser) {
        checkModeratorRole(currentUser);
        List<ChatRoom> ownedRooms = chatRoomRepository.findByCreatedBy(currentUser);
        return reportRepository
                .findByRoomInOrderByCreatedAtDesc(ownedRooms)
                .stream()
                .map(ReportDTO::from)
                .toList();
    }

    // ── getPendingReportCount ───────────────────────────────────────────────────
    public long getPendingReportCount(User currentUser) {
        checkModeratorRole(currentUser);
        List<ChatRoom> ownedRooms = chatRoomRepository.findByCreatedBy(currentUser);
        return reportRepository.countByRoomInAndStatus(ownedRooms, ReportStatus.PENDING);
    }

    // ── takeAction ──────────────────────────────────────────────────────────────
    @Transactional
    public ReportDTO takeAction(Long reportId, ModerationActionRequest body, User currentUser) {
        checkModeratorRole(currentUser);

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found."));

        if (!report.getRoom().getCreatedBy().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You do not own this room.");
        }

        ModerationAction action;
        try {
            action = ModerationAction.valueOf(body.action());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action: " + body.action());
        }

        User author = report.getReportedMessage().getSender();
        ChatRoom room = report.getRoom();

        switch (action) {
            case WARN -> broadcastToUser(author.getId(), Map.of(
                    "type", "MODERATION_WARNING",
                    "roomName", room.getName(),
                    "message", "Your message was flagged. Please follow community guidelines."
            ));

            case MUTE_1H -> {
                createMute(author, room, currentUser, LocalDateTime.now().plusHours(1));
                broadcastToUser(author.getId(), Map.of(
                        "type", "MODERATION_WARNING",
                        "roomName", room.getName(),
                        "message", "You have been muted in this room for 1 hour."
                ));
            }

            case MUTE_24H -> {
                createMute(author, room, currentUser, LocalDateTime.now().plusHours(24));
                broadcastToUser(author.getId(), Map.of(
                        "type", "MODERATION_WARNING",
                        "roomName", room.getName(),
                        "message", "You have been muted in this room for 24 hours."
                ));
            }

            case MUTE_7D -> {
                createMute(author, room, currentUser, LocalDateTime.now().plusDays(7));
                broadcastToUser(author.getId(), Map.of(
                        "type", "MODERATION_WARNING",
                        "roomName", room.getName(),
                        "message", "You have been muted in this room for 7 days."
                ));
            }

            case REMOVE_FROM_ROOM -> {
                roomMemberService.removeMember(room.getId(), author.getId(), currentUser);
            }

            case DELETE_MESSAGE -> {
                Message msg = report.getReportedMessage();
                msg.setDeleted(true);
                messageRepository.save(msg);
                messagingTemplate.convertAndSend("/topic/rooms/" + room.getId(),
                        com.example.pi_projet.dto.MessageDTO.from(msg));
            }

            case BAN -> {
                author.setIsActive(false);
                userRepository.save(author);
                broadcastToUser(author.getId(), Map.of(
                        "type", "MODERATION_WARNING",
                        "roomName", room.getName(),
                        "message", "Your account has been banned."
                ));
            }

            case NONE -> { /* no-op */ }
        }

        // Resolve report
        boolean isDismiss = action == ModerationAction.NONE;
        report.setStatus(isDismiss ? ReportStatus.DISMISSED : ReportStatus.RESOLVED);
        report.setActionTaken(action);
        report.setReviewedBy(currentUser);
        report.setResolvedAt(LocalDateTime.now());
        report = reportRepository.save(report);

        // Notify reporter if not anonymous
        if (!report.isAnonymous()) {
            broadcastToUser(report.getReporter().getId(), Map.of(
                    "type", "REPORT_RESOLVED",
                    "roomName", room.getName(),
                    "action", action.name(),
                    "message", "Your report has been reviewed and action has been taken."
            ));
        }

        return ReportDTO.from(report);
    }

    // ── dismissReport ───────────────────────────────────────────────────────────
    @Transactional
    public ReportDTO dismissReport(Long reportId, User currentUser) {
        return takeAction(reportId, new ModerationActionRequest("NONE", null), currentUser);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private void checkModeratorRole(User user) {
        if (user.getRole() != User.RoleName.MANAGER && user.getRole() != User.RoleName.TUTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only MANAGER or TUTOR can access moderation.");
        }
    }

    private String generateAiSuggestion(String content) {
        if (content == null) return ModerationAction.NONE.name();

        String lower = content.toLowerCase();
        for (String word : OFFENSIVE_WORDS) {
            if (lower.contains(word)) {
                return ModerationAction.WARN.name();
            }
        }

        // Very short repeated text detection (e.g. "aaa" or "ha ha ha ha ha")
        if (content.trim().length() < 10) {
            String[] words = content.trim().split("\\s+");
            if (words.length > 1) {
                String first = words[0];
                boolean allSame = true;
                for (String w : words) {
                    if (!w.equalsIgnoreCase(first)) { allSame = false; break; }
                }
                if (allSame) return ModerationAction.DELETE_MESSAGE.name();
            }
        }

        return ModerationAction.NONE.name();
    }

    private void createMute(User user, ChatRoom room, User mutedBy, LocalDateTime expiresAt) {
        UserMute mute = UserMute.builder()
                .mutedUser(user)
                .room(room)
                .mutedBy(mutedBy)
                .expiresAt(expiresAt)
                .build();
        userMuteRepository.save(mute);
    }

    private void broadcastToUser(Long userId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, (Object) payload);
    }
}
