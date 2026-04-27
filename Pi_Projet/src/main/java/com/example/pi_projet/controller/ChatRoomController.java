package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.ChatRoomDTO;
import com.example.pi_projet.dto.ChatRoomRequest;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.RoomMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.RoomType;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.MessageReactionRepository;
import com.example.pi_projet.repository.MessageRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import com.example.pi_projet.service.ChatRoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Authorized
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "Chat Rooms", description = "Chat room management — MANAGER and TUTOR only")
public class ChatRoomController {

    private final ChatRoomService chatRoomService;
    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageReactionRepository messageReactionRepository;

    // ── Dashboard DTOs ───────────────────────────────────────────────────────────

    public record DashboardOverviewDTO(
            long totalMembers,
            long activeChatrooms,
            long messagesToday,
            long meetingsThisWeek,
            boolean liveNow
    ) {}

    public record MemberStatsDTO(
            Long userId,
            String fullName,
            String email,
            String role,
            long messageCount,
            long roomCount,
            LocalDateTime lastActive,
            LocalDateTime joinedAt
    ) {}

    public record RoomStatsDTO(
            Long roomId,
            String roomName,
            String roomType,
            long memberCount,
            long messageCount,
            long messagesLast7Days,
            LocalDateTime lastMessageAt,
            String lastMessagePreview,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String meetingLink,
            String meetingStatus
    ) {}

    public record ActivityDTO(
            String type,
            String userName,
            String roomName,
            String preview,
            LocalDateTime timestamp
    ) {}

    public record DayCountDTO(String date, long count, List<RoomCountDTO> roomBreakdown) {}

    public record RoomCountDTO(String roomName, long count) {}

    public record LeaderboardEntryDTO(
            int rank,
            Long userId,
            String fullName,
            long messageCount,
            long reactionCount,
            double percentage
    ) {}

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private void checkDashboardAccess(User user) {
        if (user.getRole() != User.RoleName.MANAGER && user.getRole() != User.RoleName.TUTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: MANAGER or TUTOR role required");
        }
    }

    private List<ChatRoom> getOwnedRooms(User user) {
        return chatRoomRepository.findByCreatedBy(user);
    }

    private User.RoleName expectedMemberRole(User user) {
        return user.getRole() == User.RoleName.MANAGER ? User.RoleName.EMPLOYEE : User.RoleName.STUDENT;
    }

    // ── Existing CRUD endpoints (base path: /api/chat/rooms) ─────────────────────

    @Operation(summary = "Create a new chat room")
    @PostMapping("/rooms")
    public ResponseEntity<ChatRoomDTO> createRoom(@RequestBody ChatRoomRequest body, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.status(201).body(chatRoomService.createRoom(body, currentUser));
    }

    @Operation(summary = "List chat rooms created by the current user")
    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomDTO>> getRooms(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(chatRoomService.getRooms(currentUser));
    }

    @Operation(summary = "Get a chat room by ID")
    @GetMapping("/rooms/{id}")
    public ResponseEntity<ChatRoomDTO> getRoom(@PathVariable Long id, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(chatRoomService.getRoom(id, currentUser));
    }

    @Operation(summary = "Update a chat room")
    @PutMapping("/rooms/{id}")
    public ResponseEntity<ChatRoomDTO> updateRoom(@PathVariable Long id,
                                                   @RequestBody ChatRoomRequest body,
                                                   HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(chatRoomService.updateRoom(id, body, currentUser));
    }

