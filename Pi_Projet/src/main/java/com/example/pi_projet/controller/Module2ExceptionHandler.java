package com.example.pi_projet.controller;

import com.example.pi_projet.exception.Module2Exception;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
@Slf4j
public class Module2ExceptionHandler {

    /* ── Domain exception ─────────────────────────────────────── */

    @ExceptionHandler(Module2Exception.class)
    public ResponseEntity<Object> handleModule2(Module2Exception ex) {
        log.warn("Module2Exception code={} message={}", ex.getCode(), ex.getMessage());
        HttpStatus status = switch (ex.getCode()) {
            case NOT_FOUND       -> HttpStatus.NOT_FOUND;
            case CONFLICT        -> HttpStatus.CONFLICT;
            case FORBIDDEN       -> HttpStatus.FORBIDDEN;
            case SERVICE_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case PAYMENT_REQUIRED -> HttpStatus.valueOf(402);
            case BAD_REQUEST, VALIDATION -> HttpStatus.BAD_REQUEST;
            default              -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
        return errorResponse(status, ex.getCode().name(), ex.getMessage(), ex.getMetadata());
    }

    /* ── Runtime exceptions caused by bad request data ──────── */

    /** Triggered by Long.parseLong / Integer.parseInt on bad input */
    @ExceptionHandler(NumberFormatException.class)
    public ResponseEntity<Object> handleNumberFormat(NumberFormatException ex) {
        log.debug("NumberFormatException: {}", ex.getMessage());
        return errorResponse(HttpStatus.BAD_REQUEST, "VALIDATION",
            "Invalid numeric value: " + sanitize(ex.getMessage()), null);
    }

    /** Triggered by Enum.valueOf on unknown enum constant */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Object> handleIllegalArgument(IllegalArgumentException ex) {
        log.debug("IllegalArgumentException: {}", ex.getMessage());
        return errorResponse(HttpStatus.BAD_REQUEST, "VALIDATION",
            "Invalid value: " + sanitize(ex.getMessage()), null);
    }

    /** Triggered by raw map casts or null dereferences on missing request fields */
    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<Object> handleNullPointer(NullPointerException ex) {
        log.warn("NullPointerException in request processing", ex);
        return errorResponse(HttpStatus.BAD_REQUEST, "VALIDATION",
            "A required field is missing or null.", null);
    }

    /** Triggered by (int) body.get("field") when the value is not an Integer */
    @ExceptionHandler(ClassCastException.class)
    public ResponseEntity<Object> handleClassCast(ClassCastException ex) {
        log.debug("ClassCastException: {}", ex.getMessage());
        return errorResponse(HttpStatus.BAD_REQUEST, "VALIDATION",
            "Invalid field type — check the request body.", null);
    }

    /* ── Helpers ──────────────────────────────────────────────── */

    private ResponseEntity<Object> errorResponse(HttpStatus status, String code,
                                                  String message, Map<String, Object> meta) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("message", message);
        if (meta != null) body.put("meta", meta);
        return new ResponseEntity<>(body, status);
    }

    /** Prevent leaking internal Java class names in error messages */
    private String sanitize(String raw) {
        if (raw == null) return "unknown";
        // Strip "For input string: ..." prefix from NumberFormatException
        int idx = raw.indexOf('"');
        if (idx >= 0) return raw.substring(idx).replace("\"", "'");
        return raw;
    }
}
