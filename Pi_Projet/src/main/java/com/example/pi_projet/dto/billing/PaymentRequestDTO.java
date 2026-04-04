package com.example.pi_projet.dto.billing;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PaymentRequestDTO {

    @NotBlank
    private String planId;

    @NotBlank
    private String orgType; // enterprise | academic

    @NotBlank
    private String billingCycle; // monthly | annual

    @NotBlank
    private String orgName;

    @NotBlank
    @Email
    private String adminEmail;

    @NotBlank
    private String adminName;

    @NotBlank
    private String phone;

    @NotNull
    private Integer numUsers;

    private String address;
    private String vatNumber;
    private String institution;
    private String department;
    private Integer studentCount;

    // Card info (not persisted, just collected for validation flow)
    @NotBlank
    private String cardHolder;

    @NotBlank
    private String cardNumber;

    @NotBlank
    private String expiryDate;

    @NotBlank
    private String cvv;
}
