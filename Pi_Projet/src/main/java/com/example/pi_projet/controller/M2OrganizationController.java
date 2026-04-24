package com.example.pi_projet.controller;

import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.M2OrganizationProvisioningService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
public class M2OrganizationController {

    private final M2OrganizationProvisioningService organizationProvisioningService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createOrganization(@RequestBody Map<String, String> body,
                                                  HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        var provisioned = organizationProvisioningService.createOrganizationForCurrentUser(
            currentUser,
            body.get("name"),
            body.get("slug"),
            body.get("orgType")
        );

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("organizationId", provisioned.organization().getId());
        out.put("organizationName", provisioned.organization().getName());
        out.put("organizationSlug", provisioned.organization().getSlug());
        out.put("organizationType", provisioned.organization().getOrgType() != null ? provisioned.organization().getOrgType().name() : null);
        out.put("defaultWorkspaceId", provisioned.defaultWorkspace().getId());
        out.put("defaultWorkspaceName", provisioned.defaultWorkspace().getName());
        out.put("message", "Organization created and default workspace provisioned");
        return out;
    }

    private User requireCurrentUser(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        if (!(user instanceof User currentUser)) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Missing authenticated user context");
        }
        return currentUser;
    }
}
