package com.example.pi_projet.annotation;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an endpoint as requiring a valid session token.
 *
 * Usage:
 *   Add @Authorized on any controller method or class that needs authentication.
 *   The client must send: Authorization: Bearer <token>
 *
 * The token is obtained from POST /api/auth/login
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@SecurityRequirement(name = "Bearer Authentication")
public @interface Authorized {
}
