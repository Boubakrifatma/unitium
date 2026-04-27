package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.AuditLogDTO;
import com.example.pi_projet.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Authorized
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Activity history (Module 1)")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @Operation(summary = "Get all audit logs (most recent first)")
    @GetMapping
    public ResponseEntity<List<AuditLogDTO>> getAll() {
        return ResponseEntity.ok(auditLogService.getAll());
    }

    @Operation(summary = "Get audit logs for a specific user")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AuditLogDTO>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(auditLogService.getByUser(userId));
    }

    @Operation(summary = "Get audit logs by entity type (ORGANIZATION, ORG_MEMBER...)")
    @GetMapping("/entity/{entityType}")
    public ResponseEntity<List<AuditLogDTO>> getByEntityType(@PathVariable String entityType) {
        return ResponseEntity.ok(auditLogService.getByEntityType(entityType));
    }
}
