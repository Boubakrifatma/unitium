package com.example.pi_projet.service;

import com.example.pi_projet.dto.ScanResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Single entry point used by upload controllers before any file is persisted.
 * Order of checks:
 *   1. file not empty / size within limits
 *   2. MIME type AND extension whitelisted
 *   3. virus scan (ClamAV) — infected uploads are rejected with HTTP 422
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeliverableUploadGuard {

    private final VirusScanService virusScanService;

    @Value("${deliverable.upload.allowed-types:application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip}")
    private String allowedTypesRaw;

    @Value("${deliverable.upload.allowed-extensions:pdf,docx,zip}")
    private String allowedExtensionsRaw;

    @Value("${deliverable.upload.max-size-mb:25}")
    private long maxSizeMb;

    private Set<String> allowedTypes;
    private Set<String> allowedExtensions;

    /**
     * Validate + scan. Returns the scan result so the caller can persist
     * scanStatus/virusName on the DeliverableVersion row.
     */
    public ScanResult validateAndScan(MultipartFile file) {
        ensureLoaded();

        if (file == null || file.isEmpty()) {
            throw badRequest("Le fichier est vide.");
        }

        long maxBytes = maxSizeMb * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw badRequest("Fichier trop volumineux. Maximum autorisé : " + maxSizeMb + " Mo.");
        }

        String contentType = (file.getContentType() == null ? "" : file.getContentType()).toLowerCase(Locale.ROOT);
        String ext = extensionOf(file.getOriginalFilename());
        if (!allowedTypes.contains(contentType) || !allowedExtensions.contains(ext)) {
            throw badRequest("Type de fichier non autorisé. Formats acceptés : " + String.join(", ", allowedExtensions).toUpperCase());
        }

        try {
            ScanResult result = virusScanService.scanFile(file.getInputStream());
            if (!result.isClean()) {
                log.warn("Rejected infected upload '{}' — signature: {}",
                        file.getOriginalFilename(), result.getVirusName());
                throw new ResponseStatusException(HttpStatus.valueOf(422),
                        "Fichier rejeté : virus détecté (" + result.getVirusName() + ")");
            }
            return result;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Lecture du fichier impossible: " + e.getMessage());
        } catch (VirusScanService.VirusScanUnavailableException e) {
            // strict mode — reject upload
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Antivirus indisponible. Veuillez réessayer plus tard.");
        }
    }

    private void ensureLoaded() {
        if (allowedTypes == null) {
            allowedTypes = Arrays.stream(allowedTypesRaw.split(","))
                    .map(String::trim).map(s -> s.toLowerCase(Locale.ROOT))
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toUnmodifiableSet());
        }
        if (allowedExtensions == null) {
            allowedExtensions = Arrays.stream(allowedExtensionsRaw.split(","))
                    .map(String::trim).map(s -> s.toLowerCase(Locale.ROOT))
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toUnmodifiableSet());
        }
    }

    private String extensionOf(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException badRequest(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
