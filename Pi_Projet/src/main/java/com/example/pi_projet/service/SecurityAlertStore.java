package com.example.pi_projet.service;

import com.example.pi_projet.dto.billing.TamperingCheckDTO;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * In-memory store for security alerts.
 * Holds the latest tampered invoice alerts so the admin dashboard
 * can display them without querying the database on every request.
 */
@Component
public class SecurityAlertStore {

    private final List<TamperingCheckDTO> alerts = Collections.synchronizedList(new ArrayList<>());

    public void addAlerts(List<TamperingCheckDTO> newAlerts) {
        alerts.addAll(newAlerts);
    }

    public List<TamperingCheckDTO> getAlerts() {
        return Collections.unmodifiableList(alerts);
    }

    public int getAlertCount() {
        return alerts.size();
    }

    public void clearAlerts() {
        alerts.clear();
    }
}
