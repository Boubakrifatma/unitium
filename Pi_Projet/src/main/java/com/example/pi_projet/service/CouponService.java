package com.example.pi_projet.service;

import com.example.pi_projet.dto.billing.CouponDTO;
import com.example.pi_projet.dto.billing.CouponValidationDTO;
import com.example.pi_projet.entity.Coupon;
import com.example.pi_projet.repository.CouponRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CouponService {

    private final CouponRepository couponRepository;

    // ── Validate a coupon code against an amount (cents) ─────────────────────

    @Transactional(readOnly = true)
    public CouponValidationDTO validate(String code, int originalAmountCents) {
        Coupon coupon = couponRepository.findByCodeIgnoreCase(code).orElse(null);

        if (coupon == null) {
            return CouponValidationDTO.builder()
                .valid(false).code(code)
                .message("Coupon code not found.").build();
        }
        if (!coupon.getIsActive()) {
            return CouponValidationDTO.builder()
                .valid(false).code(code)
                .message("This coupon is no longer active.").build();
        }
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(LocalDateTime.now())) {
            return CouponValidationDTO.builder()
                .valid(false).code(code)
                .message("This coupon has expired.").build();
        }
        if (coupon.getMaxUses() != null && coupon.getUsedCount() >= coupon.getMaxUses()) {
            return CouponValidationDTO.builder()
                .valid(false).code(code)
                .message("This coupon has reached its usage limit.").build();
        }

        int discountCents = computeDiscount(coupon, originalAmountCents);
        int finalCents    = Math.max(0, originalAmountCents - discountCents);

        return CouponValidationDTO.builder()
            .valid(true)
            .code(coupon.getCode())
            .discountType(coupon.getDiscountType().name())
            .discountValue(coupon.getDiscountValue())
            .discountCents(discountCents)
            .finalAmountCents(finalCents)
            .message("Coupon applied successfully!")
            .build();
    }

    // ── Apply coupon (increment usedCount) — call after successful payment ───

    @Transactional
    public void applyCoupon(String code) {
        couponRepository.findByCodeIgnoreCase(code).ifPresent(c -> {
            c.setUsedCount(c.getUsedCount() + 1);
            couponRepository.save(c);
            log.info("Coupon '{}' applied — total uses: {}", c.getCode(), c.getUsedCount());
        });
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CouponDTO> getAllCoupons() {
        return couponRepository.findAll().stream()
            .map(CouponDTO::from).collect(Collectors.toList());
    }

    @Transactional
    public CouponDTO createCoupon(Map<String, Object> body) {
        String code = ((String) body.get("code")).trim().toUpperCase();
        if (couponRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException("Coupon code '" + code + "' already exists.");
        }

        String typeStr = (String) body.get("discountType");
        Coupon.DiscountType type = Coupon.DiscountType.valueOf(typeStr.toUpperCase());
        double value = ((Number) body.get("discountValue")).doubleValue();

        if (type == Coupon.DiscountType.PERCENTAGE && (value <= 0 || value > 100)) {
            throw new IllegalArgumentException("Percentage discount must be between 1 and 100.");
        }
        if (type == Coupon.DiscountType.FIXED && value <= 0) {
            throw new IllegalArgumentException("Fixed discount must be greater than 0.");
        }

        Integer maxUses = body.containsKey("maxUses") && body.get("maxUses") != null
            ? ((Number) body.get("maxUses")).intValue() : null;

        LocalDateTime expiresAt = null;
        if (body.containsKey("expiresAt") && body.get("expiresAt") != null) {
            expiresAt = LocalDateTime.parse((String) body.get("expiresAt"));
        }

        Coupon coupon = Coupon.builder()
            .code(code)
            .description((String) body.getOrDefault("description", ""))
            .discountType(type)
            .discountValue(value)
            .maxUses(maxUses)
            .expiresAt(expiresAt)
            .isActive(true)
            .build();

        coupon = couponRepository.save(coupon);
        log.info("Coupon created: {} ({} {})", coupon.getCode(), type, value);
        return CouponDTO.from(coupon);
    }

    @Transactional
    public CouponDTO updateCoupon(String id, Map<String, Object> body) {
        Coupon coupon = couponRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + id));

        if (body.containsKey("description")) {
            coupon.setDescription((String) body.get("description"));
        }
        if (body.containsKey("discountType") && body.containsKey("discountValue")) {
            String typeStr = (String) body.get("discountType");
            Coupon.DiscountType type = Coupon.DiscountType.valueOf(typeStr.toUpperCase());
            double value = ((Number) body.get("discountValue")).doubleValue();
            if (type == Coupon.DiscountType.PERCENTAGE && (value <= 0 || value > 100)) {
                throw new IllegalArgumentException("Percentage discount must be between 1 and 100.");
            }
            if (type == Coupon.DiscountType.FIXED && value <= 0) {
                throw new IllegalArgumentException("Fixed discount must be greater than 0.");
            }
            coupon.setDiscountType(type);
            coupon.setDiscountValue(value);
        }
        if (body.containsKey("maxUses")) {
            coupon.setMaxUses(body.get("maxUses") != null ? ((Number) body.get("maxUses")).intValue() : null);
        }
        if (body.containsKey("expiresAt")) {
            coupon.setExpiresAt(body.get("expiresAt") != null ? LocalDateTime.parse((String) body.get("expiresAt")) : null);
        }

        coupon = couponRepository.save(coupon);
        log.info("Coupon updated: {}", coupon.getCode());
        return CouponDTO.from(coupon);
    }

    @Transactional
    public CouponDTO toggleActive(String id) {
        Coupon coupon = couponRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + id));
        coupon.setIsActive(!coupon.getIsActive());
        couponRepository.save(coupon);
        return CouponDTO.from(coupon);
    }

    @Transactional
    public void deleteCoupon(String id) {
        if (!couponRepository.existsById(id)) {
            throw new IllegalArgumentException("Coupon not found: " + id);
        }
        couponRepository.deleteById(id);
    }

    // ── Internal helper ───────────────────────────────────────────────────────

    public int computeDiscount(Coupon coupon, int originalAmountCents) {
        if (coupon.getDiscountType() == Coupon.DiscountType.PERCENTAGE) {
            return (int) Math.round(originalAmountCents * coupon.getDiscountValue() / 100.0);
        } else {
            // FIXED: discountValue is in dollars, convert to cents
            return (int) Math.round(coupon.getDiscountValue() * 100);
        }
    }
}
