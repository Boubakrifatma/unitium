package com.example.pi_projet.service;

import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.OrganizationMemberRepository;
import com.example.pi_projet.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class OrganizationContextService {

    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationRepository organizationRepository;

    public Map<String, Object> getOrganizationContextForUser(User currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new Module2Exception(FORBIDDEN, "Missing authenticated user context");
        }

        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndDeletedAtIsNull(currentUser.getId());
        if (memberships.isEmpty()) {
            log.error("No active organization membership found for userId={}", currentUser.getId());
            throw new Module2Exception(NOT_FOUND, "User is not assigned to any organization");
        }
        if (memberships.size() > 1) {
            log.error("Multiple active organization memberships found for userId={} count={}", currentUser.getId(), memberships.size());
            throw new Module2Exception(CONFLICT, "User has multiple active organizations; expected exactly one");
        }

        OrganizationMember membership = memberships.get(0);
        var org = membership.getOrganization();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("organizationId", org.getId());
        response.put("organizationName", org.getName());
        response.put("organizationSlug", org.getSlug());
        response.put("organizationType", org.getOrgType() != null ? org.getOrgType().name() : null);
        response.put("membershipRole", membership.getRole() != null ? membership.getRole().name() : null);
        return response;
    }

    public List<Map<String, Object>> getOrganizationOptionsForUser(User currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new Module2Exception(FORBIDDEN, "Missing authenticated user context");
        }

        if (isGlobalAdmin(currentUser)) {
            return organizationRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(org -> toOrganizationResponse(org.getId(), org.getName(), org.getSlug(), org.getOrgType() != null ? org.getOrgType().name() : null, "GLOBAL_ADMIN"))
                .toList();
        }

        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndDeletedAtIsNull(currentUser.getId());
        if (memberships.isEmpty()) {
            log.error("No active organization membership found for userId={} when listing organizations", currentUser.getId());
            throw new Module2Exception(NOT_FOUND, "User is not assigned to any organization");
        }

        Set<Object> seenOrgIds = new HashSet<>();
        List<Map<String, Object>> response = new ArrayList<>();
        for (OrganizationMember membership : memberships) {
            if (membership.getOrganization() == null || membership.getOrganization().getId() == null) {
                continue;
            }

            Object orgId = membership.getOrganization().getId();
            if (!seenOrgIds.add(orgId)) {
                continue;
            }

            response.add(
                toOrganizationResponse(
                    membership.getOrganization().getId(),
                    membership.getOrganization().getName(),
                    membership.getOrganization().getSlug(),
                    membership.getOrganization().getOrgType() != null ? membership.getOrganization().getOrgType().name() : null,
                    membership.getRole() != null ? membership.getRole().name() : null
                )
            );
        }

        return response;
    }

    private boolean isGlobalAdmin(User currentUser) {
        return currentUser.getRole() == User.RoleName.SUPER_ADMIN || currentUser.getRole() == User.RoleName.ADMIN;
    }

    private Map<String, Object> toOrganizationResponse(Object id, String name, String slug, String type, String role) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("organizationId", id);
        row.put("organizationName", name);
        row.put("organizationSlug", slug);
        row.put("organizationType", type);
        row.put("membershipRole", role);
        return row;
    }
}
