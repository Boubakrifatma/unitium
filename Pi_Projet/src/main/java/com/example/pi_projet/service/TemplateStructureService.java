package com.example.pi_projet.service;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.exception.Module2Exception;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.VALIDATION;

@Service
@RequiredArgsConstructor
public class TemplateStructureService {

    private static final Set<String> MILESTONE_STATUS_VALUES = Arrays.stream(Milestone.MilestoneStatus.values())
        .map(Enum::name)
        .collect(Collectors.toUnmodifiableSet());

    private static final Set<String> TASK_TYPE_VALUES = Arrays.stream(Task.TaskType.values())
        .map(Enum::name)
        .collect(Collectors.toUnmodifiableSet());

    private static final Set<String> TASK_STATUS_VALUES = Arrays.stream(Task.TaskStatus.values())
        .map(Enum::name)
        .collect(Collectors.toUnmodifiableSet());

    private static final Set<String> TASK_PRIORITY_VALUES = Arrays.stream(Task.TaskPriority.values())
        .map(Enum::name)
        .collect(Collectors.toUnmodifiableSet());

    private final ObjectMapper objectMapper;

    public record PhaseSpec(String key, String name, int durationDays, int order, boolean enabled) {}

    public record MilestoneSpec(
        String key,
        String name,
        String description,
        String phaseKey,
        int offsetDays,
        String status,
        float completionPct,
        boolean isGate,
        Integer milestoneIndex,
        boolean enabled
    ) {}

    public record TaskSpec(
        String key,
        String title,
        String description,
        String phaseKey,
        String milestoneKey,
        String taskType,
        String status,
        String priority,
        Float estimatedHours,
        Integer startOffsetDays,
        Integer dueOffsetDays,
        String parentTaskKey,
        boolean enabled
    ) {}

    public record NormalizedTemplateStructure(
        String phasesJson,
        String milestonesJson,
        String tasksJson,
        List<PhaseSpec> phases,
        List<MilestoneSpec> milestones,
        List<TaskSpec> tasks
    ) {}

    public String toOptionalJson(Object rawValue, String fieldName) {
        if (rawValue == null) return null;

        if (rawValue instanceof String str) {
            String trimmed = str.trim();
            return trimmed.isEmpty() ? null : trimmed;
        }

        try {
            return objectMapper.writeValueAsString(rawValue);
        } catch (JsonProcessingException ex) {
            throw new Module2Exception(VALIDATION, fieldName + " must be valid JSON.");
        }
    }

    public NormalizedTemplateStructure normalizeTemplateStructure(String phasesJson,
                                                                  String milestonesJson,
                                                                  String tasksJson,
                                                                  String contextLabel) {
        boolean hasPhasesInput = hasText(phasesJson);
        boolean hasMilestonesInput = hasText(milestonesJson);
        boolean hasTasksInput = hasText(tasksJson);

        ArrayNode phasesArray = parseArray(phasesJson, contextLabel, "phases");
        List<PhaseSpec> phases = normalizePhases(phasesArray, contextLabel);

        Map<String, Integer> phaseOffsetsByKey = computePhaseOffsets(phases);
        Set<String> phaseKeys = phases.stream().map(PhaseSpec::key).collect(Collectors.toSet());

        ArrayNode milestonesArray = parseArray(milestonesJson, contextLabel, "milestones");
        List<MilestoneSpec> milestones = normalizeMilestones(milestonesArray, phaseKeys, phaseOffsetsByKey, contextLabel);

        Map<String, MilestoneSpec> milestonesByKey = milestones.stream()
            .collect(Collectors.toMap(MilestoneSpec::key, m -> m, (left, right) -> left, LinkedHashMap::new));

        ArrayNode tasksArray = parseArray(tasksJson, contextLabel, "tasks");
        List<TaskSpec> tasks = normalizeTasks(tasksArray, phaseKeys, milestonesByKey, contextLabel);

        String normalizedPhasesJson = hasPhasesInput ? writeJson(normalizePhasePayload(phases), contextLabel, "phases") : null;
        String normalizedMilestonesJson = hasMilestonesInput
            ? writeJson(normalizeMilestonePayload(milestones), contextLabel, "milestones")
            : null;
        String normalizedTasksJson = hasTasksInput ? writeJson(normalizeTaskPayload(tasks), contextLabel, "tasks") : null;

        return new NormalizedTemplateStructure(
            normalizedPhasesJson,
            normalizedMilestonesJson,
            normalizedTasksJson,
            List.copyOf(phases),
            List.copyOf(milestones),
            List.copyOf(tasks)
        );
    }

