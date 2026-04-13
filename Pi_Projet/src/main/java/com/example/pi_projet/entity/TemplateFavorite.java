package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "template_favorites",
    uniqueConstraints = @UniqueConstraint(name = "uk_template_user_fav",
        columnNames = {"template_id", "user_id"}),
    indexes = {
        @Index(name = "idx_tf_template", columnList = "template_id"),
        @Index(name = "idx_tf_user",     columnList = "user_id")
    }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TemplateFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
