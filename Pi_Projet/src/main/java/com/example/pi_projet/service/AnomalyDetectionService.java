package com.example.pi_projet.service;

import com.example.pi_projet.entity.Session;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.SessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyDetectionService {

    private final SessionRepository sessionRepository;
    private final RestTemplate restTemplate;

    private static final String ML_URL = "http://localhost:5050/score";
    private static final float MFA_THRESHOLD    = 0.75f;
    private static final float LOCK_THRESHOLD   = 0.90f;

    public record AnomalyResult(float score, Session.ActionTaken action, String modelVersion) {}

    /**
     * Evaluate a login attempt and return anomaly result.
     * Falls back to score=0.0 if ML service is unavailable.
     */
    public AnomalyResult evaluate(User user, HttpServletRequest request) {
        try {
            List<Session> recent = sessionRepository.findTop10ByUserIdOrderByCreatedAtDesc(user.getId());

            int loginHour         = LocalDateTime.now().getHour();
            int dayOfWeek         = LocalDateTime.now().getDayOfWeek().getValue(); // 1=Mon..7=Sun
            String currentIp      = request.getRemoteAddr();
            String currentUa      = request.getHeader("User-Agent");
            boolean ipChanged     = recent.stream().anyMatch(s -> s.getIpAddress() != null && !s.getIpAddress().equals(currentIp));
            boolean uaChanged     = recent.stream().anyMatch(s -> s.getUserAgent() != null && !s.getUserAgent().equals(currentUa));

            long failedLast5min   = sessionRepository.countFailedAttemptsSince(
                    user.getId(), LocalDateTime.now().minusMinutes(5));

            double timeSinceLastH = recent.isEmpty() ? 0.0
                    : ChronoUnit.HOURS.between(recent.get(0).getCreatedAt(), LocalDateTime.now());

            boolean isNewIp       = recent.stream().noneMatch(s -> currentIp.equals(s.getIpAddress()));

            int usualHour         = user.getUsualLoginHour() != null ? user.getUsualLoginHour() : loginHour;
            int hourDeviation     = Math.abs(loginHour - usualHour);

            Map<String, Object> features = Map.of(
                "login_hour",             loginHour,
                "day_of_week",            dayOfWeek,
                "ip_changed",             ipChanged ? 1 : 0,
                "ua_changed",             uaChanged ? 1 : 0,
                "failed_attempts_5min",   failedLast5min,
                "time_since_last_login_h", timeSinceLastH,
                "is_new_ip",              isNewIp ? 1 : 0,
                "hour_deviation",         hourDeviation
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(ML_URL, features, Map.class);

            float score   = response != null ? ((Number) response.get("score")).floatValue() : 0.0f;
            String version = response != null ? (String) response.getOrDefault("version", "unknown") : "unknown";

            Session.ActionTaken action = Session.ActionTaken.NONE;
            if (score >= LOCK_THRESHOLD)        action = Session.ActionTaken.ACCOUNT_LOCKED;
            else if (score >= MFA_THRESHOLD)    action = Session.ActionTaken.MFA_FORCED;

            return new AnomalyResult(score, action, version);

        } catch (Exception e) {
            log.warn("ML service unavailable, defaulting to score=0.0: {}", e.getMessage());
            return new AnomalyResult(0.0f, Session.ActionTaken.NONE, "unavailable");
        }
    }

    /** Enrich an existing session with anomaly data. */
    public void enrichSession(Session session, AnomalyResult result) {
        session.setAnomalyScore(result.score());
        session.setActionTaken(result.action());
        session.setModelVersion(result.modelVersion());
    }

    /** Get recent sessions with high anomaly scores. */
    public List<Session> getRecentAnomalies(float threshold) {
        return sessionRepository.findRecentAnomalies(threshold);
    }
}
