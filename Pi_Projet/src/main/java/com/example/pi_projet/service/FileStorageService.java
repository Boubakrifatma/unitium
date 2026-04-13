package com.example.pi_projet.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path uploadDir;

    public FileStorageService(@Value("${file.upload.dir:uploads/deliverables}") String uploadDir) throws IOException {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(this.uploadDir);
    }

    /**
     * Persists the uploaded file to disk and returns the stored filename (UUID-based).
     * The returned name is used to build the download URL stored in fileUrl.
     */
    public String store(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String extension = "";
        if (original != null && original.contains(".")) {
            extension = original.substring(original.lastIndexOf('.'));
        }
        // Sanitize extension: only alphanumeric + dot
        extension = extension.replaceAll("[^a-zA-Z0-9.]", "");

        String storedName = UUID.randomUUID() + extension;
        Path target = uploadDir.resolve(storedName).normalize();

        // Safety: prevent path traversal
        if (!target.startsWith(uploadDir)) {
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
        Path file = uploadDir.resolve(filename).normalize();
        Resource resource = new UrlResource(file.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("File not found: " + filename);
        }
        return resource;
    }

    /**
     * Deletes a stored file. Silent if the file does not exist.
     */
    public void delete(String filename) throws IOException {
        if (filename == null || filename.isBlank()) return;
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) return;
        Path file = uploadDir.resolve(filename).normalize();
        Files.deleteIfExists(file);
    }
}
