package com.example.pi_projet.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;

/**
 * Reads a stored deliverable file (PDF, DOCX, TXT, or source code) from
 * disk and returns its plain-text content so the diff engine can compare
 * two student submissions.
 *
 * The fileUrl persisted on a Deliverable looks like:
 *   "/api/files/deliverables/{uuid}.pdf"
 *
 * We strip the prefix and resolve the file inside `file.upload.dir`.
 */
@Slf4j
@Service
public class FileTextExtractor {

    private static final String URL_PREFIX = "/api/files/deliverables/";

    /** Extensions treated as plain-text (no binary parsing needed). */
    private static final Set<String> PLAIN_TEXT_EXTENSIONS = Set.of(
        ".txt", ".md",
        ".js", ".ts", ".jsx", ".tsx",
        ".java", ".py", ".c", ".cpp", ".h", ".cs",
        ".go", ".rb", ".php", ".kt", ".swift", ".rs", ".scala",
        ".html", ".htm", ".css", ".scss", ".xml",
        ".json", ".yaml", ".yml",
        ".sh", ".bat", ".ps1", ".sql"
    );

    private final Path uploadDir;

    public FileTextExtractor(@Value("${file.upload.dir:uploads/deliverables}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    /** Extract plain text from a deliverable's stored file (PDF or DOCX). */
    public String extract(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return "";

        String storedName = fileUrl.startsWith(URL_PREFIX)
                ? fileUrl.substring(URL_PREFIX.length())
                : fileUrl;

        // Defensive — block path traversal
        if (storedName.contains("..") || storedName.contains("/") || storedName.contains("\\")) {
            log.warn("Refusing to extract file with suspicious name: {}", storedName);
            return "";
        }

        Path file = uploadDir.resolve(storedName).normalize();
        if (!Files.exists(file)) {
            log.warn("File not found for extraction: {}", file);
            return "";
        }

        String name = storedName.toLowerCase(Locale.ROOT);
        try {
            if (name.endsWith(".pdf"))          return extractPdf(file);
            if (name.endsWith(".docx"))         return extractDocx(file);
            if (isPlainText(name))              return extractPlainText(file);
            log.warn("Unsupported file type for extraction: {}", storedName);
            return "";
        } catch (IOException e) {
            log.error("Text extraction failed for {}: {}", storedName, e.getMessage());
            return "";
        }
    }

    private boolean isPlainText(String lowerName) {
        return PLAIN_TEXT_EXTENSIONS.stream().anyMatch(lowerName::endsWith);
    }

    private String extractPdf(Path file) throws IOException {
        try (PDDocument doc = Loader.loadPDF(file.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(doc);
        }
    }

    private String extractDocx(Path file) throws IOException {
        try (InputStream in = Files.newInputStream(file);
             XWPFDocument doc = new XWPFDocument(in);
             XWPFWordExtractor ext = new XWPFWordExtractor(doc)) {
            return ext.getText();
        }
    }

    private String extractPlainText(Path file) throws IOException {
        return Files.readString(file, StandardCharsets.UTF_8);
    }
}
