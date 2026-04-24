package com.example.pi_projet.controller;

import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableNotification;
import com.example.pi_projet.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/deliverable-notifications")
@RequiredArgsConstructor
public class DeliverableNotificationController {

    private final NotificationService notificationService;

    /** Active SSE emitters keyed by userId */
    private static final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emitters =
            new ConcurrentHashMap<>();

    // ─────────────────────────────────────────────────────────────────────────
    // SSE — real-time stream
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/deliverable-notifications/stream?userId=X
     * Frontend s'abonne à ce flux SSE pour recevoir les notifs en temps réel.
     */
    // SSE timeout: 30 min. Client reconnects automatically if the stream drops.
    private static final long SSE_TIMEOUT_MS = 30 * 60 * 1000L;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestParam Long userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError(e -> removeEmitter(userId, emitter));

        // Send a heartbeat immediately so the client knows the stream is live.
        // The initial unread count is fetched by the client via GET /unread-count.
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException ignored) {
            removeEmitter(userId, emitter);
        }
        return emitter;
    }

    /** Called by NotificationService to push real-time event to a user */
    public static void push(Long userId, DeliverableNotification notif) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters == null) return;
        List<SseEmitter> dead = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : userEmitters) {
            try {
                java.util.LinkedHashMap<String, Object> payload = new java.util.LinkedHashMap<>();
                payload.put("id", notif.getId());
                payload.put("title", notif.getTitle());
                payload.put("message", notif.getMessage());
                payload.put("eventType", notif.getEventType().name());
                payload.put("deliverableId", notif.getDeliverable() != null ? notif.getDeliverable().getId() : null);
                payload.put("createdAt", notif.getCreatedAt().toString());
                payload.put("isRead", false);
                emitter.send(SseEmitter.event().name("notification").data(payload));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        userEmitters.removeAll(dead);
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(userId);
        if (list != null) list.remove(emitter);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MANAGER VIEWED — déclenché quand le manager ouvre le dialog de review
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/deliverable-notifications/manager-viewed/{deliverableId}?managerId=X
     * Notifie l'employé que le manager a ouvert son livrable pour le réviser.
     */
    @PostMapping("/manager-viewed/{deliverableId}")
    public ResponseEntity<Void> notifyManagerViewed(
            @PathVariable Long deliverableId,
            @RequestParam Long managerId) {
        notificationService.notifyEmployeeOnManagerViewed(deliverableId, managerId);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REST — polling fallback
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll(@RequestParam Long userId) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Map<String, Object>>> getUnread(@RequestParam Long userId) {
        return ResponseEntity.ok(notificationService.getUnreadNotificationsForUser(userId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> countUnread(@RequestParam Long userId) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(userId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@RequestParam Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }
}
