package com.example.pi_projet.entity.TimeLineAndDeadLine;

import com.example.pi_projet.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "time_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TimeEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_billable")
    private Boolean isBillable;

    @Column(name = "logged_at")
    private LocalDateTime loggedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isBillable == null) isBillable = false;
    }
}