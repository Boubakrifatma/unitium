package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.M2AuditLogService;
import com.example.pi_projet.service.PulseEventBus;
import com.example.pi_projet.service.PulseService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Authorized
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/pulse")
@RequiredArgsConstructor
public class PulseController {

    private final PulseService pulseService;
    private final PulseEventBus eventBus;
    private final M2AuditLogService auditLogService;

    @GetMapping("/snapshot")
    public Map<String, Object> getSnapshot(
            @PathVariable UUID workspaceId,
            HttpServletRequest request) {
        User user = requireCurrentUser(request);
        auditLogService.writeAudit(user.getId(), null, "PULSE_VIEWED",
            "workspace", workspaceId.toString(), null, workspaceId, request.getRemoteAddr());
        return pulseService.buildSnapshot(workspaceId);
    }

    @GetMapping("/heatmap")
    public List<Map<String, Object>> getHeatmap(
            @PathVariable UUID workspaceId,
            @RequestParam(defaultValue = "12") int weeks,
            HttpServletRequest request) {
        User user = requireCurrentUser(request);
        auditLogService.writeAudit(user.getId(), null, "PULSE_HEATMAP_VIEWED",
            "workspace", workspaceId.toString(), null, workspaceId, request.getRemoteAddr());
        return pulseService.buildHeatmap(workspaceId, weeks);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter openStream(
            @PathVariable UUID workspaceId,
            HttpServletRequest request) {
        User user = requireCurrentUser(request);
        auditLogService.writeAudit(user.getId(), null, "PULSE_STREAM_OPENED",
            "workspace", workspaceId.toString(), null, workspaceId, request.getRemoteAddr());
        SseEmitter emitter = new SseEmitter(0L);
        eventBus.register(workspaceId, emitter);
        return emitter;
    }

    private User requireCurrentUser(HttpServletRequest request) {
        Object attr = request.getAttribute("currentUser");
        if (attr instanceof User u) return u;
        throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Authentication required");
    }
}