    @Operation(summary = "Delete a chat room")
    @DeleteMapping("/rooms/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        chatRoomService.deleteRoom(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    // ── Dashboard endpoints (base path: /api/chat/dashboard) ─────────────────────

    @Operation(summary = "Dashboard overview statistics")
    @GetMapping("/dashboard/overview")
    public ResponseEntity<DashboardOverviewDTO> getDashboardOverview(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        checkDashboardAccess(currentUser);

        List<ChatRoom> rooms = getOwnedRooms(currentUser);
        if (rooms.isEmpty()) {
            return ResponseEntity.ok(new DashboardOverviewDTO(0, 0, 0, 0, false));
        }

        // totalMembers — distinct users across all owned rooms
        List<RoomMember> allMembers = roomMemberRepository.findByRoomIn(rooms);
        long totalMembers = allMembers.stream()
                .map(rm -> rm.getUser().getId())
                .distinct()
                .count();

        // activeChatrooms
        long activeChatrooms = rooms.size();

        // messagesToday — excluding system messages and agenda items
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        long messagesToday = 0;
        for (ChatRoom room : rooms) {
            messagesToday += messageRepository.countByRoomAndCreatedAtBetweenAndIsSystemMessageFalseAndIsAgendaItemFalse(
                    room, startOfDay, endOfDay);
        }

        // meetingsThisWeek
        LocalDate today = LocalDate.now();
        LocalDateTime weekStart = today.with(DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime weekEnd = today.with(DayOfWeek.SUNDAY).atTime(LocalTime.MAX);
        long meetingsThisWeek = rooms.stream()
                .filter(r -> r.getRoomType() == RoomType.meeting
                        && r.getStartTime() != null
                        && !r.getStartTime().isBefore(weekStart)
                        && !r.getStartTime().isAfter(weekEnd))
                .count();

        // liveNow
        LocalDateTime now = LocalDateTime.now();
        boolean liveNow = rooms.stream()
                .anyMatch(r -> r.getRoomType() == RoomType.meeting
                        && r.getStartTime() != null
                        && r.getEndTime() != null
                        && !r.getStartTime().isAfter(now)
                        && !r.getEndTime().isBefore(now));

        return ResponseEntity.ok(new DashboardOverviewDTO(
                totalMembers, activeChatrooms, messagesToday, meetingsThisWeek, liveNow));
    }

    @Operation(summary = "Dashboard member statistics")
    @GetMapping("/dashboard/members")
    public ResponseEntity<List<MemberStatsDTO>> getDashboardMembers(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        checkDashboardAccess(currentUser);

        List<ChatRoom> rooms = getOwnedRooms(currentUser);
        if (rooms.isEmpty()) return ResponseEntity.ok(List.of());

        User.RoleName targetRole = expectedMemberRole(currentUser);
        List<RoomMember> allMembers = roomMemberRepository.findByRoomIn(rooms);

        // Group memberships by user, filter by target role
        Map<Long, List<RoomMember>> membershipsByUser = allMembers.stream()
                .filter(rm -> rm.getUser().getRole() == targetRole)
                .collect(Collectors.groupingBy(rm -> rm.getUser().getId()));

        // All non-system, non-agenda messages in owned rooms
        List<Message> allMessages = messageRepository.findByRoomInOrderByCreatedAtDesc(
                rooms, PageRequest.of(0, Integer.MAX_VALUE));

        Map<Long, List<Message>> messagesBySender = allMessages.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getIsSystemMessage()) && !m.isAgendaItem())
                .collect(Collectors.groupingBy(m -> m.getSender().getId()));

        List<MemberStatsDTO> result = new ArrayList<>();
        for (Map.Entry<Long, List<RoomMember>> entry : membershipsByUser.entrySet()) {
            Long userId = entry.getKey();
            List<RoomMember> memberships = entry.getValue();
            User member = memberships.get(0).getUser();

            long messageCount = messagesBySender.getOrDefault(userId, List.of()).size();
            long roomCount = memberships.size();

            LocalDateTime lastActive = messagesBySender.getOrDefault(userId, List.of()).stream()
                    .map(Message::getCreatedAt)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);

            // earliest join across all rooms for this user
            LocalDateTime joinedAt = memberships.stream()
                    .map(RoomMember::getJoinedAt)
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .orElse(null);

            result.add(new MemberStatsDTO(
                    userId,
                    member.getFullName(),
                    member.getEmail(),
                    member.getRole().name(),
                    messageCount,
                    roomCount,
                    lastActive,
                    joinedAt));
        }

