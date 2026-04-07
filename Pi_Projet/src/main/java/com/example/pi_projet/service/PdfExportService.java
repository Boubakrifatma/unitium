package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.port.AuditDataPort;
import com.example.pi_projet.port.TaskDataPort;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import com.example.pi_projet.repository.WorkspaceRepository;
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
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PdfExportService {

    private static final DeviceRgb BRAND_BLUE   = new DeviceRgb(0x1E, 0x40, 0xAF);
    private static final DeviceRgb BRAND_LIGHT  = new DeviceRgb(0xDB, 0xEA, 0xFE);
    private static final DeviceRgb ACCENT_GREEN = new DeviceRgb(0x16, 0xA3, 0x4A);
    private static final DeviceRgb ACCENT_RED   = new DeviceRgb(0xDC, 0x26, 0x26);
    private static final DeviceRgb ROW_STRIPE   = new DeviceRgb(0xF1, 0xF5, 0xF9);
    private static final DateTimeFormatter DATE_FMT     = DateTimeFormatter.ofPattern("MMM d, yyyy");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy HH:mm");

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskDataPort taskDataPort;
    private final AuditDataPort auditDataPort;

    /** Internal data holder — private to this service, not a standalone DTO. */
    private record ReportContext(
        Workspace workspace,
        List<WorkspaceMember> members,
        List<Project> projects,
        List<TaskDataPort.ProjectTaskStats> taskStats,
        List<AuditDataPort.AuditEventSummary> events,
        int completedCount,
        int overdueCount,
        double onTrackRate,
        List<RiskEntry> risks,
        String narrative,
        LocalDate from,
        LocalDate to,
        int periodDays
    ) {}

    private record RiskEntry(String projectName, String riskType, String details) {}

    public byte[] generateReport(UUID workspaceId, int periodDays) {
        ReportContext ctx = loadContext(workspaceId, periodDays);
        try {
            return renderPdf(ctx);
        } catch (IOException e) {
            throw new Module2Exception(Module2Exception.ErrorCode.INTERNAL,
                "Failed to render PDF: " + e.getMessage());
        }
    }

    public String getWorkspaceName(UUID workspaceId) {
        return workspaceRepository.findById(workspaceId)
            .map(Workspace::getName)
            .orElse("workspace");
    }

    // ── Data loading ──────────────────────────────────────────────────────────────

    private ReportContext loadContext(UUID workspaceId, int periodDays) {
        LocalDate from = LocalDate.now().minusDays(periodDays);
        LocalDate to   = LocalDate.now();

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND,
                "Workspace not found: " + workspaceId));

        List<WorkspaceMember> members = workspaceMemberRepository.findAllByWorkspaceId(workspaceId).stream()
            .filter(m -> m.getDeletedAt() == null).toList();
        List<Project> projects = projectRepository.findAllByWorkspaceIdAndDeletedAtIsNull(workspaceId);

        int completedCount = taskDataPort.countCompletedInPeriod(workspaceId, from, to);
        int overdueCount   = taskDataPort.countOverdueByWorkspace(workspaceId);

        double onTrackRate = 0.0;
        if (!projects.isEmpty()) {
            long onTrack = projects.stream()
                .filter(p -> p.getStatus() == Project.ProjectStatus.ACTIVE
                          || p.getStatus() == Project.ProjectStatus.COMPLETED)
                .count();
            onTrackRate = (double) onTrack / projects.size() * 100.0;
        }

        List<RiskEntry> risks = new ArrayList<>();
        for (Project p : projects) {
            if (p.getStatus() == Project.ProjectStatus.CANCELLED)
                risks.add(new RiskEntry(p.getName(), "PROJECT_BLOCKED", "Project is cancelled"));
            long projMembers = projectMemberRepository.findAllByProjectId(p.getId()).stream()
                .filter(pm -> pm.getDeletedAt() == null).count();
            if (projMembers == 0)
                risks.add(new RiskEntry(p.getName(), "NO_TEAM", "No team members assigned"));
            long days = ChronoUnit.DAYS.between(p.getCreatedAt(), java.time.Instant.now());
            if (days > 60 && p.getStatus() != Project.ProjectStatus.COMPLETED
                          && p.getStatus() != Project.ProjectStatus.ARCHIVED)
                risks.add(new RiskEntry(p.getName(), "STALE_PROJECT",
                    "Project is " + days + " days old with no completion"));
        }

        String narrative = String.format(
            "The %s workspace contains %d project%s across %d member%s. " +
            "During the last %d days, %d task%s were completed with an on-track rate of %.1f%%. " +
            "%d task%s are currently overdue.",
            workspace.getName(),
            projects.size(), projects.size() != 1 ? "s" : "",
            members.size(), members.size() != 1 ? "s" : "",
            periodDays, completedCount, completedCount != 1 ? "s" : "",
            onTrackRate, overdueCount, overdueCount != 1 ? "s" : "");

        return new ReportContext(workspace, members, projects,
            taskDataPort.getTaskStatsByProject(workspaceId),
            auditDataPort.getEventsByWorkspace(workspaceId, from, to),
            completedCount, overdueCount, onTrackRate, risks, narrative, from, to, periodDays);
    }

    // ── PDF rendering ─────────────────────────────────────────────────────────────

    private byte[] renderPdf(ReportContext ctx) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter   writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document    doc    = new Document(pdfDoc, PageSize.A4);
        doc.setMargins(60, 50, 60, 50);

        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        PdfFont bold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

        pdfDoc.addEventHandler(PdfDocumentEvent.END_PAGE, new HeaderFooter(ctx.workspace().getName()));

        renderCover(doc, pdfDoc, ctx, bold, regular);
        doc.add(new AreaBreak()); renderSummary(doc, ctx, bold, regular);
        doc.add(new AreaBreak()); renderProjects(doc, ctx, bold, regular);
        doc.add(new AreaBreak()); renderMembers(doc, ctx, bold, regular);
        doc.add(new AreaBreak()); renderTimeline(doc, ctx, bold, regular);
        doc.add(new AreaBreak()); renderRisks(doc, ctx, bold, regular);

        doc.close();
        return baos.toByteArray();
    }

    private void renderCover(Document doc, PdfDocument pdfDoc,
                              ReportContext ctx, PdfFont bold, PdfFont regular) throws IOException {
        PdfPage   page   = pdfDoc.getFirstPage();
        PdfCanvas canvas = new PdfCanvas(page);
        Rectangle rect   = page.getPageSize();
        canvas.setFillColor(BRAND_BLUE).rectangle(0, rect.getHeight() - 220, rect.getWidth(), 220).fill();
        canvas.setFillColor(BRAND_LIGHT).rectangle(0, 0, rect.getWidth(), 60).fill();
        canvas.release();

        doc.add(new Paragraph(ctx.workspace().getName()).setFont(bold).setFontSize(32)
            .setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(50).setMarginBottom(4));
        doc.add(new Paragraph("Workspace Performance Report").setFont(regular).setFontSize(16)
            .setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.CENTER).setMarginBottom(80));

        doc.add(kv("Period", ctx.from().format(DATE_FMT) + " – " + ctx.to().format(DATE_FMT), bold, regular));
        doc.add(kv("Total Projects",  String.valueOf(ctx.projects().size()), bold, regular));
        doc.add(kv("Team Members",    String.valueOf(ctx.members().size()), bold, regular));
        doc.add(kv("On-Track Rate",   String.format("%.1f%%", ctx.onTrackRate()), bold, regular));
        doc.add(kv("Tasks Completed", String.valueOf(ctx.completedCount()), bold, regular));
        doc.add(kv("Overdue Tasks",   String.valueOf(ctx.overdueCount()), bold, regular));
        doc.add(new Paragraph("Generated on " + LocalDate.now().format(DATE_FMT))
            .setFont(regular).setFontSize(9).setFontColor(ColorConstants.GRAY)
            .setTextAlignment(TextAlignment.CENTER).setMarginTop(40));
    }

    private void renderSummary(Document doc, ReportContext ctx, PdfFont bold, PdfFont regular) {
        doc.add(heading("Executive Summary", bold));
        doc.add(new Paragraph(ctx.narrative()).setFont(regular).setFontSize(11).setMarginBottom(20));

        doc.add(subHeading("Key Performance Indicators", bold));
        Table kpi = new Table(new float[]{3, 2}).setWidth(UnitValue.createPercentValue(100));
        kpiRow(kpi, "Total Projects",           String.valueOf(ctx.projects().size()), bold, regular, true);
        kpiRow(kpi, "Active Members",           String.valueOf(ctx.members().size()), bold, regular, false);
        kpiRow(kpi, "On-Track Rate",            String.format("%.1f%%", ctx.onTrackRate()), bold, regular, true);
        kpiRow(kpi, "Tasks Completed (period)", String.valueOf(ctx.completedCount()), bold, regular, false);
        kpiRow(kpi, "Overdue Tasks",            String.valueOf(ctx.overdueCount()), bold, regular, true);
        kpiRow(kpi, "Risk Items",               String.valueOf(ctx.risks().size()), bold, regular, false);
        doc.add(kpi);

        doc.add(subHeading("Project Status Breakdown", bold).setMarginTop(20));
        Table st = new Table(new float[]{3, 1}).setWidth(UnitValue.createPercentValue(60));
        addHeader(st, List.of("Status", "Count"), bold);
        Project.ProjectStatus[] statuses = Project.ProjectStatus.values();
        for (int i = 0; i < statuses.length; i++) {
            final Project.ProjectStatus s = statuses[i];
            long cnt = ctx.projects().stream().filter(p -> p.getStatus() == s).count();
            st.addCell(cell(s.name(), regular, 10, i % 2 == 0));
            st.addCell(cell(String.valueOf(cnt), regular, 10, i % 2 == 0));
        }
        doc.add(st);
    }

    private void renderProjects(Document doc, ReportContext ctx, PdfFont bold, PdfFont regular) {
        doc.add(heading("Project Overview", bold));
        if (ctx.projects().isEmpty()) {
            doc.add(new Paragraph("No projects found.").setFont(regular).setFontSize(11).setFontColor(ColorConstants.GRAY));
            return;
        }
        Table t = new Table(new float[]{3, 1.5f, 1.5f, 1.5f}).setWidth(UnitValue.createPercentValue(100));
        addHeader(t, List.of("Project Name", "Status", "Visibility", "Created"), bold);
        for (int i = 0; i < ctx.projects().size(); i++) {
            Project p = ctx.projects().get(i);
            boolean s = i % 2 == 0;
            t.addCell(cell(p.getName(), bold, 10, s));
            Cell sc = cell(p.getStatus().name(), regular, 10, s);
            if (p.getStatus() == Project.ProjectStatus.ACTIVE || p.getStatus() == Project.ProjectStatus.COMPLETED) sc.setFontColor(ACCENT_GREEN);
            else if (p.getStatus() == Project.ProjectStatus.CANCELLED || p.getStatus() == Project.ProjectStatus.ON_HOLD) sc.setFontColor(ACCENT_RED);
            t.addCell(sc);
            t.addCell(cell(p.getVisibility() != null ? p.getVisibility().name() : "—", regular, 10, s));
            String created = p.getCreatedAt() != null ? p.getCreatedAt().atZone(ZoneId.systemDefault()).format(DATE_FMT) : "—";
            t.addCell(cell(created, regular, 10, s));
        }
        doc.add(t);
    }

    private void renderMembers(Document doc, ReportContext ctx, PdfFont bold, PdfFont regular) {
        doc.add(heading("Member Directory", bold));
        if (ctx.members().isEmpty()) {
            doc.add(new Paragraph("No members found.").setFont(regular).setFontSize(11).setFontColor(ColorConstants.GRAY));
            return;
        }
        Table t = new Table(new float[]{2, 2, 2}).setWidth(UnitValue.createPercentValue(100));
        addHeader(t, List.of("User ID", "Role", "Joined"), bold);
        for (int i = 0; i < ctx.members().size(); i++) {
            WorkspaceMember m = ctx.members().get(i);
            boolean s = i % 2 == 0;
            t.addCell(cell("User #" + m.getUserId(), regular, 10, s));
            t.addCell(cell(m.getRole() != null ? m.getRole().name() : "—", regular, 10, s));
            String joined = m.getJoinedAt() != null ? m.getJoinedAt().atZone(ZoneId.systemDefault()).format(DATE_FMT) : "—";
            t.addCell(cell(joined, regular, 10, s));
        }
        doc.add(t);
    }

    private void renderTimeline(Document doc, ReportContext ctx, PdfFont bold, PdfFont regular) {
        doc.add(heading("Activity Timeline", bold));
        doc.add(new Paragraph("Period: " + ctx.from().format(DATE_FMT) + " to " + ctx.to().format(DATE_FMT))
            .setFont(regular).setFontSize(10).setFontColor(ColorConstants.GRAY).setMarginBottom(12));
        if (ctx.events().isEmpty()) {
            doc.add(new Paragraph("No activity events recorded for this period.")
                .setFont(regular).setFontSize(11).setFontColor(ColorConstants.GRAY));
            return;
        }
        Table t = new Table(new float[]{2, 2, 2, 3}).setWidth(UnitValue.createPercentValue(100));
        addHeader(t, List.of("Timestamp", "Action", "Actor", "Description"), bold);
        for (int i = 0; i < ctx.events().size(); i++) {
            AuditDataPort.AuditEventSummary ev = ctx.events().get(i);
            boolean s = i % 2 == 0;
            String ts = ev.occurredAt() != null ? ev.occurredAt().atZone(ZoneId.systemDefault()).format(DATETIME_FMT) : "—";
            t.addCell(cell(ts, regular, 9, s));
            t.addCell(cell(ev.action() != null ? ev.action() : "—", regular, 9, s));
            t.addCell(cell(ev.actorName() != null ? ev.actorName() : "System", regular, 9, s));
            t.addCell(cell(ev.description() != null ? ev.description() : "—", regular, 9, s));
        }
        doc.add(t);
    }

    private void renderRisks(Document doc, ReportContext ctx, PdfFont bold, PdfFont regular) {
        doc.add(heading("Risk Register", bold));
        if (ctx.risks().isEmpty()) {
            doc.add(new Paragraph("No risk items detected.").setFont(regular).setFontSize(11).setFontColor(ACCENT_GREEN));
            return;
        }
        doc.add(new Paragraph(ctx.risks().size() + " risk item(s) identified:")
            .setFont(regular).setFontSize(11).setMarginBottom(10));
        Table t = new Table(new float[]{2.5f, 2, 3.5f}).setWidth(UnitValue.createPercentValue(100));
        addHeader(t, List.of("Project", "Risk Type", "Details"), bold);
        for (int i = 0; i < ctx.risks().size(); i++) {
            RiskEntry r = ctx.risks().get(i);
            boolean s = i % 2 == 0;
            t.addCell(cell(r.projectName(), bold, 10, s));
            t.addCell(cell(r.riskType(), regular, 10, s).setFontColor(ACCENT_RED));
            t.addCell(cell(r.details(), regular, 10, s));
        }
        doc.add(t);
    }

    // ── Tiny helpers ──────────────────────────────────────────────────────────────

    private Paragraph kv(String label, String value, PdfFont bold, PdfFont regular) {
        return new Paragraph().add(new Text(label + ": ").setFont(bold).setFontSize(11))
            .add(new Text(value).setFont(regular).setFontSize(11))
            .setTextAlignment(TextAlignment.CENTER).setMarginBottom(6);
    }

    private Paragraph heading(String text, PdfFont bold) {
        return new Paragraph(text).setFont(bold).setFontSize(18).setFontColor(BRAND_BLUE)
            .setMarginBottom(14)
            .setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(BRAND_BLUE, 1.5f))
            .setPaddingBottom(4);
    }

    private Paragraph subHeading(String text, PdfFont bold) {
        return new Paragraph(text).setFont(bold).setFontSize(13).setFontColor(BRAND_BLUE)
            .setMarginBottom(8).setMarginTop(4);
    }

    private void addHeader(Table table, List<String> headers, PdfFont bold) {
        for (String h : headers)
            table.addHeaderCell(new Cell()
                .add(new Paragraph(h).setFont(bold).setFontSize(10).setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(BRAND_BLUE).setPadding(6).setTextAlignment(TextAlignment.LEFT));
    }

    private Cell cell(String text, PdfFont font, float size, boolean stripe) {
        Cell c = new Cell().add(new Paragraph(text != null ? text : "").setFont(font).setFontSize(size)).setPadding(5);
        if (stripe) c.setBackgroundColor(ROW_STRIPE);
        return c;
    }

    private void kpiRow(Table t, String label, String value, PdfFont bold, PdfFont regular, boolean stripe) {
        t.addCell(cell(label, bold, 11, stripe));
        t.addCell(cell(value, regular, 11, stripe));
    }

    // ── Header/footer event handler ───────────────────────────────────────────────

    private class HeaderFooter implements IEventHandler {
        private final String workspaceName;
        HeaderFooter(String workspaceName) { this.workspaceName = workspaceName; }

        @Override
        public void handleEvent(Event event) {
            PdfDocumentEvent e  = (PdfDocumentEvent) event;
            PdfDocument pdfDoc  = e.getDocument();
            PdfPage page        = e.getPage();
            int pageNumber      = pdfDoc.getPageNumber(page);
            if (pageNumber == 1) return;

            Rectangle ps = page.getPageSize();
            PdfCanvas pc = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdfDoc);
            pc.setFillColor(BRAND_BLUE).rectangle(0, ps.getHeight() - 38, ps.getWidth(), 38).fill();
            pc.setStrokeColor(BRAND_BLUE).setLineWidth(0.5f).moveTo(40, 42).lineTo(ps.getWidth() - 40, 42).stroke();
            pc.release();

            try {
                PdfFont b = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                PdfFont r = PdfFontFactory.createFont(StandardFonts.HELVETICA);

                new Canvas(new PdfCanvas(page), new Rectangle(40, ps.getHeight() - 35, ps.getWidth() - 80, 28))
                    .add(new Paragraph(workspaceName + " — Performance Report")
                        .setFont(b).setFontSize(9).setFontColor(ColorConstants.WHITE))
                    .close();

                new Canvas(new PdfCanvas(page), new Rectangle(40, 18, ps.getWidth() - 80, 22))
                    .add(new Paragraph("Page " + pageNumber + "  |  Confidential")
                        .setFont(r).setFontSize(8).setFontColor(ColorConstants.GRAY))
                    .add(new Paragraph("Generated " + LocalDate.now().format(DATE_FMT))
                        .setFont(r).setFontSize(8).setFontColor(ColorConstants.GRAY)
                        .setTextAlignment(TextAlignment.RIGHT)
                        .setFixedPosition(ps.getWidth() - 200, 18, 160))
                    .close();
            } catch (IOException ex) {
                log.warn("Header/footer font error: {}", ex.getMessage());
            }
        }
    }
}
