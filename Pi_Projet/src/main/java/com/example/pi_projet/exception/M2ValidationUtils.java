package com.example.pi_projet.exception;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.VALIDATION;

/**
 * Shared, stateless validation helpers for all Module-2 controllers and services.
 * Every method throws {@link Module2Exception} with code VALIDATION on failure,
 * producing a consistent 400 response via {@code Module2ExceptionHandler}.
 */
public final class M2ValidationUtils {

    private M2ValidationUtils() {}

    /* ── String helpers ───────────────────────────────────────── */

    /**
     * Assert that {@code value} is non-null and non-blank.
     */
    public static String requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new Module2Exception(VALIDATION, fieldName + " is required.");
        }
        return value.trim();
    }

    /**
     * Assert name constraints: non-blank + length between min and max (inclusive).
     */
    public static String requireLength(String value, int min, int max, String fieldName) {
        String trimmed = requireNonBlank(value, fieldName);
        if (trimmed.length() < min) {
            throw new Module2Exception(VALIDATION,
                fieldName + " must be at least " + min + " character" + (min == 1 ? "" : "s") + ".");
        }
        if (trimmed.length() > max) {
            throw new Module2Exception(VALIDATION,
                fieldName + " cannot exceed " + max + " characters.");
        }
        return trimmed;
    }

    /**
     * Convenience wrapper for entity names: requires 3–100 characters.
     */
    public static String requireName(String value, String entityLabel) {
        return requireLength(value, 3, 100, entityLabel + " name");
    }

    /**
     * Convenience wrapper for project names: requires 3–150 characters.
     */
    public static String requireProjectName(String value) {
        return requireLength(value, 3, 150, "Project name");
    }

    /**
     * Convenience wrapper for template names: requires 3–100 characters.
     */
    public static String requireTemplateName(String value) {
        return requireLength(value, 3, 100, "Template name");
    }

    /**
     * Validate workspace slug: lowercase alphanumeric + hyphens, max 80 chars.
     * Returns null if value is null/blank (slug is optional).
     */
    public static String validateSlug(String value) {
        if (value == null || value.isBlank()) return null;
        String slug = value.trim().toLowerCase();
        if (!slug.matches("^[a-z0-9]+(?:-[a-z0-9]+)*$")) {
            throw new Module2Exception(VALIDATION,
                "Slug must contain only lowercase letters, numbers, and single hyphens.");
        }
        if (slug.length() > 80) {
            throw new Module2Exception(VALIDATION, "Slug cannot exceed 80 characters.");
        }
        return slug;
    }

    /* ── Numeric helpers ──────────────────────────────────────── */

    /**
     * Parse a required Long from an Object (handles Number, String, or null).
     */
    public static Long requireLong(Object value, String fieldName) {
        if (value == null) {
            throw new Module2Exception(VALIDATION, fieldName + " is required.");
        }
        if (value instanceof Number n) return n.longValue();
        String raw = value.toString().trim();
        if (raw.isBlank()) {
            throw new Module2Exception(VALIDATION, fieldName + " is required.");
        }
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            throw new Module2Exception(VALIDATION, fieldName + " must be a valid number.");
        }
    }

    /**
     * Parse an optional Long. Returns null if value is null or blank.
     */
    public static Long optionalLong(Object value, String fieldName) {
        if (value == null) return null;
        String raw = value.toString().trim();
        if (raw.isBlank()) return null;
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            throw new Module2Exception(VALIDATION, fieldName + " must be a valid number.");
        }
    }

    /**
     * Assert an integer falls within [min, max].
     */
    public static int requireIntRange(Object value, int min, int max, String fieldName) {
        if (value == null) {
            throw new Module2Exception(VALIDATION, fieldName + " is required.");
        }
        int parsed;
        try {
            parsed = value instanceof Number n ? n.intValue() : Integer.parseInt(value.toString().trim());
        } catch (NumberFormatException ex) {
            throw new Module2Exception(VALIDATION, fieldName + " must be a valid integer.");
        }
        if (parsed < min || parsed > max) {
            throw new Module2Exception(VALIDATION,
                fieldName + " must be between " + min + " and " + max + ".");
        }
        return parsed;
    }

    /* ── Enum helpers ─────────────────────────────────────────── */

    /**
     * Parse an enum value by name (case-insensitive). Returns null if value is null/blank.
     */
    public static <E extends Enum<E>> E parseEnum(String value, Class<E> type, String fieldName) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(type, value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(VALIDATION,
                "Invalid value '" + value + "' for " + fieldName + ".");
        }
    }

    /**
     * Parse a required enum value.
     */
    public static <E extends Enum<E>> E requireEnum(String value, Class<E> type, String fieldName) {
        E result = parseEnum(value, type, fieldName);
        if (result == null) {
            throw new Module2Exception(VALIDATION, fieldName + " is required.");
        }
        return result;
    }

    /* ── JSON helpers ─────────────────────────────────────────── */

    /**
     * Assert that a JSON string (if non-blank) is parseable.
     * Returns null when value is null/blank.
     */
    public static String validateJsonIfPresent(String value, String fieldName) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
            throw new Module2Exception(VALIDATION,
                fieldName + " must be a valid JSON object or array.");
        }
        // Basic balanced-bracket check (full parsing avoided to keep zero dependencies)
        int depth = 0;
        boolean inString = false;
        for (char c : trimmed.toCharArray()) {
            if (c == '"') inString = !inString;
            if (!inString) {
                if (c == '{' || c == '[') depth++;
                if (c == '}' || c == ']') depth--;
            }
        }
        if (depth != 0) {
            throw new Module2Exception(VALIDATION, fieldName + " contains unbalanced JSON brackets.");
        }
        return trimmed;
    }

    /* ── Misc helpers ─────────────────────────────────────────── */

    /**
     * Assert optional string does not exceed max length.
     */
    public static String limitLength(String value, int max, String fieldName) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (trimmed.length() > max) {
            throw new Module2Exception(VALIDATION,
                fieldName + " cannot exceed " + max + " characters.");
        }
        return trimmed;
    }
}