    private ArrayNode parseArray(String rawJson, String contextLabel, String fieldName) {
        if (!hasText(rawJson)) {
            return objectMapper.createArrayNode();
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            if (!root.isArray()) {
                throw validation(contextLabel, fieldName + " must be a JSON array.");
            }
            return (ArrayNode) root;
        } catch (JsonProcessingException ex) {
            throw validation(contextLabel, fieldName + " contains invalid JSON.");
        }
    }

    private List<PhaseSpec> normalizePhases(ArrayNode phasesArray, String contextLabel) {
        List<PhaseSpec> phases = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();

        for (int i = 0; i < phasesArray.size(); i++) {
            JsonNode item = requireObject(phasesArray.get(i), contextLabel, "phases", i);

            String key = optionalText(item, "key");
            if (key == null) key = "phase-" + (i + 1);
            if (!seenKeys.add(key)) {
                throw validation(contextLabel, "phases[" + i + "].key must be unique.");
            }

            String name = requiredText(item, contextLabel, "phases", i, "name", "title");
            Integer durationDaysRaw = optionalInt(item, contextLabel, "phases", i, "durationDays", "duration");
            int durationDays = durationDaysRaw == null ? 14 : durationDaysRaw;
            if (durationDays < 0 || durationDays > 3650) {
                throw validation(contextLabel, "phases[" + i + "].durationDays must be between 0 and 3650.");
            }

            Integer orderRaw = optionalInt(item, contextLabel, "phases", i, "order");
            int order = orderRaw == null ? (i + 1) : orderRaw;
            if (order < 1) {
                throw validation(contextLabel, "phases[" + i + "].order must be at least 1.");
            }

            boolean enabled = optionalBoolean(item, "enabled", true);

            phases.add(new PhaseSpec(key, name, durationDays, order, enabled));
        }

        return phases;
    }

    private List<MilestoneSpec> normalizeMilestones(ArrayNode milestonesArray,
                                                    Set<String> phaseKeys,
                                                    Map<String, Integer> phaseOffsetsByKey,
                                                    String contextLabel) {
        List<MilestoneSpec> milestones = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();

        for (int i = 0; i < milestonesArray.size(); i++) {
            JsonNode item = requireObject(milestonesArray.get(i), contextLabel, "milestones", i);

            String key = optionalText(item, "key");
            if (key == null) key = "milestone-" + (i + 1);
            if (!seenKeys.add(key)) {
                throw validation(contextLabel, "milestones[" + i + "].key must be unique.");
            }

            String name = requiredText(item, contextLabel, "milestones", i, "name", "title");
            String description = optionalText(item, "description");

            String phaseKey = optionalText(item, "phaseKey", "phase");
            if (phaseKey != null && !phaseKeys.contains(phaseKey)) {
                throw validation(contextLabel, "milestones[" + i + "].phaseKey references a missing phase.");
            }

            Integer offsetRaw = optionalInt(item, contextLabel, "milestones", i, "offsetDays", "dueAfterDays");
            int offsetDays = offsetRaw != null
                ? offsetRaw
                : (phaseKey != null ? phaseOffsetsByKey.getOrDefault(phaseKey, 0) : 0);
            if (offsetDays < 0 || offsetDays > 3650) {
                throw validation(contextLabel, "milestones[" + i + "].offsetDays must be between 0 and 3650.");
            }

            String status = optionalText(item, "status");
            status = status == null ? Milestone.MilestoneStatus.pending.name() : status.toLowerCase(Locale.ROOT);
            if (!MILESTONE_STATUS_VALUES.contains(status)) {
                throw validation(contextLabel,
                    "milestones[" + i + "].status is invalid. Allowed values: " + String.join(", ", MILESTONE_STATUS_VALUES));
            }

            Float completionRaw = optionalFloat(item, contextLabel, "milestones", i, "completionPct");
            float completionPct = completionRaw == null ? 0f : completionRaw;
            if (completionPct < 0f || completionPct > 100f) {
                throw validation(contextLabel, "milestones[" + i + "].completionPct must be between 0 and 100.");
            }

            boolean isGate = optionalBoolean(item, "isGate", false);

            Integer milestoneIndex = optionalInt(item, contextLabel, "milestones", i, "milestoneIndex", "index", "order");
            if (milestoneIndex != null && milestoneIndex < 0) {
                throw validation(contextLabel, "milestones[" + i + "].milestoneIndex must be >= 0.");
            }

            boolean enabled = optionalBoolean(item, "enabled", true);

            milestones.add(new MilestoneSpec(
                key,
                name,
                description,
                phaseKey,
                offsetDays,
                status,
                completionPct,
                isGate,
                milestoneIndex,
                enabled
            ));
        }

        return milestones;
    }

