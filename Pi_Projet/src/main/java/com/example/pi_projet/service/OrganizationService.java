package com.example.pi_projet.service;

import com.example.pi_projet.dto.CreateOrganizationRequest;
import com.example.pi_projet.dto.OrganizationDTO;
import com.example.pi_projet.dto.UpdateOrganizationRequest;
import com.example.pi_projet.entity.AuditLog;
import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final AuditLogService auditLogService;

    public OrganizationDTO create(CreateOrganizationRequest body) {
        if (organizationRepository.existsBySlug(body.slug()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug already in use.");
        Organization org = Organization.builder()
                .name(body.name())
                .slug(body.slug())
                .orgType(parseOrgType(body.orgType()))
                .ownerId(body.ownerId())
                .billingEmail(body.billingEmail())
                .vatNumber(body.vatNumber())
                .billingCountry(body.billingCountry())
                .build();
        OrganizationDTO saved = OrganizationDTO.from(organizationRepository.save(org));
        auditLogService.log(body.ownerId(), AuditLog.ActionType.ORG_CREATED, "ORGANIZATION", saved.id().toString(), "Created organization: " + saved.name());
        return saved;
    }

    public List<OrganizationDTO> getAll() {
        return organizationRepository.findAll().stream().map(OrganizationDTO::from).toList();
    }

    public OrganizationDTO getById(UUID id) {
        return OrganizationDTO.from(findOrThrow(id));
    }

    public OrganizationDTO getByOwnerId(Long ownerId) {
        return organizationRepository.findByOwnerId(ownerId)
                .map(OrganizationDTO::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No organization found for this user."));
    }

    public OrganizationDTO update(UUID id, UpdateOrganizationRequest body) {
        Organization org = findOrThrow(id);
        if (body.name() != null)           org.setName(body.name());
        if (body.orgType() != null)        org.setOrgType(parseOrgType(body.orgType()));
        if (body.billingEmail() != null)   org.setBillingEmail(body.billingEmail());
        if (body.vatNumber() != null)      org.setVatNumber(body.vatNumber());
        if (body.billingCountry() != null) org.setBillingCountry(body.billingCountry());
        OrganizationDTO updated = OrganizationDTO.from(organizationRepository.save(org));
        auditLogService.log(org.getOwnerId(), AuditLog.ActionType.ORG_UPDATED, "ORGANIZATION", id.toString(), "Updated organization: " + updated.name());
        return updated;
    }

    public void delete(UUID id) {
        Organization org = findOrThrow(id);
        organizationRepository.deleteById(id);
        auditLogService.log(org.getOwnerId(), AuditLog.ActionType.ORG_DELETED, "ORGANIZATION", id.toString(), "Deleted organization: " + org.getName());
    }

    private Organization findOrThrow(UUID id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found."));
    }

    private Organization.OrgType parseOrgType(String value) {
        try {
            return Organization.OrgType.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid org_type. Use ENTERPRISE or ACADEMIC.");
        }
    }
}
