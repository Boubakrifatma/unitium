package com.example.pi_projet.service.readme;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ShieldsBadgeBuilder {

    private final ReadmeSanitizer sanitizer;

    public String statusBadge(String status) {
        String normalized = status == null ? "UNKNOWN" : status.trim().toUpperCase();
        String color = switch (normalized) {
            case "ACTIVE" -> "22c55e";
            case "ON_HOLD" -> "f59e0b";
            case "COMPLETED", "ARCHIVED" -> "0ea5e9";
            case "CANCELLED" -> "ef4444";
            default -> "64748b";
        };
        return buildBadge("status", normalized, color, null);
    }

    public String visibilityBadge(String visibility) {
        String normalized = visibility == null ? "PRIVATE" : visibility.trim().toUpperCase();
        String color = "PUBLIC".equals(normalized) ? "16a34a" : "f97316";
        return buildBadge("visibility", normalized, color, null);
    }

    public String membersBadge(int members) {
        String color = members >= 5 ? "2563eb" : "64748b";
        return buildBadge("members", String.valueOf(Math.max(0, members)), color, "github");
    }

    public String completionBadge(double completionPct) {
        int rounded = (int) Math.max(0, Math.min(100, Math.round(completionPct)));
        String color = rounded >= 80 ? "16a34a" : rounded >= 50 ? "f59e0b" : "ef4444";
        return buildBadge("completion", rounded + "%", color, null);
    }

    private String buildBadge(String label, String message, String color, String logo) {
        String encodedLabel = sanitizer.urlEncodePart(label);
        String encodedMessage = sanitizer.urlEncodePart(message);
        StringBuilder url = new StringBuilder("https://img.shields.io/badge/")
            .append(encodedLabel)
            .append("-")
            .append(encodedMessage)
            .append("-")
            .append(color);

        if (logo != null && !logo.isBlank()) {
            url.append("?logo=").append(sanitizer.urlEncodePart(logo));
        }

        return "![" + sanitizer.escapeMarkdown(label) + "](" + url + ")";
    }
}
