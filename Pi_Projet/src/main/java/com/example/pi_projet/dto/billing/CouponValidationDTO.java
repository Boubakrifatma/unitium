package com.example.pi_projet.dto.billing;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CouponValidationDTO {
    private boolean valid;
    private String code;
    private String discountType;   // PERCENTAGE or FIXED
    private Double discountValue;
    private String message;
    // Computed from originalAmountCents passed during validation
    private Integer discountCents;
    private Integer finalAmountCents;
}