        result.sort(Comparator.comparingLong(MemberStatsDTO::messageCount).reversed());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Dashboard room statistics")
    @GetMapping("/dashboard/rooms")
    public ResponseEntity<List<RoomStatsDTO>> getDashboardRooms(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        checkDashboardAccess(currentUser);

        List<ChatRoom> rooms = getOwnedRooms(currentUser);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sevenDaysAgo = now.minusDays(7);

        List<RoomStatsDTO> result = new ArrayList<>();
        for (ChatRoom room : rooms) {
            List<RoomMember> members = roomMemberRepository.findByRoom(room);
            long memberCount = members.size();

            // All messages excluding system + agenda, sorted asc (repository method)
            List<Message> allMessages = messageRepository.findByRoomOrderByCreatedAtAsc(room).stream()
                    .filter(m -> !Boolean.TRUE.equals(m.getIsSystemMessage()) && !m.isAgendaItem())
                    .collect(Collectors.toList());

            long messageCount = allMessages.size();

            long messagesLast7Days = allMessages.stream()
                    .filter(m -> m.getCreatedAt() != null && m.getCreatedAt().isAfter(sevenDaysAgo))
                    .count();

            // Last message is the last element (sorted asc)
            Message lastMsg = allMessages.isEmpty() ? null : allMessages.get(allMessages.size() - 1);
            LocalDateTime lastMessageAt = lastMsg != null ? lastMsg.getCreatedAt() : null;
            String lastMessagePreview = null;
            if (lastMsg != null && lastMsg.getContentText() != null) {
                String text = lastMsg.getContentText();
                lastMessagePreview = text.length() > 60 ? text.substring(0, 60) : text;
            }

            // Meeting status
            String meetingStatus = null;
            if (room.getRoomType() == RoomType.meeting) {
                if (room.getStartTime() != null && room.getEndTime() != null) {
                    if (now.isBefore(room.getStartTime())) {
                        meetingStatus = "UPCOMING";
                    } else if (!now.isAfter(room.getEndTime())) {
                        meetingStatus = "IN_PROGRESS";
                    } else {
                        meetingStatus = "ENDED";
                    }
                } else if (room.getStartTime() != null) {
                    meetingStatus = now.isBefore(room.getStartTime()) ? "UPCOMING" : "ENDED";
                }
            }

            result.add(new RoomStatsDTO(
                    room.getId(),
                    room.getName(),
                    room.getRoomType() != null ? room.getRoomType().name() : null,
                    memberCount,
                    messageCount,
                    messagesLast7Days,
                    lastMessageAt,
                    lastMessagePreview,
                    room.getStartTime(),
                    room.getEndTime(),
                    room.getMeetingLink(),
                    meetingStatus));
        }

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Dashboard recent activity feed")
    @GetMapping("/dashboard/activity")
    public ResponseEntity<List<ActivityDTO>> getDashboardActivity(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        checkDashboardAccess(currentUser);

        List<ChatRoom> rooms = getOwnedRooms(currentUser);
        if (rooms.isEmpty()) return ResponseEntity.ok(List.of());

        Map<Long, String> roomNames = rooms.stream()
                .collect(Collectors.toMap(ChatRoom::getId, ChatRoom::getName));

        // Last 50 messages to ensure we get 20 non-system ones after filtering
        List<Message> recentMessages = messageRepository.findByRoomInOrderByCreatedAtDesc(
                rooms, PageRequest.of(0, 50));

        List<ActivityDTO> activities = new ArrayList<>();
        recentMessages.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getIsSystemMessage()) && !m.isAgendaItem())
                .limit(20)
                .forEach(m -> {
                    String preview = m.getContentText() != null
                            ? (m.getContentText().length() > 60
                                    ? m.getContentText().substring(0, 60) + "..."
                                    : m.getContentText())
                            : "[file]";
                    activities.add(new ActivityDTO(
                            "MESSAGE",
                            m.getSender().getFullName(),
                            roomNames.get(m.getRoom().getId()),
                            preview,
                            m.getCreatedAt()));
                });

        // Last 10 join events
        roomMemberRepository.findByRoomIn(rooms).stream()
                .filter(rm -> rm.getJoinedAt() != null)
                .sorted(Comparator.comparing(RoomMember::getJoinedAt).reversed())
                .limit(10)
                .forEach(rm -> activities.add(new ActivityDTO(
                        "JOINED",
                        rm.getUser().getFullName(),
                        roomNames.get(rm.getRoom().getId()),
                        null,
                        rm.getJoinedAt())));

        // Merge and sort by timestamp desc, return top 20
        activities.sort(Comparator.comparing(
                a -> a.timestamp() != null ? a.timestamp() : LocalDateTime.MIN,
                Comparator.reverseOrder()));