    private List<TaskSpec> normalizeTasks(ArrayNode tasksArray,
                                          Set<String> phaseKeys,
                                          Map<String, MilestoneSpec> milestonesByKey,
                                          String contextLabel) {
        List<TaskSpec> tasks = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();

        for (int i = 0; i < tasksArray.size(); i++) {
            JsonNode item = requireObject(tasksArray.get(i), contextLabel, "tasks", i);

            String key = optionalText(item, "key");
            if (key == null) key = "task-" + (i + 1);
            if (!seenKeys.add(key)) {
                throw validation(contextLabel, "tasks[" + i + "].key must be unique.");
            }

            String title = requiredText(item, contextLabel, "tasks", i, "title", "name");
            String description = optionalText(item, "description");

            String phaseKey = optionalText(item, "phaseKey", "phase");
            if (phaseKey != null && !phaseKeys.contains(phaseKey)) {
                throw validation(contextLabel, "tasks[" + i + "].phaseKey references a missing phase.");
            }

            String milestoneKey = optionalText(item, "milestoneKey", "milestone");
            if (milestoneKey != null && !milestonesByKey.containsKey(milestoneKey)) {
                throw validation(contextLabel, "tasks[" + i + "].milestoneKey references a missing milestone.");
            }
            if (milestoneKey != null && phaseKey == null) {
                phaseKey = milestonesByKey.get(milestoneKey).phaseKey();
            }

            String taskType = normalizeEnumOrDefault(optionalText(item, "taskType", "type"), Task.TaskType.task.name(), TASK_TYPE_VALUES,
                contextLabel, "tasks[" + i + "].taskType");
            String status = normalizeEnumOrDefault(optionalText(item, "status"), Task.TaskStatus.todo.name(), TASK_STATUS_VALUES,
                contextLabel, "tasks[" + i + "].status");
            String priority = normalizeEnumOrDefault(optionalText(item, "priority"), Task.TaskPriority.medium.name(), TASK_PRIORITY_VALUES,
                contextLabel, "tasks[" + i + "].priority");

            Float estimatedHours = optionalFloat(item, contextLabel, "tasks", i, "estimatedHours");
            if (estimatedHours != null && estimatedHours < 0f) {
                throw validation(contextLabel, "tasks[" + i + "].estimatedHours cannot be negative.");
            }

            Integer startOffsetDays = optionalInt(item, contextLabel, "tasks", i, "startOffsetDays");
            Integer dueOffsetDays = optionalInt(item, contextLabel, "tasks", i, "dueOffsetDays");
            if (startOffsetDays != null && startOffsetDays < 0) {
                throw validation(contextLabel, "tasks[" + i + "].startOffsetDays cannot be negative.");
            }
            if (dueOffsetDays != null && dueOffsetDays < 0) {
                throw validation(contextLabel, "tasks[" + i + "].dueOffsetDays cannot be negative.");
            }
            if (startOffsetDays != null && dueOffsetDays != null && dueOffsetDays < startOffsetDays) {
                throw validation(contextLabel, "tasks[" + i + "].dueOffsetDays must be >= startOffsetDays.");
            }

            String parentTaskKey = optionalText(item, "parentTaskKey");
            boolean enabled = optionalBoolean(item, "enabled", true);

            tasks.add(new TaskSpec(
                key,
                title,
                description,
                phaseKey,
                milestoneKey,
                taskType,
                status,
                priority,
                estimatedHours,
                startOffsetDays,
                dueOffsetDays,
                parentTaskKey,
                enabled
            ));
        }

        Set<String> knownTaskKeys = tasks.stream().map(TaskSpec::key).collect(Collectors.toSet());
        for (int i = 0; i < tasks.size(); i++) {
            TaskSpec task = tasks.get(i);
            if (task.parentTaskKey() != null && !knownTaskKeys.contains(task.parentTaskKey())) {
                throw validation(contextLabel, "tasks[" + i + "].parentTaskKey references a missing task.");
            }
        }

        return tasks;
    }

