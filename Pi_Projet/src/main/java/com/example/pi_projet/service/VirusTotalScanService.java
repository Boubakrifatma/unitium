package com.example.pi_projet.service;

import com.example.pi_projet.dto.ScanResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.security.MessageDigest;
import java.util.List;
import java.util.Map;

/**
 * Scans uploaded files via the VirusTotal public API v3.
 *
 * Flow:
 *   1. SHA-256 hash the file bytes.
 *   2. GET /files/{hash} — instant result if VT has seen this file before.
 *   3. If unknown, POST /files to upload, then poll GET /analyses/{id}.
 *   4. If malicious engines > 0, return ScanResult.infected().
 *   5. On timeout or API error: permissive → unverified, strict → exception.
 *
 * Free-tier limits: 4 requests/min, 500 uploads/day.
 * Configure your key in application.properties: virustotal.api.key=...
 */
@Slf4j
@Service
public class VirusTotalScanService {

    private static final String BASE_URL = "https://www.virustotal.com/api/v3";

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final int maxAttempts;
    private final long intervalMs;
    private final boolean permissive;

    public VirusTotalScanService(
            @Value("${virustotal.api.key:}") String apiKey,
            @Value("${virustotal.poll.max-attempts:12}") int maxAttempts,
            @Value("${virustotal.poll.interval-ms:5000}") long intervalMs,
            @Value("${virustotal.mode:permissive}") String mode,
            @Value("${virustotal.timeout.connect-ms:5000}") int connectTimeoutMs,
            @Value("${virustotal.timeout.read-ms:10000}") int readTimeoutMs) {
        this.apiKey      = apiKey;
        this.maxAttempts = maxAttempts;
        this.intervalMs  = intervalMs;
        this.permissive  = !"strict".equalsIgnoreCase(mode);

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(factory);

        log.info("VirusTotalScanService initialised — mode={} key={} connectTimeout={}ms readTimeout={}ms",
                mode, apiKey.isBlank() ? "NOT SET" : "***", connectTimeoutMs, readTimeoutMs);
    }

    /**
     * Scan file bytes. The filename is used only for the multipart upload name.
     * Returns ScanResult.clean(), .infected(name), or .unverified().
     */
    public ScanResult scanFile(byte[] fileBytes, String filename) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("VirusTotal API key not configured — upload proceeds as unverified");
            return handleUnavailable("VirusTotal API key not configured");
        }

        try {
            // Fast path: check by SHA-256 (no upload quota used)
            String sha256 = sha256Hex(fileBytes);
            log.debug("Checking VirusTotal hash {}", sha256);
            ScanResult fromHash = checkByHash(sha256);
            if (fromHash != null) {
                log.info("VirusTotal hash hit for {} → {}", filename, fromHash.isClean() ? "clean" : "infected");
                return fromHash;
            }

            // Slow path: upload + poll
            log.info("File {} not in VT database — uploading ({} bytes)", filename, fileBytes.length);
            String analysisId = uploadFile(fileBytes, filename);
            return pollAnalysis(analysisId, filename);

        } catch (VirusScanService.VirusScanUnavailableException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return handleUnavailable("Scan interrupted");
        } catch (Exception e) {
            log.warn("VirusTotal scan error: {}", e.getMessage());
            return handleUnavailable(e.getMessage());
        }
    }

    // ── Hash lookup ──────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private ScanResult checkByHash(String sha256) {
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    BASE_URL + "/files/" + sha256,
                    HttpMethod.GET,
                    new HttpEntity<>(apiHeaders()),
                    Map.class);
            return interpretStats(lastAnalysisStats(resp.getBody()));
        } catch (HttpClientErrorException.NotFound e) {
            return null; // file never seen before
        }
    }

    // ── Upload ───────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String uploadFile(byte[] fileBytes, String filename) {
        HttpHeaders headers = apiHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(fileBytes) {
            @Override public String getFilename() {
                return filename != null && !filename.isBlank() ? filename : "upload";
            }
        });

        ResponseEntity<Map> resp = restTemplate.exchange(
                BASE_URL + "/files",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class);

        Map<String, Object> data = (Map<String, Object>) resp.getBody().get("data");
        return (String) data.get("id");
    }

    // ── Polling ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private ScanResult pollAnalysis(String analysisId, String filename) throws InterruptedException {
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            Thread.sleep(intervalMs);

            ResponseEntity<Map> resp = restTemplate.exchange(
                    BASE_URL + "/analyses/" + analysisId,
                    HttpMethod.GET,
                    new HttpEntity<>(apiHeaders()),
                    Map.class);

            Map<String, Object> data       = (Map<String, Object>) resp.getBody().get("data");
            Map<String, Object> attributes = (Map<String, Object>) data.get("attributes");
            String status = (String) attributes.get("status");

            log.debug("VT analysis {} — status={} attempt={}/{}", analysisId, status, attempt, maxAttempts);

            if ("completed".equals(status)) {
                Map<String, Object> stats = (Map<String, Object>) attributes.get("stats");
                ScanResult result = interpretStats(stats);
                log.info("VirusTotal result for {}: {}", filename, result.isClean() ? "clean" : "INFECTED(" + result.getVirusName() + ")");
                return result;
            }
        }

        log.warn("VirusTotal analysis timed out after {} attempts for {}", maxAttempts, filename);
        return handleUnavailable("Analysis timed out");
    }

    // ── Result interpretation ────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> lastAnalysisStats(Map<?, ?> body) {
        Map<String, Object> data       = (Map<String, Object>) body.get("data");
        Map<String, Object> attributes = (Map<String, Object>) data.get("attributes");
        return (Map<String, Object>) attributes.get("last_analysis_stats");
    }

    private ScanResult interpretStats(Map<String, Object> stats) {
        if (stats == null) return null;
        int malicious  = toInt(stats.get("malicious"));
        int suspicious = toInt(stats.get("suspicious"));
        if (malicious > 0) {
            return ScanResult.infected("VirusTotal: " + malicious + " moteur(s) ont détecté une menace");
        }
        if (suspicious > 2) {
            return ScanResult.infected("VirusTotal: " + suspicious + " moteur(s) ont marqué le fichier comme suspect");
        }
        return ScanResult.clean();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private HttpHeaders apiHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set("x-apikey", apiKey);
        h.setAccept(List.of(MediaType.APPLICATION_JSON));
        return h;
    }

    private String sha256Hex(byte[] bytes) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(bytes);
        StringBuilder sb = new StringBuilder(64);
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private int toInt(Object val) {
        return val instanceof Number n ? n.intValue() : 0;
    }

    private ScanResult handleUnavailable(String reason) {
        if (permissive) return ScanResult.unverified();
        throw new VirusScanService.VirusScanUnavailableException("VirusTotal indisponible: " + reason);
    }
}
