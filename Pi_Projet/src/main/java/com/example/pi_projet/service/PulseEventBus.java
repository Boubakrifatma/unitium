package com.example.pi_projet.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
@Slf4j
public class PulseEventBus {

    private final Map<UUID, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public void register(UUID workspaceId, SseEmitter emitter) {
        emitters.computeIfAbsent(workspaceId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(workspaceId, emitter));
        emitter.onError(e -> remove(workspaceId, emitter));
        emitter.onTimeout(() -> remove(workspaceId, emitter));
    }

    public void publish(UUID workspaceId, String type, String message, String actorDisplayName) {
        List<SseEmitter> list = emitters.get(workspaceId);
        if (list == null || list.isEmpty()) return;
        String json = String.format(
            "{\"type\":\"%s\",\"message\":\"%s\",\"actorDisplayName\":\"%s\",\"timestamp\":\"%s\"}",
            esc(type), esc(message), esc(actorDisplayName), Instant.now());
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().data(json));
            } catch (IOException e) {
                remove(workspaceId, emitter);
            }
        }
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void remove(UUID workspaceId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(workspaceId);
        if (list != null) list.remove(emitter);
    }
}
