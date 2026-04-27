package com.example.pi_projet.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final long MAX_SIZE_BYTES = 50L * 1024 * 1024; // 50 MB

    @Value("${app.upload.dir:uploads/chat}")
    private String uploadDir;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + uploadPath, e);
        }
    }

    /**
     * Persists the multipart file to disk.
     *
     * @return the stored filename (UUID-prefixed original name) used to build the download URL
     */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must not be empty.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "File exceeds the maximum allowed size of 20 MB.");
        }

        String originalName = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._\\-]", "_")
                : "attachment";

        String storedName = UUID.randomUUID() + "_" + originalName;
        Path target = uploadPath.resolve(storedName);

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to store file: " + e.getMessage());
        }

        return storedName;
    }

    /**
     * Loads a stored file as a Spring {@link Resource} for streaming to the client.
     */
    public Resource getFileAsResource(String storedName) {
        try {
            Path filePath = uploadPath.resolve(storedName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found: " + storedName);
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found: " + storedName);
        }
    }
    private final Path uploadDir1;

    public FileStorageService(@Value("${file.upload.dir:uploads/deliverables}") String uploadDir1) throws IOException {
        this.uploadDir1 = Paths.get(uploadDir1).toAbsolutePath().normalize();
        Files.createDirectories(this.uploadDir1);
    }

    /**
     * Persists the uploaded file to disk and returns the stored filename (UUID-based).
     * The returned name is used to build the download URL stored in fileUrl.
     */
    public String store1(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String extension = "";
        if (original != null && original.contains(".")) {
            extension = original.substring(original.lastIndexOf('.'));
        }
        // Sanitize extension: only alphanumeric + dot
        extension = extension.replaceAll("[^a-zA-Z0-9.]", "");

        String storedName = UUID.randomUUID() + extension;
        Path target = uploadDir1.resolve(storedName).normalize();

        // Safety: prevent path traversal
        if (!target.startsWith(uploadDir1)) {
            throw new SecurityException("Path traversal attempt detected");
        }

        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return storedName;
    }

    /**
     * Loads a stored file as a Spring Resource for streaming in the download endpoint.
     */
    public Resource load(String filename) throws MalformedURLException {
        // Reject any path-traversal attempt in the filename
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new SecurityException("Invalid filename: " + filename);
        }
        Path file = uploadDir1.resolve(filename).normalize();
        Resource resource = new UrlResource(file.toUri());
        if (resource.exists() && resource.isReadable()) {
            return resource;
        }
        // Legacy fallback: files uploaded before the store1() fix live in uploadDir (uploads/chat).
        if (uploadPath != null) {
            Path legacy = uploadPath.resolve(filename).normalize();
            Resource legacyResource = new UrlResource(legacy.toUri());
            if (legacyResource.exists() && legacyResource.isReadable()) {
                return legacyResource;
            }
        }
        throw new RuntimeException("File not found: " + filename);
    }

    /**
     * Deletes a stored file. Silent if the file does not exist.
     */
    public void delete(String filename) throws IOException {
        if (filename == null || filename.isBlank()) return;
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) return;
        Path file = uploadDir1.resolve(filename).normalize();
        Files.deleteIfExists(file);
    }
}
