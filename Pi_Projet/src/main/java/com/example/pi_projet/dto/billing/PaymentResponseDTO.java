package com.example.pi_projet.dto.billing;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentResponseDTO {
    private String paymentId;
    private String orgId;
    private String status;        // PENDING | CONFIRMED | REJECTED
    private String planName;
    private double amount;
    private String currency;
    private String createdAt;
    private String estimatedValidationDate;
    private String tempPassword;
    private String adminEmail;
    // Extra fields for admin dashboard
    private String orgName;
    private String orgType;
    private String billingCycle;
    private String phone;
    private Integer numUsers;
    private String address;
}
