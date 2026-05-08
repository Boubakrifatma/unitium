package com.example.pi_projet.service;

import com.example.pi_projet.entity.MLTeamRecommendation;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.CONFLICT;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.FORBIDDEN;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.INTERNAL;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.NOT_FOUND;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.SERVICE_UNAVAILABLE;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.VALIDATION;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProjectIntelligenceService {

    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;
    private final ProjectTemplateService projectTemplateService;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final MLTeamRecommendationService mlTeamRecommendationService;
    private final WorkspaceService workspaceService;
    private final com.example.pi_projet.repository.UserRepository userRepo;
    private final M2AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ml.service.base-url:http://localhost:8000}")
    private String mlServiceBaseUrl;

    @Value("${ml.service.connect-timeout-ms:1200}")
    private int connectTimeoutMs;

    @Value("${ml.service.read-timeout-ms:3200}")
    private int readTimeoutMs;

    private RestTemplate restTemplate;

    @PostConstruct
    public void init() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(100, connectTimeoutMs));
        requestFactory.setReadTimeout(Math.max(500, readTimeoutMs));
        this.restTemplate = new RestTemplate(requestFactory);
    }

    public Map<String, Object> bootstrapProject(UUID workspaceId,
                                                String inputType,
                                                String description,
                                                String documentBase64,
                                                String documentFilename,
                                                Long currentUserId) {
        Workspace workspace = workspaceService.getById(workspaceId);
        User requester = requireUser(currentUserId);
        ensurePibPermission(workspace, requester);

        String normalizedInputType = normalizeInputType(inputType);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("workspace_id", workspaceId.toString());
        payload.put("input_type", normalizedInputType);
        payload.put("description", normalizedInputType.equals("text") ? optionalString(description) : null);
        payload.put("document_base64", normalizedInputType.equals("document") ? optionalString(documentBase64) : null);
        payload.put("document_filename", normalizedInputType.equals("document") ? optionalString(documentFilename) : null);

        String endpoint = mlServiceBaseUrl.replaceAll("/+$", "") + "/api/v1/ml/project-bootstrap";
        log.info("PIB bootstrap request workspaceId={} inputType={} endpoint={}", workspaceId, normalizedInputType, endpoint);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, payload, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = castToMap(response.getBody());
                log.info(
                    "PIB bootstrap success workspaceId={} latencyMs={} coldStartAny={} capabilities={} metadata={}",
                    workspaceId,
                    responseBody.get("latency_ms"),
                    responseBody.get("cold_start_any"),
                    responseBody.get("capabilities"),
                    responseBody.get("metadata")
                );
                return responseBody;
            }
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("mlEndpoint", endpoint);
            meta.put("mlStatus", response.getStatusCode().value());
            throw new Module2Exception(
                INTERNAL,
                "ML bootstrap returned an empty or non-success response.",
                meta
            );
        } catch (RestClientResponseException ex) {
            throw translateMlBootstrapResponse(ex, endpoint);
        } catch (RestClientException ex) {
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("mlEndpoint", endpoint);
            meta.put("reason", optionalString(ex.getMessage()));
            throw new Module2Exception(
                SERVICE_UNAVAILABLE,
                "ML service is unreachable and fallback is disabled. Start the ML service and ensure Stage 2/3/4 artifacts are ready.",
                meta
            );
        } catch (Exception ex) {
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("mlEndpoint", endpoint);
            meta.put("reason", optionalString(ex.getMessage()));
            throw new Module2Exception(
                INTERNAL,
                "Unexpected failure while calling ML bootstrap.",
                meta
            );
        }
    }

    public Map<String, Object> getMlServiceStatus(UUID workspaceId, Long currentUserId) {
        Workspace workspace = workspaceService.getById(workspaceId);
        User requester = requireUser(currentUserId);
        ensurePibPermission(workspace, requester);

        String endpoint = mlServiceBaseUrl.replaceAll("/+$", "") + "/api/v1/ml/capabilities";
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(endpoint, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = castToMap(response.getBody());

                Map<String, Object> capabilities = parseMap(body.get("capabilities"));
                if (capabilities.isEmpty()) {
                    boolean hasFlatCapabilities = body.containsKey("stage2_ready")
                        || body.containsKey("stage3_ready")
                        || body.containsKey("stage4_ready");
                    if (hasFlatCapabilities) {
                        capabilities = body;
                    }
                }

                if (capabilities.isEmpty()) {
                    log.warn("PIB capabilities payload invalid workspaceId={} endpoint={} keys={}", workspaceId, endpoint, body.keySet());
                    Map<String, Object> status = new LinkedHashMap<>();
                    status.put("online", false);
                    status.put("stage2_ready", false);
                    status.put("stage3_ready", false);
                    status.put("stage4_ready", false);
                    status.put("reason", "ml-capabilities-invalid-payload");
                    return status;
                }

                Map<String, Object> status = new LinkedHashMap<>();
                status.put("online", true);
                status.put("stage2_ready", parseBoolean(capabilities.get("stage2_ready"), false));
                status.put("stage3_ready", parseBoolean(capabilities.get("stage3_ready"), false));
                status.put("stage4_ready", parseBoolean(capabilities.get("stage4_ready"), false));

                String modelVersion = optionalString(body.get("model_version"));
                if (modelVersion == null) {
                    modelVersion = optionalString(body.get("resolved_model_version"));
                }
                if (modelVersion != null) {
                    status.put("model_version", modelVersion);
                }

                return status;
            }
        } catch (Exception ex) {
            log.warn("PIB capabilities ping failed workspaceId={} reason={}", workspaceId, ex.getMessage());
            Map<String, Object> status = new LinkedHashMap<>();
            status.put("online", false);
            status.put("stage2_ready", false);
            status.put("stage3_ready", false);
            status.put("stage4_ready", false);
            status.put("reason", optionalString(ex.getMessage()) == null ? "ml-service-unavailable" : optionalString(ex.getMessage()));
            return status;
        }

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("online", false);
        status.put("stage2_ready", false);
        status.put("stage3_ready", false);
        status.put("stage4_ready", false);
        status.put("reason", "ml-service-unavailable");
        return status;
    }

    @Transactional
    public Project confirmProject(UUID workspaceId, Map<String, Object> confirmRequest, Long currentUserId) {
        Workspace workspace = workspaceService.getById(workspaceId);
        User requester = requireUser(currentUserId);
        ensurePibPermission(workspace, requester);

        String projectName = requireProjectName(confirmRequest.get("projectName"));
        String projectDescription = optionalString(confirmRequest.get("projectDescription"));
        Project.Visibility visibility = parseVisibility(optionalString(confirmRequest.get("visibility")));

        LocalDate startDate = parseOptionalDate(confirmRequest.get("startDate"), "startDate");
        LocalDate endDate = parseOptionalDate(confirmRequest.get("endDate"), "endDate");
        validateDateRange(startDate, endDate);

        String selectedTemplateIdRaw = optionalString(confirmRequest.get("selectedTemplateId"));
        String selectedTemplateNameRaw = optionalString(confirmRequest.get("selectedTemplateName"));
        Project created;
        if (selectedTemplateIdRaw != null && !selectedTemplateIdRaw.isBlank()) {
            UUID selectedTemplateId;
            try {
                selectedTemplateId = UUID.fromString(selectedTemplateIdRaw);
            } catch (IllegalArgumentException ex) {
                throw new Module2Exception(VALIDATION, "selectedTemplateId must be a valid UUID.");
            }

            Optional<ProjectTemplate> selectedTemplate = projectTemplateService.getById(selectedTemplateId);
            if (selectedTemplate.isEmpty()) {
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("selectedTemplateId", selectedTemplateIdRaw);
                if (selectedTemplateNameRaw != null) {
                    meta.put("selectedTemplateName", selectedTemplateNameRaw);
                }

                Optional<ProjectTemplate> byName = projectTemplateService.findFirstByNameIgnoreCase(selectedTemplateNameRaw);
                if (byName.isPresent()) {
                    meta.put("matchingTemplateIdByName", byName.get().getId().toString());
                    meta.put("diagnosis", "stale-template-id");
                    throw new Module2Exception(
                        NOT_FOUND,
                        "AI selected template ID was not found in backend templates. The template name exists with a different ID, which usually means ML template metadata is stale after reseed/training export. Re-run AI bootstrap and select the refreshed template.",
                        meta
                    );
                }

                meta.put("diagnosis", "template-not-found-in-db");
                throw new Module2Exception(
                    NOT_FOUND,
                    "AI selected template was not found in backend templates. This usually means ML template metadata is out of sync with current project_templates data (deleted/reseeded templates). Re-run AI bootstrap before confirming.",
                    meta
                );
            }

            created = createWithUniqueNameFromTemplate(workspaceId, selectedTemplateId, projectName, startDate, endDate, currentUserId);
            created = projectService.update(created.getId(), null, projectDescription, visibility, null, null, currentUserId);
        } else {
            created = createWithUniqueName(workspaceId, projectName, projectDescription, visibility, startDate, endDate, currentUserId);
        }

        String orgType = resolveWorkspaceOrgType(workspace);
        Map<String, Object> stage1Signals = parseMap(confirmRequest.get("stage1"));
        boolean coldStartMode = parseBoolean(
            confirmRequest.get("coldStartAny"),
            parseBoolean(stage1Signals.get("cold_start_mode"), false)
        );
        String modelVersion = optionalString(confirmRequest.get("modelVersion"));
        if (modelVersion == null) {
            modelVersion = "pib-bridge-v1";
        }

        persistProjectMlSignals(created, stage1Signals, orgType);

        List<Map<String, Object>> members = parseMapList(confirmRequest.get("members"));
        for (Map<String, Object> memberRow : members) {
            Long suggestedUserId = parseRequiredLong(memberRow.get("userId"), "members.userId");
            String roleRaw = optionalString(memberRow.get("role"));
            String role = roleRaw != null ? roleRaw.trim().toUpperCase() : defaultProjectRoleForOrgType(orgType);
            boolean accepted = parseBoolean(memberRow.get("accepted"), false);
            double fitScore = parseDouble(memberRow.get("fitScore"), 0.0);
            List<String> reasons = parseStringList(memberRow.get("reasons"));

            ProjectMember assignedMember = null;
            if (accepted) {
                if (workspaceService.isMember(workspaceId, suggestedUserId)) {
                    assignedMember = assignOrReuseProjectMember(created.getId(), suggestedUserId, role, currentUserId);
                } else {
                    accepted = false;
                    reasons = new ArrayList<>(reasons);
                    reasons.add("user-not-in-workspace");
                }
            }

            MLTeamRecommendation rec = MLTeamRecommendation.builder()
                .project(created)
                .recommendedUserId(suggestedUserId)
                .targetRole(parseProjectRole(role, orgType))
                .compatibilityScore((float) Math.max(0.0, Math.min(1.0, fitScore)))
                .shapFeaturesJson("{\"source\":\"pib_confirm\"}")
                .status(accepted ? MLTeamRecommendation.RecommendationStatus.ACCEPTED : MLTeamRecommendation.RecommendationStatus.REJECTED)
                .reviewedBy(currentUserId)
                .reviewedAt(Instant.now())
                .mlScoreBreakdownJson(toJson(Map.of("fitScore", fitScore)))
                .mlReasonsJson(toJson(reasons))
                .mlColdStartMode(coldStartMode)
                .mlModelVersion(modelVersion)
                .mlDecisionNote(accepted ? "Accepted during PIB confirm." : "Rejected during PIB confirm.")
                .build();

            MLTeamRecommendation savedRec = mlTeamRecommendationService.create(rec);
            if (assignedMember != null) {
                assignedMember.setMlAssignedByAi(true);
                assignedMember.setMlAssignmentConfidence(Math.max(0.0, Math.min(1.0, fitScore)));
                assignedMember.setMlAssignmentReasonJson(toJson(Map.of(
                    "role", role,
                    "fitScore", fitScore,
                    "reasons", reasons
                )));
                assignedMember.setMlSourceRecommendationId(savedRec.getId());
                projectMemberRepository.save(assignedMember);
            }
        }

        writeAudit(currentUserId, workspace, created, "PIB_CONFIRM_PROJECT");
        return created;
    }

    private Project createWithUniqueName(UUID workspaceId, String baseName, String description,
                                         Project.Visibility visibility, LocalDate startDate, LocalDate endDate,
                                         Long currentUserId) {
        String name = baseName;
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                return projectService.create(workspaceId, name, description, visibility, startDate, endDate, currentUserId);
            } catch (Module2Exception ex) {
                if (ex.getCode() != CONFLICT) {
                    throw ex;
                }
                name = baseName + " (AI)" + (attempt == 0 ? "" : "-" + (attempt + 1));
            }
        }
        return projectService.create(workspaceId, baseName + " (AI-" + UUID.randomUUID().toString().substring(0, 8) + ")",
            description, visibility, startDate, endDate, currentUserId);
    }

    private Project createWithUniqueNameFromTemplate(UUID workspaceId, UUID templateId, String baseName,
                                                     LocalDate startDate, LocalDate endDate, Long currentUserId) {
        String name = baseName;
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                return projectService.createProjectFromTemplate(workspaceId, templateId, name, startDate, endDate, currentUserId);
            } catch (Module2Exception ex) {
                if (ex.getCode() != CONFLICT) {
                    throw ex;
                }
                name = baseName + " (AI)" + (attempt == 0 ? "" : "-" + (attempt + 1));
            }
        }
        return projectService.createProjectFromTemplate(workspaceId, templateId,
            baseName + " (AI-" + UUID.randomUUID().toString().substring(0, 8) + ")", startDate, endDate, currentUserId);
    }

    private ProjectMember assignOrReuseProjectMember(UUID projectId, Long userId, String role, Long requesterId) {
        Optional<ProjectMember> existingMember = projectMemberRepository.findByProjectIdAndUserId(projectId, userId);
        if (existingMember.isPresent()) {
            return existingMember.get();
        }

        try {
            return projectMemberService.add(projectId, userId, role, requesterId);
        } catch (Module2Exception ex) {
            if (ex.getCode() == CONFLICT) {
                return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                    .orElseThrow(() -> ex);
            }
            throw ex;
        }
    }

    private void persistProjectMlSignals(Project project, Map<String, Object> stage1Signals, String orgType) {
        project.setMlProjectType(optionalString(stage1Signals.get("project_type")));
        project.setMlComplexity(optionalString(stage1Signals.get("complexity")));

        String detectedMode = optionalString(stage1Signals.get("detected_mode"));
        project.setMlDetectedMode(detectedMode != null ? detectedMode.toLowerCase() : orgType);

        project.setMlDomainTagsJson(toJson(parseStringList(stage1Signals.get("domain_tags"))));
        project.setMlConstraintsJson(toJson(parseStringList(stage1Signals.get("constraints"))));

        List<Double> embedding = parseDoubleList(stage1Signals.get("embedding"));
        if (!embedding.isEmpty()) {
            project.setMlDescriptionEmbedding(toJson(embedding));
        }
        project.setMlLastInferenceAt(Instant.now());
        projectRepository.save(project);
    }

    private User requireUser(Long userId) {
        return userRepo.findById(userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
    }

    private void ensurePibPermission(Workspace workspace, User requester) {
        boolean globalAdmin = workspaceService.isGlobalAdmin(requester);

        WorkspaceMember membership = null;
        if (!globalAdmin) {
            membership = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspace.getId(), requester.getId())
                .orElseThrow(() -> new Module2Exception(FORBIDDEN, "Requester is not a workspace member"));
        }

        if (!globalAdmin && membership == null) {
            throw new Module2Exception(FORBIDDEN, "Requester is not a workspace member");
        }

        if (globalAdmin) {
            return;
        }

        String orgType = resolveWorkspaceOrgType(workspace);
        String workspaceRole = membership != null && membership.getRole() != null
            ? membership.getRole().name()
            : "MEMBER";

        boolean privilegedWorkspaceRole = workspaceRole.equals("OWNER")
            || workspaceRole.equals("ADMIN")
            || workspaceRole.equals("MANAGER")
            || workspaceRole.equals("TA");

        boolean allowed;
        if ("academic".equals(orgType)) {
            allowed = requester.getRole() == User.RoleName.TUTOR
                || requester.getRole() == User.RoleName.MANAGER
                || privilegedWorkspaceRole;
        } else {
            allowed = requester.getRole() == User.RoleName.MANAGER
                || requester.getRole() == User.RoleName.PRODUCT_OWNER
                || privilegedWorkspaceRole;
        }

        if (!allowed) {
            throw new Module2Exception(FORBIDDEN, "Only manager, tutor, product owner, or admin role can use Project Intelligence Bootstrapper");
        }
    }

    private String normalizeInputType(String inputType) {
        String normalized = (inputType == null ? "text" : inputType.trim().toLowerCase());
        if (!normalized.equals("text") && !normalized.equals("document")) {
            throw new Module2Exception(VALIDATION, "inputType must be text or document.");
        }
        return normalized;
    }

    private Module2Exception translateMlBootstrapResponse(RestClientResponseException ex, String endpoint) {
        int status = ex.getStatusCode().value();
        String detail = extractMlDetail(ex.getResponseBodyAsString(), ex.getStatusText());

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("mlEndpoint", endpoint);
        meta.put("mlStatus", status);
        if (detail != null && !detail.isBlank()) {
            meta.put("mlDetail", detail);
        }

        if (status == 400 || status == 422) {
            return new Module2Exception(VALIDATION, "ML bootstrap validation failed: " + detail, meta);
        }
        if (status == 404) {
            return new Module2Exception(NOT_FOUND, "ML bootstrap workspace context was not found: " + detail, meta);
        }
        if (status == 503) {
            return new Module2Exception(
                SERVICE_UNAVAILABLE,
                "ML bootstrap is unavailable in strict mode (fallback disabled): " + detail,
                meta
            );
        }

        return new Module2Exception(INTERNAL, "ML bootstrap failed with upstream status " + status + ": " + detail, meta);
    }

    private String extractMlDetail(String responseBody, String fallbackStatusText) {
        if (responseBody != null && !responseBody.isBlank()) {
            try {
                Map<String, Object> payload = objectMapper.readValue(responseBody, Map.class);
                String detail = optionalString(payload.get("detail"));
                if (detail != null) {
                    return detail;
                }
                String message = optionalString(payload.get("message"));
                if (message != null) {
                    return message;
                }
            } catch (Exception ignored) {
            }

            return responseBody.length() > 400
                ? responseBody.substring(0, 400)
                : responseBody;
        }

        String statusText = optionalString(fallbackStatusText);
        return statusText == null ? "upstream-error" : statusText;
    }

    private String requireProjectName(Object raw) {
        String name = optionalString(raw);
        if (name == null || name.isBlank()) {
            throw new Module2Exception(VALIDATION, "projectName is required.");
        }
        String trimmed = name.trim();
        if (trimmed.length() < 3) {
            throw new Module2Exception(VALIDATION, "projectName must be at least 3 characters.");
        }
        if (trimmed.length() > 150) {
            throw new Module2Exception(VALIDATION, "projectName cannot exceed 150 characters.");
        }
        return trimmed;
    }

    private String optionalString(Object raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.toString().trim();
        return value.isBlank() ? null : value;
    }

    private Long parseRequiredLong(Object raw, String field) {
        if (raw == null) {
            throw new Module2Exception(VALIDATION, field + " is required.");
        }
        try {
            return Long.parseLong(raw.toString().trim());
        } catch (NumberFormatException ex) {
            throw new Module2Exception(VALIDATION, field + " must be a valid number.");
        }
    }

    private boolean parseBoolean(Object raw, boolean defaultValue) {
        if (raw == null) {
            return defaultValue;
        }
        if (raw instanceof Boolean b) {
            return b;
        }
        String s = raw.toString().trim().toLowerCase();
        if (s.equals("true")) return true;
        if (s.equals("false")) return false;
        return defaultValue;
    }

    private double parseDouble(Object raw, double defaultValue) {
        if (raw == null) {
            return defaultValue;
        }
        try {
            return Double.parseDouble(raw.toString().trim());
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private List<String> parseStringList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (Object item : list) {
            if (item == null) continue;
            String s = item.toString().trim();
            if (!s.isBlank()) out.add(s);
        }
        return out;
    }

    private List<Map<String, Object>> parseMapList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Map<String, Object> cast = new LinkedHashMap<>();
                for (Map.Entry<?, ?> e : map.entrySet()) {
                    cast.put(String.valueOf(e.getKey()), e.getValue());
                }
                out.add(cast);
            }
        }
        return out;
    }

    private Map<String, Object> parseMap(Object raw) {
        if (!(raw instanceof Map<?, ?> map)) {
            return Map.of();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            out.put(String.valueOf(entry.getKey()), entry.getValue());
        }
        return out;
    }

    private List<Double> parseDoubleList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }

        List<Double> out = new ArrayList<>();
        for (Object item : list) {
            if (item == null) {
                continue;
            }
            try {
                out.add(Double.parseDouble(item.toString().trim()));
            } catch (NumberFormatException ignored) {
            }
        }
        return out;
    }

    private Project.Visibility parseVisibility(String raw) {
        if (raw == null) {
            return Project.Visibility.PRIVATE;
        }
        try {
            return Project.Visibility.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(VALIDATION, "visibility must be PUBLIC or PRIVATE.");
        }
    }

    private LocalDate parseOptionalDate(Object raw, String field) {
        if (raw == null) return null;
        String s = raw.toString().trim();
        if (s.isBlank()) return null;
        try {
            return LocalDate.parse(s);
        } catch (Exception ex) {
            throw new Module2Exception(VALIDATION, "Invalid date format for " + field + ". Use YYYY-MM-DD.");
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new Module2Exception(VALIDATION, "End date must be on or after start date.");
        }
    }

    private String defaultProjectRoleForOrgType(String orgType) {
        return "academic".equals(orgType) ? "PROFESSOR" : "PROJECT_MANAGER";
    }

    private ProjectMember.ProjectRole parseProjectRole(String rawRole, String orgType) {
        if (rawRole == null || rawRole.isBlank()) {
            return "academic".equals(orgType)
                ? ProjectMember.ProjectRole.PROFESSOR
                : ProjectMember.ProjectRole.PROJECT_MANAGER;
        }
        try {
            return ProjectMember.ProjectRole.valueOf(rawRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return ProjectMember.ProjectRole.DEVELOPER;
        }
    }

    private String resolveWorkspaceOrgType(Workspace workspace) {
        if (workspace.getOrgType() != null && !workspace.getOrgType().isBlank()) {
            return workspace.getOrgType().trim().toLowerCase();
        }
        if (workspace.getOrganization() != null && workspace.getOrganization().getOrgType() != null) {
            return workspace.getOrganization().getOrgType().name().toLowerCase();
        }
        return "enterprise";
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private void writeAudit(Long requesterId, Workspace workspace, Project project, String actionType) {
        try {
            auditLogService.writeAudit(
                requesterId,
                workspace.getOrganization() != null ? workspace.getOrganization().getId() : null,
                actionType,
                "project",
                project.getId().toString(),
                project.getName(),
                workspace.getId(),
                null
            );
        } catch (Exception ignored) {
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToMap(Map raw) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Object key : raw.keySet()) {
            out.put(String.valueOf(key), raw.get(key));
        }
        return out;
    }
}
