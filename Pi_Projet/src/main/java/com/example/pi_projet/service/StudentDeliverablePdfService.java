package com.example.pi_projet.service;

import com.example.pi_projet.dto.intelligence.DetailedComparisonResult;
import com.example.pi_projet.dto.intelligence.DetailedDiffLine;
import com.example.pi_projet.dto.intelligence.DiffSection;
import com.example.pi_projet.entity.student.StudentDeliverable;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.events.Event;
import com.itextpdf.kernel.events.IEventHandler;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.RoundDotsBorder;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentDeliverablePdfService {

    // ── Palette ───────────────────────────────────────────────────────────────
    private static final DeviceRgb C_PRIMARY      = new DeviceRgb(0x1E, 0x40, 0xAF);
    private static final DeviceRgb C_PRIMARY_DARK = new DeviceRgb(0x17, 0x30, 0x85);
    private static final DeviceRgb C_PRIMARY_LIGHT= new DeviceRgb(0xDB, 0xEA, 0xFE);
    private static final DeviceRgb C_GREEN        = new DeviceRgb(0x16, 0xA3, 0x4A);
    private static final DeviceRgb C_GREEN_LIGHT  = new DeviceRgb(0xD1, 0xFA, 0xE5);
    private static final DeviceRgb C_GREEN_DARK   = new DeviceRgb(0x14, 0x53, 0x2D);
    private static final DeviceRgb C_RED          = new DeviceRgb(0xDC, 0x26, 0x26);
    private static final DeviceRgb C_RED_LIGHT    = new DeviceRgb(0xFE, 0xE2, 0xE2);
    private static final DeviceRgb C_RED_DARK     = new DeviceRgb(0x7F, 0x1D, 0x1D);
    private static final DeviceRgb C_AMBER        = new DeviceRgb(0xD9, 0x77, 0x06);
    private static final DeviceRgb C_AMBER_LIGHT  = new DeviceRgb(0xFE, 0xF3, 0xC7);
    private static final DeviceRgb C_GRAY_900     = new DeviceRgb(0x0F, 0x17, 0x2A);
    private static final DeviceRgb C_GRAY_700     = new DeviceRgb(0x33, 0x41, 0x55);
    private static final DeviceRgb C_GRAY_500     = new DeviceRgb(0x64, 0x74, 0x8B);
    private static final DeviceRgb C_GRAY_200     = new DeviceRgb(0xE2, 0xE8, 0xF0);
    private static final DeviceRgb C_GRAY_50      = new DeviceRgb(0xF8, 0xFA, 0xFC);
    private static final DeviceRgb C_WHITE        = new DeviceRgb(0xFF, 0xFF, 0xFF);

    private static final DateTimeFormatter DT_FR  = DateTimeFormatter.ofPattern("dd MMMM yyyy 'à' HH:mm", Locale.FRENCH);
    private static final DateTimeFormatter D_FR   = DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.FRENCH);
    private static final DateTimeFormatter D_SHORT= DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int LINES_PER_PAGE = 45;

    // ── Entry point ───────────────────────────────────────────────────────────

    public byte[] generateReport(StudentDeliverable d,
                                 DetailedComparisonResult comparison,
                                 String organizationName) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter   writer = new PdfWriter(baos);
            PdfDocument pdf    = new PdfDocument(writer);
            Document    doc    = new Document(pdf, PageSize.A4);
            doc.setMargins(72, 50, 72, 50);

            PdfFont bold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont mono    = PdfFontFactory.createFont(StandardFonts.COURIER);

            String org = organizationName != null ? organizationName : "Institution";

            pdf.addEventHandler(PdfDocumentEvent.END_PAGE, new HeaderFooterHandler(org, regular, bold, pdf));

            // ── Page 1: Cover ──
            buildCover(doc, pdf, d, org, bold, regular);

            // ── Page 2: Deliverable details ──
            doc.add(new AreaBreak());
            buildDeliverableInfo(doc, d, bold, regular);

            // ── Page 3: Evaluation ──
            doc.add(new AreaBreak());
            buildEvaluation(doc, d, bold, regular);

            // ── Page 4+: Comparison (optional) ──
            if (comparison != null) {
                doc.add(new AreaBreak());
                buildComparisonSummary(doc, comparison, bold, regular);
                if (comparison.getSections() != null && !comparison.getSections().isEmpty()) {
                    doc.add(new AreaBreak());
                    buildDiff(doc, comparison, bold, regular, mono);
                }
            }

            doc.close();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 1 – COVER
    // ═════════════════════════════════════════════════════════════════════════

    private void buildCover(Document doc, PdfDocument pdf,
                            StudentDeliverable d, String org,
                            PdfFont bold, PdfFont regular) throws IOException {
        PdfPage   page   = pdf.getFirstPage();
        PdfCanvas canvas = new PdfCanvas(page);
        Rectangle r      = page.getPageSize();

        // Top banner
        canvas.setFillColor(C_PRIMARY_DARK)
              .rectangle(0, r.getHeight() - 210, r.getWidth(), 210).fill();
        // Accent strip
        canvas.setFillColor(C_PRIMARY)
              .rectangle(0, r.getHeight() - 220, r.getWidth(), 10).fill();
        // Bottom strip
        canvas.setFillColor(C_PRIMARY_LIGHT)
              .rectangle(0, 0, r.getWidth(), 40).fill();
        canvas.setFillColor(C_PRIMARY)
              .rectangle(0, 40, r.getWidth(), 3).fill();
        canvas.release();

        // Org name
        doc.add(new Paragraph(org.toUpperCase())
                .setFont(bold).setFontSize(11).setFontColor(C_PRIMARY_LIGHT)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(28).setMarginBottom(6).setCharacterSpacing(3f));

        // Document type
        doc.add(new Paragraph("RAPPORT D'ÉVALUATION")
                .setFont(bold).setFontSize(26).setFontColor(C_WHITE)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(4));

        // Horizontal rule
        doc.add(new Paragraph()
                .setBorderBottom(new SolidBorder(C_PRIMARY_LIGHT, 1))
                .setMarginBottom(10).setMarginLeft(60).setMarginRight(60));

        // Deliverable title
        doc.add(new Paragraph(safe(d.getTitle()))
                .setFont(regular).setFontSize(13).setFontColor(C_PRIMARY_LIGHT)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(55));

        // ── Info card ──
        float[] cols = {160, 310};
        Table info = new Table(cols).setMarginTop(20).setMarginBottom(30)
                .setBorder(new SolidBorder(C_GRAY_200, 1));

        addCoverRow(info, "Livrable",   safe(d.getTitle()),                        bold, regular, false);
        addCoverRow(info, "Version",    "v" + safe(d.getVersionNumber()),           bold, regular, true);
        addCoverRow(info, "Projet",     safe(d.getProjectName()),                   bold, regular, false);
        addCoverRow(info, "Étudiant",   userFullName(d.getSubmittedBy()),           bold, regular, true);
        addCoverRow(info, "Tuteur",     userFullName(d.getTutor()),                 bold, regular, false);
        addCoverRow(info, "Soumis le",  d.getSubmittedAt() != null ? d.getSubmittedAt().format(DT_FR) : "—", bold, regular, true);
        if (d.getEvaluatedAt() != null) {
            addCoverRow(info, "Évalué le", d.getEvaluatedAt().format(DT_FR),       bold, regular, false);
        }
        addCoverRow(info, "Statut",     statusLabel(d.getStatus()),                bold, regular, true);
        doc.add(info);

        // Decision badge on cover (if evaluated)
        if (d.getTutorDecision() != null) {
            boolean ok = d.getTutorDecision() == StudentDeliverable.TutorDecision.ACCEPTED;
            DeviceRgb bg  = ok ? C_GREEN_LIGHT : C_RED_LIGHT;
            DeviceRgb fg  = ok ? C_GREEN_DARK  : C_RED_DARK;
            doc.add(new Paragraph(ok ? "✓  ACCEPTÉ" : "✗  REJETÉ")
                    .setFont(bold).setFontSize(14).setFontColor(fg)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setBackgroundColor(bg)
                    .setBorder(new SolidBorder(ok ? C_GREEN : C_RED, 2))
                    .setPadding(10).setMarginBottom(14));

            if (d.getScore() != null) {
                doc.add(new Paragraph("Note : " + d.getScore() + " / 100")
                        .setFont(bold).setFontSize(12).setFontColor(C_PRIMARY)
                        .setTextAlignment(TextAlignment.CENTER).setMarginBottom(10));
            }
        }

        // Generated date at bottom
        doc.add(new Paragraph("Généré le " + LocalDate.now().format(D_FR))
                .setFont(regular).setFontSize(8).setFontColor(C_GRAY_500)
                .setTextAlignment(TextAlignment.CENTER).setMarginTop(8));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 2 – INFORMATIONS DU LIVRABLE
    // ═════════════════════════════════════════════════════════════════════════

    private void buildDeliverableInfo(Document doc, StudentDeliverable d,
                                      PdfFont bold, PdfFont regular) {
        // ── Informations générales ──
        doc.add(pageTitle("Informations du Livrable", bold));

        doc.add(sectionHeader("Détails Généraux", bold));
        Table gen = twoColTable();
        addInfoRow(gen, "Identifiant",   String.valueOf(d.getId()),       bold, regular, false);
        addInfoRow(gen, "Titre",         safe(d.getTitle()),              bold, regular, true);
        addInfoRow(gen, "Version",       "v" + safe(d.getVersionNumber()),bold, regular, false);
        addInfoRow(gen, "Projet",        safe(d.getProjectName()),        bold, regular, true);
        addInfoRow(gen, "ID Projet",     safe(d.getProjectId()),          bold, regular, false);
        addInfoRow(gen, "Statut",        statusLabel(d.getStatus()),      bold, regular, true);
        if (d.getParentId() != null) {
            addInfoRow(gen, "Version parente", "ID " + d.getParentId(), bold, regular, false);
        }
        doc.add(gen);

        if (d.getDescription() != null && !d.getDescription().isBlank()) {
            doc.add(sectionHeader("Description", bold));
            doc.add(new Paragraph(d.getDescription())
                    .setFont(regular).setFontSize(10).setFontColor(C_GRAY_700)
                    .setPadding(10).setBackgroundColor(C_GRAY_50)
                    .setBorder(new SolidBorder(C_GRAY_200, 1))
                    .setMarginBottom(14));
        }

        // ── Fichier ──
        doc.add(sectionHeader("Informations du Fichier", bold));
        Table file = twoColTable();
        addInfoRow(file, "Type de fichier",    safe(d.getFileType()),
                   bold, regular, false);
        addInfoRow(file, "Taille",
                   d.getFileSizeKb() != null ? d.getFileSizeKb() + " KB" : "—",
                   bold, regular, true);
        addInfoRow(file, "URL du fichier",     safe(d.getFileUrl()),      bold, regular, false);
        doc.add(file);

        // ── Participants ──
        doc.add(sectionHeader("Participants", bold));
        Table parts = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .useAllAvailableWidth().setMarginBottom(14);

        Cell studentCard = participantCard("ÉTUDIANT", d.getSubmittedBy(), C_PRIMARY, bold, regular);
        Cell tutorCard   = participantCard("TUTEUR",   d.getTutor(),       C_GREEN,   bold, regular);
        parts.addCell(studentCard);
        parts.addCell(tutorCard);
        doc.add(parts);

        // ── Sécurité ──
        doc.add(sectionHeader("Scan de Sécurité", bold));
        String scanStatus = d.getVirusScanStatus() != null ? d.getVirusScanStatus() : "pending";
        DeviceRgb scanBg  = switch (scanStatus) {
            case "clean"     -> C_GREEN_LIGHT;
            case "infected"  -> C_RED_LIGHT;
            case "unverified"-> C_AMBER_LIGHT;
            default          -> C_GRAY_50;
        };
        DeviceRgb scanFg  = switch (scanStatus) {
            case "clean"     -> C_GREEN_DARK;
            case "infected"  -> C_RED_DARK;
            case "unverified"-> new DeviceRgb(0x78, 0x35, 0x00);
            default          -> C_GRAY_700;
        };
        String scanLabel  = switch (scanStatus) {
            case "clean"     -> "✓  SAIN – Aucune menace détectée";
            case "infected"  -> "✗  INFECTÉ – " + safe(d.getVirusName());
            case "unverified"-> "⚠  NON VÉRIFIÉ";
            default          -> "⧗  EN ATTENTE";
        };
        doc.add(new Paragraph(scanLabel)
                .setFont(bold).setFontSize(11).setFontColor(scanFg)
                .setBackgroundColor(scanBg).setPadding(10)
                .setBorder(new SolidBorder(scanFg, 1.5f)).setMarginBottom(14));

        // ── Dates ──
        doc.add(sectionHeader("Chronologie", bold));
        Table dates = twoColTable();
        addInfoRow(dates, "Date de soumission",
                   d.getSubmittedAt() != null ? d.getSubmittedAt().format(DT_FR) : "—",
                   bold, regular, false);
        addInfoRow(dates, "Dernière mise à jour",
                   d.getUpdatedAt() != null ? d.getUpdatedAt().format(DT_FR) : "—",
                   bold, regular, true);
        if (d.getEvaluatedAt() != null) {
            addInfoRow(dates, "Date d'évaluation", d.getEvaluatedAt().format(DT_FR),
                       bold, regular, false);
        }
        doc.add(dates);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 3 – ÉVALUATION
    // ═════════════════════════════════════════════════════════════════════════

    private void buildEvaluation(Document doc, StudentDeliverable d,
                                 PdfFont bold, PdfFont regular) {
        doc.add(pageTitle("Résultat de l'Évaluation", bold));

        if (d.getTutorDecision() == null) {
            doc.add(new Paragraph("Aucune évaluation soumise pour ce livrable.")
                    .setFont(regular).setFontSize(11).setFontColor(C_GRAY_500)
                    .setTextAlignment(TextAlignment.CENTER).setMarginTop(40));
            return;
        }

        boolean accepted = d.getTutorDecision() == StudentDeliverable.TutorDecision.ACCEPTED;

        // ── Decision banner ──
        DeviceRgb decBg   = accepted ? C_GREEN_LIGHT : C_RED_LIGHT;
        DeviceRgb decBrd  = accepted ? C_GREEN       : C_RED;
        DeviceRgb decFg   = accepted ? C_GREEN_DARK  : C_RED_DARK;
        String    decText = accepted ? "✓  LIVRABLE ACCEPTÉ" : "✗  LIVRABLE REJETÉ";

        doc.add(new Paragraph(decText)
                .setFont(bold).setFontSize(20).setFontColor(decFg)
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(decBg)
                .setBorder(new SolidBorder(decBrd, 2.5f))
                .setPaddingTop(16).setPaddingBottom(16)
                .setMarginBottom(20));

        // ── Score & evaluator ──
        Table scoreRow = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .useAllAvailableWidth().setMarginBottom(20);

        // Score cell
        Cell scoreCell = new Cell().setPadding(16)
                .setBorderTop(new SolidBorder(C_PRIMARY, 3))
                .setBorderBottom(Border.NO_BORDER)
                .setBorderLeft(Border.NO_BORDER)
                .setBorderRight(Border.NO_BORDER);
        scoreCell.add(new Paragraph("NOTE FINALE")
                .setFont(bold).setFontSize(9).setFontColor(C_GRAY_500)
                .setCharacterSpacing(1.5f).setMarginBottom(6));
        int score = d.getScore() != null ? d.getScore() : 0;
        DeviceRgb scoreFg = score >= 70 ? C_GREEN : score >= 40 ? C_AMBER : C_RED;
        scoreCell.add(new Paragraph(score + "")
                .setFont(bold).setFontSize(48).setFontColor(scoreFg).setMarginBottom(0));
        scoreCell.add(new Paragraph("/ 100")
                .setFont(regular).setFontSize(14).setFontColor(C_GRAY_500));
        scoreCell.add(scoreBand(score, regular));
        scoreRow.addCell(scoreCell);

        // Evaluator info cell
        Cell evalCell = new Cell().setPadding(16)
                .setBorderTop(new SolidBorder(C_GRAY_200, 1))
                .setBorderBottom(Border.NO_BORDER)
                .setBorderLeft(Border.NO_BORDER)
                .setBorderRight(Border.NO_BORDER);
        evalCell.add(new Paragraph("INFORMATIONS D'ÉVALUATION")
                .setFont(bold).setFontSize(9).setFontColor(C_GRAY_500)
                .setCharacterSpacing(1.5f).setMarginBottom(10));

        Table evalMeta = new Table(UnitValue.createPercentArray(new float[]{90, 160}))
                .useAllAvailableWidth();
        addMiniRow(evalMeta, "Décision",   accepted ? "Accepté" : "Rejeté",  bold, regular);
        if (d.getEvaluatedBy() != null) {
            addMiniRow(evalMeta, "Évaluateur", userFullName(d.getEvaluatedBy()), bold, regular);
        }
        if (d.getEvaluatedAt() != null) {
            addMiniRow(evalMeta, "Date",       d.getEvaluatedAt().format(DT_FR), bold, regular);
        }
        evalCell.add(evalMeta);
        scoreRow.addCell(evalCell);
        doc.add(scoreRow);

        // ── Score progress bar ──
        doc.add(sectionHeader("Progression de la Note", bold));
        doc.add(buildProgressBar(score, bold, regular));

        // ── Feedback ──
        if (d.getTutorFeedback() != null && !d.getTutorFeedback().isBlank()) {
            doc.add(sectionHeader("Commentaire du Tuteur", bold));
            doc.add(new Paragraph("“" + d.getTutorFeedback() + "”")
                    .setFont(regular).setFontSize(10).setFontColor(C_GRAY_700)
                    .setPaddingLeft(14).setPaddingTop(10).setPaddingBottom(10).setPaddingRight(10)
                    .setBorderLeft(new SolidBorder(C_PRIMARY, 4))
                    .setBackgroundColor(C_GRAY_50)
                    .setMarginBottom(14));
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 4 – COMPARISON SUMMARY
    // ═════════════════════════════════════════════════════════════════════════

    private void buildComparisonSummary(Document doc, DetailedComparisonResult c,
                                        PdfFont bold, PdfFont regular) {
        doc.add(pageTitle("Analyse de Comparaison", bold));

        // ── Compared files ──
        doc.add(sectionHeader("Livrables Comparés", bold));
        Table compared = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .useAllAvailableWidth().setMarginBottom(14);
        compared.addCell(fileCard("Livrable de référence (gauche)",
                c.getLeftTitle(), c.getLeftStudentName(), C_PRIMARY, bold, regular));
        compared.addCell(fileCard("Livrable comparé (droite)",
                c.getRightTitle(), c.getRightStudentName(), C_AMBER, bold, regular));
        doc.add(compared);

        // ── Stats row ──
        doc.add(sectionHeader("Métriques", bold));
        Table stats = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1, 1}))
                .useAllAvailableWidth().setMarginBottom(14);
        addStatCard(stats, "Similarité",      c.getSimilarityPct(),                    C_PRIMARY, bold, regular);
        addStatCard(stats, "Ajouts",          "+" + c.getTotalAdded(),                 C_GREEN,   bold, regular);
        addStatCard(stats, "Suppressions",    "-" + c.getTotalRemoved(),               C_RED,     bold, regular);
        addStatCard(stats, "Modifications",   "~" + c.getTotalModified(),              C_AMBER,   bold, regular);
        addStatCard(stats, "Score suggéré",   c.getSuggestedScore() + "/100",          C_GRAY_700,bold, regular);
        doc.add(stats);

        // ── Plagiarism alert ──
        if (c.isPossiblePlagiarism()) {
            doc.add(new Paragraph("⚠  ALERTE PLAGIAT — Similarité ≥ 80%\n" +
                    "Ce livrable présente un taux de similarité élevé avec le livrable comparé. " +
                    "Une vérification manuelle est fortement recommandée.")
                    .setFont(bold).setFontSize(10).setFontColor(C_RED_DARK)
                    .setBackgroundColor(C_RED_LIGHT)
                    .setBorder(new SolidBorder(C_RED, 2))
                    .setPadding(10).setMarginBottom(14));
        }

        // ── Impact level ──
        doc.add(sectionHeader("Niveau d'Impact", bold));
        String impact = c.getImpactLevel() != null ? c.getImpactLevel() : "—";
        DeviceRgb impBg = switch (impact.toUpperCase()) {
            case "MINOR"  -> C_GREEN_LIGHT;
            case "MEDIUM" -> C_AMBER_LIGHT;
            case "MAJOR"  -> C_RED_LIGHT;
            default       -> C_GRAY_50;
        };
        DeviceRgb impFg = switch (impact.toUpperCase()) {
            case "MINOR"  -> C_GREEN_DARK;
            case "MEDIUM" -> new DeviceRgb(0x78, 0x35, 0x00);
            case "MAJOR"  -> C_RED_DARK;
            default       -> C_GRAY_700;
        };
        String impLabel = switch (impact.toUpperCase()) {
            case "MINOR"  -> "MINEUR — Différences mineures, aucun risque significatif.";
            case "MEDIUM" -> "MOYEN — Différences modérées nécessitant une attention particulière.";
            case "MAJOR"  -> "MAJEUR — Différences importantes, révision approfondie requise.";
            default       -> impact;
        };
        doc.add(new Paragraph(impLabel)
                .setFont(bold).setFontSize(10).setFontColor(impFg)
                .setBackgroundColor(impBg).setPadding(10)
                .setBorder(new SolidBorder(impFg, 1.5f)).setMarginBottom(14));

        // ── Summary table ──
        doc.add(sectionHeader("Récapitulatif", bold));
        Table summary = twoColTable();
        addInfoRow(summary, "Total sections diff.",  String.valueOf(c.getTotalSections()), bold, regular, false);
        addInfoRow(summary, "Lignes inchangées",     String.valueOf(c.getTotalUnchanged()), bold, regular, true);
        addInfoRow(summary, "Taux de similarité",    c.getSimilarityPct(),                 bold, regular, false);
        addInfoRow(summary, "Score suggéré",         c.getSuggestedScore() + " / 100",     bold, regular, true);
        addInfoRow(summary, "Plagiat probable",      c.isPossiblePlagiarism() ? "Oui" : "Non", bold, regular, false);
        doc.add(summary);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 5+ – DETAILED DIFF
    // ═════════════════════════════════════════════════════════════════════════

    private void buildDiff(Document doc, DetailedComparisonResult c,
                           PdfFont bold, PdfFont regular, PdfFont mono) {
        doc.add(pageTitle("Différences Détaillées", bold));

        List<DiffSection> sections = c.getSections();
        int lineCount = 0;
        boolean first = true;

        for (DiffSection section : sections) {
            // Section header
            String hdr = String.format("Section %d  •  ligne %d→%d  •  +%d  -%d  ~%d",
                    section.getSectionIndex() + 1,
                    section.getOldStartLine(), section.getNewStartLine(),
                    section.getAddedInSection(), section.getRemovedInSection(),
                    section.getModifiedInSection());
            doc.add(new Paragraph(hdr)
                    .setFont(bold).setFontSize(8.5f).setFontColor(C_PRIMARY)
                    .setBackgroundColor(C_PRIMARY_LIGHT).setPadding(5)
                    .setBorderLeft(new SolidBorder(C_PRIMARY, 3))
                    .setMarginTop(first ? 0 : 10).setMarginBottom(2));
            first = false;

            for (DetailedDiffLine line : section.getLines()) {
                if (line.getType() == DetailedDiffLine.LineType.UNCHANGED) continue;

                if (line.getType() == DetailedDiffLine.LineType.MODIFIED
                        && line.getOldContent() != null) {
                    // Old line
                    doc.add(diffLine("- " + truncate(line.getOldContent(), 110),
                            formatNums(line, true), mono, C_RED_LIGHT));
                    // New line
                    doc.add(diffLine("+ " + truncate(line.getContent(), 110),
                            formatNums(line, false), mono, C_GREEN_LIGHT));
                    lineCount += 2;
                } else {
                    DeviceRgb bg = switch (line.getType()) {
                        case ADDED   -> C_GREEN_LIGHT;
                        case REMOVED -> C_RED_LIGHT;
                        default      -> C_AMBER_LIGHT;
                    };
                    String pfx = switch (line.getType()) {
                        case ADDED   -> "+ ";
                        case REMOVED -> "- ";
                        default      -> "~ ";
                    };
                    doc.add(diffLine(pfx + truncate(line.getContent(), 110),
                            formatNums(line, false), mono, bg));
                    lineCount++;
                }

                if (lineCount % LINES_PER_PAGE == 0) {
                    doc.add(new AreaBreak());
                    doc.add(pageTitle("Différences Détaillées (suite)", bold));
                }
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HELPERS – Layout elements
    // ═════════════════════════════════════════════════════════════════════════

    private Paragraph pageTitle(String text, PdfFont bold) {
        return new Paragraph(text)
                .setFont(bold).setFontSize(16).setFontColor(C_PRIMARY)
                .setBorderBottom(new SolidBorder(C_PRIMARY, 2))
                .setMarginBottom(16).setPaddingBottom(6);
    }

    private Paragraph sectionHeader(String text, PdfFont bold) {
        return new Paragraph(text.toUpperCase())
                .setFont(bold).setFontSize(8).setFontColor(C_GRAY_500)
                .setCharacterSpacing(1.2f).setMarginBottom(6).setMarginTop(14);
    }

    private Table twoColTable() {
        return new Table(UnitValue.createPercentArray(new float[]{140, 350}))
                .useAllAvailableWidth().setMarginBottom(6)
                .setBorder(new SolidBorder(C_GRAY_200, 1));
    }

    private void addInfoRow(Table t, String label, String value,
                            PdfFont bold, PdfFont regular, boolean stripe) {
        DeviceRgb bg = stripe ? C_GRAY_50 : C_WHITE;
        t.addCell(new Cell().setBackgroundColor(bg).setPadding(7)
                .setBorderRight(new SolidBorder(C_GRAY_200, 0.5f))
                .setBorderBottom(new SolidBorder(C_GRAY_200, 0.5f))
                .setBorderTop(Border.NO_BORDER).setBorderLeft(Border.NO_BORDER)
                .add(new Paragraph(label).setFont(bold).setFontSize(9)
                        .setFontColor(C_GRAY_500).setMargin(0)));
        t.addCell(new Cell().setBackgroundColor(bg).setPadding(7)
                .setBorderBottom(new SolidBorder(C_GRAY_200, 0.5f))
                .setBorderTop(Border.NO_BORDER).setBorderLeft(Border.NO_BORDER)
                .setBorderRight(Border.NO_BORDER)
                .add(new Paragraph(value).setFont(regular).setFontSize(9)
                        .setFontColor(C_GRAY_700).setMargin(0)));
    }

    private void addCoverRow(Table t, String label, String value,
                             PdfFont bold, PdfFont regular, boolean stripe) {
        DeviceRgb bg = stripe ? C_GRAY_50 : C_WHITE;
        t.addCell(new Cell().setBackgroundColor(bg).setPadding(8)
                .setBorderRight(new SolidBorder(C_GRAY_200, 0.5f))
                .setBorderBottom(new SolidBorder(C_GRAY_200, 0.5f))
                .setBorderTop(Border.NO_BORDER).setBorderLeft(Border.NO_BORDER)
                .add(new Paragraph(label).setFont(bold).setFontSize(9)
                        .setFontColor(C_GRAY_500).setMargin(0)));
        t.addCell(new Cell().setBackgroundColor(bg).setPadding(8)
                .setBorderBottom(new SolidBorder(C_GRAY_200, 0.5f))
                .setBorderTop(Border.NO_BORDER).setBorderLeft(Border.NO_BORDER)
                .setBorderRight(Border.NO_BORDER)
                .add(new Paragraph(value).setFont(bold).setFontSize(9)
                        .setFontColor(C_GRAY_900).setMargin(0)));
    }

    private void addMiniRow(Table t, String label, String value,
                            PdfFont bold, PdfFont regular) {
        t.addCell(new Cell().setBorder(Border.NO_BORDER).setPaddingBottom(5)
                .add(new Paragraph(label).setFont(bold).setFontSize(8.5f)
                        .setFontColor(C_GRAY_500).setMargin(0)));
        t.addCell(new Cell().setBorder(Border.NO_BORDER).setPaddingBottom(5)
                .add(new Paragraph(value).setFont(regular).setFontSize(8.5f)
                        .setFontColor(C_GRAY_700).setMargin(0)));
    }

    private Cell participantCard(String role, com.example.pi_projet.entity.User user,
                                 DeviceRgb color, PdfFont bold, PdfFont regular) {
        Cell card = new Cell().setPadding(12)
                .setBorderTop(new SolidBorder(color, 3))
                .setBorderBottom(new SolidBorder(C_GRAY_200, 1))
                .setBorderLeft(new SolidBorder(C_GRAY_200, 1))
                .setBorderRight(new SolidBorder(C_GRAY_200, 1))
                .setBackgroundColor(C_GRAY_50);
        card.add(new Paragraph(role)
                .setFont(bold).setFontSize(8).setFontColor(color)
                .setCharacterSpacing(1.2f).setMarginBottom(6));
        if (user != null) {
            card.add(new Paragraph(user.getFullName())
                    .setFont(bold).setFontSize(11).setFontColor(C_GRAY_900).setMarginBottom(2));
            try {
                if (user.getEmail() != null) {
                    card.add(new Paragraph(user.getEmail())
                            .setFont(regular).setFontSize(9).setFontColor(C_GRAY_500).setMarginBottom(0));
                }
            } catch (Exception ignored) {}
        } else {
            card.add(new Paragraph("—").setFont(regular).setFontSize(10).setFontColor(C_GRAY_500));
        }
        return card;
    }

    private Cell fileCard(String role, String title, String student,
                          DeviceRgb color, PdfFont bold, PdfFont regular) {
        Cell card = new Cell().setPadding(10)
                .setBorderTop(new SolidBorder(color, 3))
                .setBorderBottom(new SolidBorder(C_GRAY_200, 1))
                .setBorderLeft(new SolidBorder(C_GRAY_200, 1))
                .setBorderRight(new SolidBorder(C_GRAY_200, 1))
                .setBackgroundColor(C_GRAY_50);
        card.add(new Paragraph(role)
                .setFont(bold).setFontSize(8).setFontColor(color)
                .setCharacterSpacing(1f).setMarginBottom(5));
        card.add(new Paragraph(safe(title))
                .setFont(bold).setFontSize(10).setFontColor(C_GRAY_900).setMarginBottom(2));
        card.add(new Paragraph(safe(student))
                .setFont(regular).setFontSize(9).setFontColor(C_GRAY_500));
        return card;
    }

    private void addStatCard(Table t, String label, String value,
                             DeviceRgb color, PdfFont bold, PdfFont regular) {
        Cell c = new Cell().setPadding(10).setTextAlignment(TextAlignment.CENTER)
                .setBorderTop(new SolidBorder(color, 3))
                .setBorderBottom(new SolidBorder(C_GRAY_200, 1))
                .setBorderLeft(new SolidBorder(C_GRAY_200, 1))
                .setBorderRight(new SolidBorder(C_GRAY_200, 1))
                .setBackgroundColor(C_GRAY_50);
        c.add(new Paragraph(value).setFont(bold).setFontSize(16).setFontColor(color)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2));
        c.add(new Paragraph(label).setFont(regular).setFontSize(8).setFontColor(C_GRAY_500)
                .setTextAlignment(TextAlignment.CENTER));
        t.addCell(c);
    }

    private Paragraph scoreBand(int score, PdfFont regular) {
        String label = score >= 70 ? "Excellent" : score >= 40 ? "Moyen" : "Insuffisant";
        DeviceRgb bg = score >= 70 ? C_GREEN_LIGHT : score >= 40 ? C_AMBER_LIGHT : C_RED_LIGHT;
        DeviceRgb fg = score >= 70 ? C_GREEN_DARK  : score >= 40 ? new DeviceRgb(0x78, 0x35, 0x00) : C_RED_DARK;
        return new Paragraph(label).setFont(regular).setFontSize(9).setFontColor(fg)
                .setBackgroundColor(bg).setPaddingTop(3).setPaddingBottom(3)
                .setPaddingLeft(8).setPaddingRight(8);
    }

    private Table buildProgressBar(int score, PdfFont bold, PdfFont regular) {
        // Simple horizontal bar using a 2-column table
        float filled = Math.max(1f, (float) score);
        float empty  = 100f - filled;
        float[] cols = empty > 0 ? new float[]{filled, empty} : new float[]{100f};
        Table bar = new Table(UnitValue.createPercentArray(cols))
                .useAllAvailableWidth().setMarginBottom(10);

        DeviceRgb barColor = score >= 70 ? C_GREEN : score >= 40 ? C_AMBER : C_RED;
        Cell fill = new Cell().setHeight(22).setBackgroundColor(barColor)
                .setBorder(Border.NO_BORDER);
        fill.add(new Paragraph(score + "%").setFont(bold).setFontSize(9)
                .setFontColor(C_WHITE).setTextAlignment(TextAlignment.RIGHT)
                .setMarginRight(6).setMarginTop(4));
        bar.addCell(fill);
        if (empty > 0) {
            bar.addCell(new Cell().setHeight(22)
                    .setBackgroundColor(C_GRAY_200).setBorder(Border.NO_BORDER));
        }
        return bar;
    }

    private Paragraph diffLine(String content, String lineNums, PdfFont mono, DeviceRgb bg) {
        return new Paragraph(lineNums + content)
                .setFont(mono).setFontSize(7.5f).setMargin(0)
                .setPaddingTop(1.5f).setPaddingBottom(1.5f).setPaddingLeft(4)
                .setBackgroundColor(bg);
    }

    private String formatNums(DetailedDiffLine line, boolean useOld) {
        int num = useOld
                ? (line.getOldLineNumber() != null ? line.getOldLineNumber() : 0)
                : (line.getNewLineNumber() != null ? line.getNewLineNumber() : 0);
        return String.format("%4d | ", num);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Utilities
    // ═════════════════════════════════════════════════════════════════════════

    private String safe(Object o) {
        return o != null ? o.toString().trim() : "—";
    }

    private String userFullName(com.example.pi_projet.entity.User u) {
        return u != null && u.getFullName() != null ? u.getFullName() : "—";
    }

    private String statusLabel(StudentDeliverable.StudentDeliverableStatus s) {
        if (s == null) return "—";
        return switch (s) {
            case SUBMITTED    -> "Soumis";
            case UNDER_REVIEW -> "En révision";
            case ACCEPTED     -> "Accepté";
            case REJECTED     -> "Rejeté";
        };
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) + "…" : s;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HEADER / FOOTER
    // ═════════════════════════════════════════════════════════════════════════

    private static class HeaderFooterHandler implements IEventHandler {
        private final String   org;
        private final PdfFont  regular;
        private final PdfFont  bold;
        private final PdfDocument pdf;

        HeaderFooterHandler(String org, PdfFont regular, PdfFont bold, PdfDocument pdf) {
            this.org = org; this.regular = regular; this.bold = bold; this.pdf = pdf;
        }

        @Override
        public void handleEvent(Event event) {
            PdfDocumentEvent ev  = (PdfDocumentEvent) event;
            PdfPage          page = ev.getPage();
            int              num  = pdf.getPageNumber(page);
            Rectangle        size = page.getPageSize();

            try (Canvas c = new Canvas(new PdfCanvas(page), size)) {
                // Header (skip cover)
                if (num > 1) {
                    c.setFont(bold).setFontSize(7.5f)
                     .setFontColor(new DeviceRgb(0x1E, 0x40, 0xAF));
                    c.showTextAligned(org + "  –  Rapport d'Évaluation",
                            50, size.getHeight() - 30, TextAlignment.LEFT);
                    c.setFont(regular).setFontSize(7).setFontColor(ColorConstants.GRAY);
                    c.showTextAligned("Confidentiel",
                            size.getWidth() - 50, size.getHeight() - 30, TextAlignment.RIGHT);
                    // Header line
                    new PdfCanvas(page)
                            .setStrokeColor(new DeviceRgb(0xE2, 0xE8, 0xF0))
                            .setLineWidth(0.5f)
                            .moveTo(50, size.getHeight() - 36)
                            .lineTo(size.getWidth() - 50, size.getHeight() - 36)
                            .stroke();
                }
                // Footer
                c.setFont(regular).setFontSize(7.5f).setFontColor(ColorConstants.GRAY);
                c.showTextAligned(org + " · Rapport généré le " +
                        LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                        50, 22, TextAlignment.LEFT);
                c.showTextAligned("Page " + num,
                        size.getWidth() - 50, 22, TextAlignment.RIGHT);
                // Footer line
                new PdfCanvas(page)
                        .setStrokeColor(new DeviceRgb(0xE2, 0xE8, 0xF0))
                        .setLineWidth(0.5f)
                        .moveTo(50, 36)
                        .lineTo(size.getWidth() - 50, 36)
                        .stroke();
            } catch (Exception ignored) {}
        }
    }
}
