package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.MessageRepository;
import com.example.pi_projet.service.SentimentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Tag(name = "Sentiment", description = "Sentiment analysis for chat messages")
public class SentimentController {

    private final SentimentService sentimentService;
    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;

    // ── Pre-send analysis ─────────────────────────────────────────────────────

    @Authorized
    @Operation(summary = "Analyze sentiment of a text before sending")
    @PostMapping("/api/sentiment/analyze")
    public ResponseEntity<Map<String, Object>> analyze(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) return ResponseEntity.status(403).build();

        String text = body.get("text");
        if (text == null || text.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "text is required"));

        SentimentService.SentimentResult result = sentimentService.analyze(text);
        return ResponseEntity.ok(Map.of(
                "label", result.label(),
                "score", result.score()
        ));
    }

    // ── Global sentiment stats (manager / tutor) ──────────────────────────────

    @Authorized
    @Operation(summary = "Get global sentiment statistics for all chat messages")
    @GetMapping("/api/chat/sentiment-stats")
    public ResponseEntity<Map<String, Object>> getSentimentStats(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) return ResponseEntity.status(403).build();

        // Only MANAGER and TUTOR see global stats
        if (currentUser.getRole() != User.RoleName.MANAGER
                && currentUser.getRole() != User.RoleName.TUTOR
                && currentUser.getRole() != User.RoleName.ADMIN
                && currentUser.getRole() != User.RoleName.SUPER_ADMIN) {
            return ResponseEntity.status(403).build();
        }

        // ── Overall distribution ──────────────────────────────────────────────
        Map<String, Long> distribution = new LinkedHashMap<>();
        distribution.put("POSITIVE", 0L);
        distribution.put("NEUTRAL", 0L);
        distribution.put("NEGATIVE", 0L);

        for (Object[] row : messageRepository.countBySentimentLabel()) {
            String label = (String) row[0];
            Long count = (Long) row[1];
            if (label != null) distribution.put(label, count);
        }

        long total = distribution.values().stream().mapToLong(Long::longValue).sum();

        // ── Daily trend (last 30 days) ────────────────────────────────────────
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<Map<String, Object>> dailyTrend = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // Build a date-keyed map
        Map<String, Map<String, Long>> byDate = new LinkedHashMap<>();
        for (Object[] row : messageRepository.dailySentimentSince(since)) {
            String date;
            Object dateObj = row[0];
            if (dateObj instanceof LocalDate ld) {
                date = ld.format(fmt);
            } else if (dateObj instanceof LocalDateTime ldt) {
                date = ldt.toLocalDate().format(fmt);
            } else {
                date = dateObj.toString().substring(0, 10);
            }
            String label = (String) row[1];
            Long count = (Long) row[2];
            byDate.computeIfAbsent(date, k -> new LinkedHashMap<>()).put(label, count);
        }

        byDate.forEach((date, counts) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", date);
            entry.put("positive", counts.getOrDefault("POSITIVE", 0L));
            entry.put("neutral", counts.getOrDefault("NEUTRAL", 0L));
            entry.put("negative", counts.getOrDefault("NEGATIVE", 0L));
            dailyTrend.add(entry);
        });

        // ── Per-room breakdown ────────────────────────────────────────────────
        List<Map<String, Object>> roomBreakdown = new ArrayList<>();
        for (ChatRoom room : chatRoomRepository.findAll()) {
            Map<String, Long> roomDist = new LinkedHashMap<>();
            roomDist.put("POSITIVE", 0L);
            roomDist.put("NEUTRAL", 0L);
            roomDist.put("NEGATIVE", 0L);
            for (Object[] row : messageRepository.countBySentimentLabelForRoom(room)) {
                String label = (String) row[0];
                Long count = (Long) row[1];
                if (label != null) roomDist.put(label, count);
            }
            long roomTotal = roomDist.values().stream().mapToLong(Long::longValue).sum();
            if (roomTotal == 0) continue;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("roomId", room.getId());
            entry.put("roomName", room.getName());
            entry.put("positive", roomDist.get("POSITIVE"));
            entry.put("neutral", roomDist.get("NEUTRAL"));
            entry.put("negative", roomDist.get("NEGATIVE"));
            entry.put("total", roomTotal);
            roomBreakdown.add(entry);
        }

        // ── Top flagged users (most NEGATIVE messages) ────────────────────────
        List<Message> allWithSentiment = messageRepository.findAllWithSentiment();
        Map<String, Long> negativeByUser = allWithSentiment.stream()
                .filter(m -> "NEGATIVE".equals(m.getSentimentLabel()))
                .collect(Collectors.groupingBy(
                        m -> m.getSender().getFullName(),
                        Collectors.counting()
                ));

        List<Map<String, Object>> topFlagged = negativeByUser.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("userName", e.getKey());
                    entry.put("negativeCount", e.getValue());
                    return entry;
                })
                .collect(Collectors.toList());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("distribution", distribution);
        stats.put("dailyTrend", dailyTrend);
        stats.put("roomBreakdown", roomBreakdown);
        stats.put("topFlaggedUsers", topFlagged);

        return ResponseEntity.ok(stats);
    }

    // ── Per-room sentiment stats ───────────────────────────────────────────────

    @Authorized
    @Operation(summary = "Get sentiment stats for a specific room")
    @GetMapping("/api/chat/rooms/{roomId}/sentiment-stats")
    public ResponseEntity<Map<String, Object>> getRoomSentimentStats(
            @PathVariable Long roomId,
            HttpServletRequest request) {

        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) return ResponseEntity.status(403).build();

        if (currentUser.getRole() != User.RoleName.MANAGER
                && currentUser.getRole() != User.RoleName.TUTOR
                && currentUser.getRole() != User.RoleName.ADMIN
                && currentUser.getRole() != User.RoleName.SUPER_ADMIN) {
            return ResponseEntity.status(403).build();
        }

        ChatRoom room = chatRoomRepository.findById(roomId).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();

        Map<String, Long> distribution = new LinkedHashMap<>();
        distribution.put("POSITIVE", 0L);
        distribution.put("NEUTRAL", 0L);
        distribution.put("NEGATIVE", 0L);
        for (Object[] row : messageRepository.countBySentimentLabelForRoom(room)) {
            String label = (String) row[0];
            Long count = (Long) row[1];
            if (label != null) distribution.put(label, count);
        }
        long total = distribution.values().stream().mapToLong(Long::longValue).sum();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("roomId", roomId);
        stats.put("roomName", room.getName());
        stats.put("total", total);
        stats.put("distribution", distribution);

        return ResponseEntity.ok(stats);
    }
}