        return ResponseEntity.ok(activities.stream().limit(20).collect(Collectors.toList()));
    }

    @Operation(summary = "Dashboard daily message chart (last 7 days)")
    @GetMapping("/dashboard/chart")
    public ResponseEntity<List<DayCountDTO>> getDashboardChart(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        checkDashboardAccess(currentUser);

        List<ChatRoom> rooms = getOwnedRooms(currentUser);

        LocalDateTime from = LocalDate.now().minusDays(6).atStartOfDay();
        LocalDateTime to = LocalDateTime.now();

        List<Message> messages = rooms.isEmpty()
                ? List.of()
                : messageRepository.findByRoomInAndCreatedAtBetweenAndIsSystemMessageFalse(rooms, from, to);

        Map<Long, String> roomNames = rooms.stream()
                .collect(Collectors.toMap(ChatRoom::getId, ChatRoom::getName));

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        List<DayCountDTO> result = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            LocalDateTime dayStart = day.atStartOfDay();
            LocalDateTime dayEnd = day.atTime(LocalTime.MAX);

            List<Message> dayMessages = messages.stream()
                    .filter(m -> m.getCreatedAt() != null
                            && !m.getCreatedAt().isBefore(dayStart)
                            && !m.getCreatedAt().isAfter(dayEnd))
                    .collect(Collectors.toList());

            Map<Long, Long> countByRoom = dayMessages.stream()
                    .collect(Collectors.groupingBy(m -> m.getRoom().getId(), Collectors.counting()));

            List<RoomCountDTO> breakdown = countByRoom.entrySet().stream()
                    .map(e -> new RoomCountDTO(roomNames.getOrDefault(e.getKey(), "?"), e.getValue()))
                    .sorted(Comparator.comparingLong(RoomCountDTO::count).reversed())
                    .collect(Collectors.toList());

            result.add(new DayCountDTO(day.format(fmt), dayMessages.size(), breakdown));
        }

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Dashboard leaderboard — top members by message count")
    @GetMapping("/dashboard/leaderboard")
    public ResponseEntity<List<LeaderboardEntryDTO>> getDashboardLeaderboard(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        checkDashboardAccess(currentUser);

        List<ChatRoom> rooms = getOwnedRooms(currentUser);
        if (rooms.isEmpty()) return ResponseEntity.ok(List.of());

        User.RoleName targetRole = expectedMemberRole(currentUser);
        List<RoomMember> allMembers = roomMemberRepository.findByRoomIn(rooms);

        // Distinct users filtered by target role
        Map<Long, User> usersById = allMembers.stream()
                .map(RoomMember::getUser)
                .filter(u -> u.getRole() == targetRole)
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        // Message counts per user
        List<Message> allMessages = messageRepository.findByRoomInOrderByCreatedAtDesc(
                rooms, PageRequest.of(0, Integer.MAX_VALUE));

        Map<Long, Long> msgCountByUser = allMessages.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getIsSystemMessage()) && !m.isAgendaItem())
                .collect(Collectors.groupingBy(m -> m.getSender().getId(), Collectors.counting()));

        // Sort by message count desc
        List<Map.Entry<Long, User>> sorted = new ArrayList<>(usersById.entrySet());
        sorted.sort(Comparator.comparingLong(
                (Map.Entry<Long, User> e) -> msgCountByUser.getOrDefault(e.getKey(), 0L)).reversed());

        long maxCount = sorted.isEmpty() ? 1L : msgCountByUser.getOrDefault(sorted.get(0).getKey(), 0L);
        if (maxCount == 0) maxCount = 1;

        List<LeaderboardEntryDTO> result = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            Long userId = sorted.get(i).getKey();
            User user = sorted.get(i).getValue();
            long msgCount = msgCountByUser.getOrDefault(userId, 0L);
            long reactionCount = messageReactionRepository.countByUserAndMessageRoomIn(user, rooms);
            double percentage = (double) msgCount / maxCount * 100.0;

            result.add(new LeaderboardEntryDTO(
                    i + 1, userId, user.getFullName(), msgCount, reactionCount, percentage));
        }

        return ResponseEntity.ok(result);
    }
}
