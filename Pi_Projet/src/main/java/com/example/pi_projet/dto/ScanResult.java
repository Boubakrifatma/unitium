package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of an antivirus scan against an uploaded deliverable.
 *
 *   clean     → file passed scanning
 *   infected  → ClamAV reported a signature match (virusName populated)
 *   unverified→ scanner unreachable AND clamav.mode=permissive
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResult {
    private boolean clean;
    private String virusName;     // null when clean / unverified
    private boolean unverified;   // true when scanner was unreachable in permissive mode

    public static ScanResult clean()                  { return ScanResult.builder().clean(true).build(); }
    public static ScanResult infected(String virus)   { return ScanResult.builder().clean(false).virusName(virus).build(); }
    public static ScanResult unverified()             { return ScanResult.builder().clean(true).unverified(true).build(); }
}
