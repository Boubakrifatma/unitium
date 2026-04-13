package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import com.example.pi_projet.service.M2AuditLogService;
import com.example.pi_projet.service.PdfExportService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Authorized
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/export")
@RequiredArgsConstructor
public class ExportController {

    private final PdfExportService     pdfExportService;
    private final M2AuditLogService    auditLogService;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportWorkspacePdf(
            @PathVariable UUID workspaceId,
            @RequestParam(defaultValue = "30") int periodDays,
            HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireExportPermission(user, workspaceId);

        byte[] pdf = pdfExportService.generateReport(workspaceId, periodDays);
        String wsName = pdfExportService.getWorkspaceName(workspaceId);

        auditLogService.writeAudit(user.getId(), null, "PDF_EXPORT_GENERATED",
            "workspace", workspaceId.toString(), wsName, workspaceId, request.getRemoteAddr());

        String fileName = wsName.replaceAll("[^a-zA-Z0-9\\-_]", "_") + "-report.pdf";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(fileName).build());
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentLength(pdf.length);
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    private void requireExportPermission(User user, UUID workspaceId) {
        // Allow top-level platform roles: SUPER_ADMIN, ADMIN, MANAGER, TUTOR
        User.RoleName role = user.getRole();
        if (role == User.RoleName.SUPER_ADMIN || role == User.RoleName.ADMIN
                || role == User.RoleName.MANAGER || role == User.RoleName.TUTOR) {
            return;
        }

        // Also allow workspace-level roles: OWNER, ADMIN, MANAGER, TA
        boolean ok = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .map(m -> m.getRole() == WorkspaceMember.WorkspaceRole.OWNER
                   || m.getRole() == WorkspaceMember.WorkspaceRole.ADMIN
                   || m.getRole() == WorkspaceMember.WorkspaceRole.MANAGER
                   || m.getRole() == WorkspaceMember.WorkspaceRole.TA)
            .orElse(false);

        if (!ok) throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
            "Only workspace OWNER, ADMIN, MANAGER or TA may export this report");
    }

    private User requireCurrentUser(HttpServletRequest request) {
        Object attr = request.getAttribute("currentUser");
        if (attr instanceof User u) return u;
        throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Authentication required");
    }
}
