package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLRestriction;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "organizations")
@SQLDelete(sql = "UPDATE organizations SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    // denormalized owner id — TODO: replace with FK to User entity when User module available
    @Column(name = "owner_id", nullable = false)
    private Long ownerId; // switched to Long to match `User.id`

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(name = "org_type", nullable = false, length = 20)
    @Builder.Default
    private OrgType orgType = OrgType.ENTERPRISE;

    @Column(name = "stripe_customer_id", length = 255)
    private String stripeCustomerId;

    @Column(name = "billing_email", length = 255)
    private String billingEmail;

    @Column(name = "vat_number", length = 50)
    private String vatNumber;

    @Column(name = "billing_country", length = 2)
    private String billingCountry;

    @Column(name = "billing_address_json", columnDefinition = "json")
    private String billingAddressJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    // ── Relations ── (module 2 links and others)
    @JsonIgnore
    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Workspace> workspaces; // Module 2: Workspace -> organization

    @JsonIgnore
    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrganizationMember> members; // Module 2: OrganizationMember -> organization

    // Non-module-2 relations kept for completeness (JSON-ignored)
    @JsonIgnore
    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Subscription> subscriptions;

    @JsonIgnore
    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Invoice> invoices;

    @JsonIgnore
    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UsageQuota> usageMetrics;

    @JsonIgnore
    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PaymentAttempt> paymentAttempts;


     @JsonIgnore
    @OneToMany(mappedBy = "organization", fetch = FetchType.LAZY)
    private List<UpsellRecommendation> upsellRecommendations;

    @JsonIgnore
    @OneToMany(mappedBy = "organization", fetch = FetchType.LAZY)
    private List<ChurnPrediction> churnPredictions;
    
    @JsonIgnore
    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProjectTemplate> templates;

    public enum OrgType { ENTERPRISE, ACADEMIC }
}