    private Map<String, Integer> computePhaseOffsets(List<PhaseSpec> phases) {
        List<PhaseSpec> orderedPhases = new ArrayList<>(phases);
        orderedPhases.sort(Comparator.comparingInt(PhaseSpec::order));

        Map<String, Integer> offsets = new LinkedHashMap<>();
        int cursor = 0;
        for (PhaseSpec phase : orderedPhases) {
            offsets.put(phase.key(), cursor);
            if (phase.enabled()) {
                cursor += Math.max(0, phase.durationDays());
            }
        }
        return offsets;
    }

    private List<Map<String, Object>> normalizePhasePayload(List<PhaseSpec> phases) {
        List<Map<String, Object>> payload = new ArrayList<>();
        for (PhaseSpec phase : phases) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("key", phase.key());
            row.put("name", phase.name());
            row.put("durationDays", phase.durationDays());
            row.put("order", phase.order());
            row.put("enabled", phase.enabled());
            payload.add(row);
        }
        return payload;
    }

    private List<Map<String, Object>> normalizeMilestonePayload(List<MilestoneSpec> milestones) {
        List<Map<String, Object>> payload = new ArrayList<>();
        for (MilestoneSpec milestone : milestones) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("key", milestone.key());
            row.put("name", milestone.name());
            if (milestone.description() != null) row.put("description", milestone.description());
            if (milestone.phaseKey() != null) row.put("phaseKey", milestone.phaseKey());
            row.put("offsetDays", milestone.offsetDays());
            row.put("dueAfterDays", milestone.offsetDays());
            row.put("status", milestone.status());
            row.put("completionPct", milestone.completionPct());
            row.put("isGate", milestone.isGate());
            if (milestone.milestoneIndex() != null) row.put("milestoneIndex", milestone.milestoneIndex());
            row.put("enabled", milestone.enabled());
            payload.add(row);
        }
        return payload;
    }

    private List<Map<String, Object>> normalizeTaskPayload(List<TaskSpec> tasks) {
        List<Map<String, Object>> payload = new ArrayList<>();
        for (TaskSpec task : tasks) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("key", task.key());
            row.put("title", task.title());
            if (task.description() != null) row.put("description", task.description());
            if (task.phaseKey() != null) row.put("phaseKey", task.phaseKey());
            if (task.milestoneKey() != null) row.put("milestoneKey", task.milestoneKey());
            row.put("taskType", task.taskType());
            row.put("status", task.status());
            row.put("priority", task.priority());
            if (task.estimatedHours() != null) row.put("estimatedHours", task.estimatedHours());
            if (task.startOffsetDays() != null) row.put("startOffsetDays", task.startOffsetDays());
            if (task.dueOffsetDays() != null) row.put("dueOffsetDays", task.dueOffsetDays());
            if (task.parentTaskKey() != null) row.put("parentTaskKey", task.parentTaskKey());
            row.put("enabled", task.enabled());
            payload.add(row);
        }
        return payload;
    }

    private String writeJson(Object payload, String contextLabel, String fieldName) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw validation(contextLabel, "Unable to serialize " + fieldName + ".");
        }
    }

    private JsonNode requireObject(JsonNode node, String contextLabel, String fieldName, int index) {
        if (node == null || !node.isObject()) {
            throw validation(contextLabel, fieldName + "[" + index + "] must be a JSON object.");
        }
        return node;
    }

    private String requiredText(JsonNode node,
                                String contextLabel,
                                String arrayName,
                                int index,
                                String... candidateFields) {
        String value = optionalText(node, candidateFields);
        if (value == null) {
            String fields = String.join(" or ", candidateFields);
            throw validation(contextLabel, arrayName + "[" + index + "] requires " + fields + ".");
        }
        return value;
    }

    private String optionalText(JsonNode node, String... candidateFields) {
        for (String field : candidateFields) {
            JsonNode valueNode = node.get(field);
            if (valueNode == null || valueNode.isNull()) continue;
            String value = valueNode.asText();
            if (value != null) {
                String trimmed = value.trim();
                if (!trimmed.isEmpty()) return trimmed;
            }
        }
        return null;
    }

    private Integer optionalInt(JsonNode node,
                                String contextLabel,
                                String arrayName,
                                int index,
                                String... candidateFields) {
        String field = firstPresentField(node, candidateFields);
        if (field == null) return null;

        JsonNode valueNode = node.get(field);
        if (valueNode == null || valueNode.isNull()) return null;

        try {
            if (valueNode.isInt() || valueNode.isLong()) return valueNode.intValue();
            String raw = valueNode.asText();
            if (raw == null || raw.trim().isEmpty()) return null;
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException ex) {
            throw validation(contextLabel,
                arrayName + "[" + index + "]." + field + " must be a valid integer.");
        }
    }

    private Float optionalFloat(JsonNode node,
                                String contextLabel,
                                String arrayName,
                                int index,
                                String... candidateFields) {
        String field = firstPresentField(node, candidateFields);
        if (field == null) return null;

        JsonNode valueNode = node.get(field);
        if (valueNode == null || valueNode.isNull()) return null;

        try {
            if (valueNode.isNumber()) return valueNode.floatValue();
            String raw = valueNode.asText();
            if (raw == null || raw.trim().isEmpty()) return null;
            return Float.parseFloat(raw.trim());
        } catch (NumberFormatException ex) {
            throw validation(contextLabel,
                arrayName + "[" + index + "]." + field + " must be a valid number.");
        }
    }

    private boolean optionalBoolean(JsonNode node, String field, boolean defaultValue) {
        JsonNode valueNode = node.get(field);
        if (valueNode == null || valueNode.isNull()) return defaultValue;
        if (valueNode.isBoolean()) return valueNode.booleanValue();
        String raw = valueNode.asText();
        if (raw == null || raw.trim().isEmpty()) return defaultValue;
        return Boolean.parseBoolean(raw.trim());
    }

    private String normalizeEnumOrDefault(String rawValue,
                                          String defaultValue,
                                          Set<String> allowedValues,
                                          String contextLabel,
                                          String fieldPath) {
        String normalized = rawValue == null ? defaultValue : rawValue.toLowerCase(Locale.ROOT);
        if (!allowedValues.contains(normalized)) {
            throw validation(contextLabel,
                fieldPath + " is invalid. Allowed values: " + String.join(", ", allowedValues));
        }
        return normalized;
    }

    private String firstPresentField(JsonNode node, String... candidateFields) {
        for (String field : candidateFields) {
            if (node.has(field)) return field;
        }
        return null;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private Module2Exception validation(String contextLabel, String detail) {
        String prefix = hasText(contextLabel) ? contextLabel.trim() + ": " : "";
        return new Module2Exception(VALIDATION, prefix + detail);
    }
}
