package com.example.pi_projet.dto.billing;

import com.example.pi_projet.entity.Coupon;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CouponDTO {
    private String id;
    private String code;
    private String description;
    private String discountType;   // PERCENTAGE or FIXED
    private Double discountValue;
    private Integer maxUses;
    private Integer usedCount;
    private LocalDateTime expiresAt;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static CouponDTO from(Coupon c) {
        return CouponDTO.builder()
            .id(c.getId())
            .code(c.getCode())
            .description(c.getDescription())
            .discountType(c.getDiscountType().name())
            .discountValue(c.getDiscountValue())
            .maxUses(c.getMaxUses())
            .usedCount(c.getUsedCount())
            .expiresAt(c.getExpiresAt())
            .isActive(c.getIsActive())
            .createdAt(c.getCreatedAt())
            .build();
    }
}
