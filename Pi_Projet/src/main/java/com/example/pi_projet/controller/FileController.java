package com.example.pi_projet.controller;

import com.example.pi_projet.dto.FileUploadResponse;
import com.example.pi_projet.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;

/**
 * Handles file upload and download for deliverable files.
 *
 * Flow:
 *   1. Employee uploads file  → POST /api/files/upload
 *      Response includes { fileUrl, fileSizeKb, fileType } to use in deliverable/version creation.
 *   2. Anyone with the URL downloads  → GET /api/files/deliverables/{filename}
 *
 * /api/files/** is excluded from session auth in WebConfig, so no token is needed for download.
 */
@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    // ─── POST /api/files/upload ───────────────────────────────────────────────
    // Accepts a multipart file, stores it, returns URL + metadata.
    // The returned fileUrl is what should be sent in DeliverableCreateDto.fileUrl
    // or CreateDeliverableVersionRequest.fileUrl.
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> upload(
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String storedName = fileStorageService.store(file);
        String fileUrl = "/api/files/deliverables/" + storedName;
        long sizeKb = Math.max(1L, file.getSize() / 1024);

        return ResponseEntity.ok(FileUploadResponse.builder()
                .fileUrl(fileUrl)
                .originalName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .fileSizeKb(sizeKb)
                .build());
    }

    // ─── GET /api/files/deliverables/{filename} ───────────────────────────────
    // Streams the stored file. PDFs open inline; other types are downloaded.
    @GetMapping("/deliverables/{filename:.+}")
    public ResponseEntity<Resource> download(@PathVariable String filename) throws IOException {
        Resource resource = fileStorageService.load(filename);

        // Detect content type from file bytes; fall back to octet-stream
        String contentType;
        try {
            contentType = Files.probeContentType(resource.getFile().toPath());
        } catch (Exception e) {
            contentType = null;
        }
        if (contentType == null) contentType = "application/octet-stream";

        // PDFs: open inline in the browser. Other files: force download.
        String disposition = contentType.equals("application/pdf") ? "inline" : "attachment";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition + "; filename=\"" + filename + "\"")
                .body(resource);
    }
}
