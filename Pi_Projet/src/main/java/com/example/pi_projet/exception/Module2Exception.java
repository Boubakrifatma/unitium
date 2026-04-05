package com.example.pi_projet.exception;

import java.util.Map;

public class Module2Exception extends RuntimeException {

    private final ErrorCode code;
    private final Map<String, Object> metadata;

    public Module2Exception(ErrorCode code, String message) {
        this(code, message, null);
    }

    public Module2Exception(ErrorCode code, String message, Map<String, Object> metadata) {
        super(message);
        this.code = code;
        this.metadata = metadata;
    }

    public ErrorCode getCode() { return code; }
    public Map<String, Object> getMetadata() { return metadata; }

    public enum ErrorCode {
        NOT_FOUND,
        CONFLICT,
        FORBIDDEN,
        SERVICE_UNAVAILABLE,
        PAYMENT_REQUIRED,
        BAD_REQUEST,
        VALIDATION,
        INTERNAL
    }
}
