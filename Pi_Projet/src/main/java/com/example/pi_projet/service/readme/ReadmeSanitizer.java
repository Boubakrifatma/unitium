package com.example.pi_projet.service.readme;

import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

@Component
public class ReadmeSanitizer {

    private static final Pattern MARKDOWN_ESCAPABLE = Pattern.compile("([\\\\`*_{}\\[\\]()#+\\-.!|>])");
    private static final Pattern MERMAID_UNSAFE = Pattern.compile("[\"'`|:;<>\\[\\]{}]");
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");
    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9._-]+");
    private static final Pattern EDGE_DASH = Pattern.compile("^-+|-+$");

    public String escapeMarkdown(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return MARKDOWN_ESCAPABLE.matcher(value).replaceAll("\\\\$1");
    }

    public String sanitizeMermaidLabel(String value) {
        if (value == null || value.isBlank()) {
            return "Unnamed";
        }
        String sanitized = MERMAID_UNSAFE.matcher(value).replaceAll("-");
        sanitized = MULTI_SPACE.matcher(sanitized).replaceAll(" ").trim();
        return sanitized.isEmpty() ? "Unnamed" : sanitized;
    }

    public String slugifyFileName(String value) {
        String base = value == null ? "project" : value.trim().toLowerCase(Locale.ROOT);
        base = base.replace(' ', '-');
        base = NON_SLUG.matcher(base).replaceAll("-");
        base = EDGE_DASH.matcher(base).replaceAll("");
        if (base.isBlank()) {
            base = "project";
        }
        return base;
    }

    public String urlEncodePart(String value) {
        String safe = value == null ? "" : value;
        return URLEncoder.encode(safe, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
