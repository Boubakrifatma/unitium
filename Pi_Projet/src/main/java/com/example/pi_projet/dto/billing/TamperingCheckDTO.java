package com.example.pi_projet.dto.billing;

import com.example.pi_projet.entity.Invoice;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TamperingCheckDTO {

    private String  invoiceId;
    private String  invoiceNumber;
    private String  orgName;
    private String  integrityStatus;   // OK | TAMPERED | NOT_SIGNED
    private String  storedHash;
    private String  computedHash;
    private String  message;
    private String  checkedAt;

    public static TamperingCheckDTO ok(Invoice inv) {
        return TamperingCheckDTO.builder()
            .invoiceId(inv.getId())
            .invoiceNumber(inv.getInvoiceNumber())
            .orgName(inv.getOrganization() != null ? inv.getOrganization().getName() : null)
            .integrityStatus("OK")
            .storedHash(inv.getIntegrityHash())
            .computedHash(inv.getIntegrityHash())
            .message("Invoice integrity verified — no tampering detected.")
            .checkedAt(LocalDateTime.now().toString())
            .build();
    }

    public static TamperingCheckDTO tampered(Invoice inv, String computedHash) {
        return TamperingCheckDTO.builder()
            .invoiceId(inv.getId())
            .invoiceNumber(inv.getInvoiceNumber())
            .orgName(inv.getOrganization() != null ? inv.getOrganization().getName() : null)
            .integrityStatus("TAMPERED")
            .storedHash(inv.getIntegrityHash())
            .computedHash(computedHash)
            .message("ALERT: Invoice data has been tampered with. Stored hash does not match computed hash.")
            .checkedAt(LocalDateTime.now().toString())
            .build();
    }

    public static TamperingCheckDTO notSigned(Invoice inv) {
        return TamperingCheckDTO.builder()
            .invoiceId(inv.getId())
            .invoiceNumber(inv.getInvoiceNumber())
            .orgName(inv.getOrganization() != null ? inv.getOrganization().getName() : null)
            .integrityStatus("NOT_SIGNED")
            .storedHash(null)
            .computedHash(null)
            .message("Invoice has no integrity hash — created before tamper detection was enabled.")
            .checkedAt(LocalDateTime.now().toString())
            .build();
    }
}
