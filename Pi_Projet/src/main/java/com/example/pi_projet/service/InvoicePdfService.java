package com.example.pi_projet.service;

import com.example.pi_projet.entity.Invoice;
import com.example.pi_projet.entity.InvoiceLineItem;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Slf4j
public class InvoicePdfService {

    private static final Color COLOR_BLUE    = new Color(37, 99, 235);
    private static final Color COLOR_LIGHT   = new Color(241, 245, 249);
    private static final Color COLOR_GREEN   = new Color(5, 150, 105);
    private static final Color COLOR_DARK    = new Color(30, 41, 59);
    private static final Color COLOR_GRAY    = new Color(100, 116, 139);
    private static final Color COLOR_WHITE   = Color.WHITE;

    private static final Font FONT_TITLE     = new Font(Font.HELVETICA, 22, Font.BOLD,   COLOR_WHITE);
    private static final Font FONT_SUBTITLE  = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(191, 219, 254));
    private static final Font FONT_HEADER    = new Font(Font.HELVETICA, 9,  Font.BOLD,   COLOR_GRAY);
    private static final Font FONT_BODY      = new Font(Font.HELVETICA, 10, Font.NORMAL, COLOR_DARK);
    private static final Font FONT_BODY_BOLD = new Font(Font.HELVETICA, 10, Font.BOLD,   COLOR_DARK);
    private static final Font FONT_SMALL     = new Font(Font.HELVETICA, 8,  Font.NORMAL, COLOR_GRAY);
    private static final Font FONT_TOTAL     = new Font(Font.HELVETICA, 13, Font.BOLD,   COLOR_GREEN);
    private static final Font FONT_PAID      = new Font(Font.HELVETICA, 18, Font.BOLD,   COLOR_GREEN);

    public byte[] generateInvoicePdf(Invoice invoice, String adminEmail, String adminName) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            // ── Header ───────────────────────────────────────────────────────
            PdfPTable header = new PdfPTable(2);
            header.setWidthPercentage(100);
            header.setWidths(new float[]{1.5f, 1f});
            header.setSpacingAfter(20);

            // Left: Logo + Company name
            PdfPCell logoCell = new PdfPCell();
            logoCell.setBackgroundColor(COLOR_BLUE);
            logoCell.setPadding(20);
            logoCell.setBorder(Rectangle.NO_BORDER);
            Paragraph brand = new Paragraph("UNITUM", FONT_TITLE);
            brand.setSpacingAfter(4);
            logoCell.addElement(brand);
            logoCell.addElement(new Paragraph("Billing & Subscription Platform", FONT_SUBTITLE));
            header.addCell(logoCell);

            // Right: Invoice info
            PdfPCell infoCell = new PdfPCell();
            infoCell.setBackgroundColor(COLOR_BLUE);
            infoCell.setPadding(20);
            infoCell.setBorder(Rectangle.NO_BORDER);
            infoCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Font fontInvTitle = new Font(Font.HELVETICA, 16, Font.BOLD, COLOR_WHITE);
            Font fontInvSub   = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(191, 219, 254));
            Paragraph invTitle = new Paragraph("INVOICE", fontInvTitle);
            invTitle.setAlignment(Element.ALIGN_RIGHT);
            infoCell.addElement(invTitle);
            Paragraph invNum = new Paragraph(invoice.getInvoiceNumber(), new Font(Font.HELVETICA, 11, Font.BOLD, COLOR_WHITE));
            invNum.setAlignment(Element.ALIGN_RIGHT);
            infoCell.addElement(invNum);
            if (invoice.getPaidAt() != null) {
                Paragraph invDate = new Paragraph("Date: " + invoice.getPaidAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy")), fontInvSub);
                invDate.setAlignment(Element.ALIGN_RIGHT);
                infoCell.addElement(invDate);
            }
            header.addCell(infoCell);
            doc.add(header);

            // ── Billing Info ──────────────────────────────────────────────────
            PdfPTable billingTable = new PdfPTable(2);
            billingTable.setWidthPercentage(100);
            billingTable.setWidths(new float[]{1f, 1f});
            billingTable.setSpacingAfter(20);

            // Bill To
            PdfPCell billToCell = new PdfPCell();
            billToCell.setBorder(Rectangle.NO_BORDER);
            billToCell.setBackgroundColor(COLOR_LIGHT);
            billToCell.setPadding(14);
            billToCell.addElement(new Paragraph("BILL TO", FONT_HEADER));
            billToCell.addElement(new Phrase(" "));
            billToCell.addElement(new Paragraph(invoice.getOrganization().getName(), FONT_BODY_BOLD));
            billToCell.addElement(new Paragraph(adminName != null ? adminName : "", FONT_BODY));
            billToCell.addElement(new Paragraph(adminEmail != null ? adminEmail : "", FONT_BODY));
            billingTable.addCell(billToCell);

            // Invoice details
            PdfPCell detailsCell = new PdfPCell();
            detailsCell.setBorder(Rectangle.NO_BORDER);
            detailsCell.setBackgroundColor(COLOR_LIGHT);
            detailsCell.setPadding(14);
            detailsCell.addElement(new Paragraph("INVOICE DETAILS", FONT_HEADER));
            detailsCell.addElement(new Phrase(" "));
            if (invoice.getSubscription() != null && invoice.getSubscription().getPlan() != null) {
                detailsCell.addElement(new Paragraph("Plan: " + invoice.getSubscription().getPlan().getDisplayName(), FONT_BODY));
            }
            if (invoice.getSubscription() != null) {
                String cycle = invoice.getSubscription().getBillingCycle() != null
                    ? invoice.getSubscription().getBillingCycle().name() : "";
                detailsCell.addElement(new Paragraph("Billing: " + cycle, FONT_BODY));
            }
            if (invoice.getBillingPeriodStart() != null && invoice.getBillingPeriodEnd() != null) {
                detailsCell.addElement(new Paragraph(
                    "Period: " + invoice.getBillingPeriodStart() + " → " + invoice.getBillingPeriodEnd(), FONT_BODY));
            }
            billingTable.addCell(detailsCell);
            doc.add(billingTable);

            // ── Line Items Table ──────────────────────────────────────────────
            PdfPTable itemsTable = new PdfPTable(4);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{3f, 0.7f, 1.3f, 1.3f});
            itemsTable.setSpacingAfter(0);

            // Table headers
            for (String col : new String[]{"DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"}) {
                PdfPCell th = new PdfPCell(new Phrase(col, FONT_HEADER));
                th.setBackgroundColor(COLOR_DARK);
                th.setPadding(10);
                th.setBorder(Rectangle.NO_BORDER);
                Font fth = new Font(Font.HELVETICA, 9, Font.BOLD, COLOR_WHITE);
                th.setPhrase(new Phrase(col, fth));
                int align = col.equals("DESCRIPTION") ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT;
                th.setHorizontalAlignment(align);
                itemsTable.addCell(th);
            }

            // Line items
            List<InvoiceLineItem> items = invoice.getLineItems();
            if (items != null) {
                boolean alt = false;
                for (InvoiceLineItem item : items) {
                    Color rowBg = alt ? COLOR_WHITE : COLOR_LIGHT;
                    alt = !alt;
                    addItemRow(itemsTable, item.getDescription(), 1,
                        item.getUnitPriceCents() / 100.0,
                        item.getTotalPriceCents() / 100.0,
                        invoice.getCurrency(), rowBg,
                        item.getTaxRate() != null && item.getTaxRate() > 0);
                }
            }
            doc.add(itemsTable);

            // ── Totals ────────────────────────────────────────────────────────
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setWidthPercentage(50);
            totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsTable.setWidths(new float[]{1.5f, 1f});
            totalsTable.setSpacingBefore(0);
            totalsTable.setSpacingAfter(24);

            addTotalRow(totalsTable, "Subtotal",
                invoice.getCurrency() + " " + String.format("%.2f", invoice.getSubtotalCents() / 100.0),
                false, COLOR_LIGHT);
            addTotalRow(totalsTable, "VAT " + (int) invoice.getTaxRate().doubleValue() + "%",
                invoice.getCurrency() + " " + String.format("%.2f", invoice.getTaxAmountCents() / 100.0),
                false, COLOR_WHITE);
            addTotalRow(totalsTable, "TOTAL",
                invoice.getCurrency() + " " + String.format("%.2f", invoice.getTotalCents() / 100.0),
                true, new Color(240, 253, 244));
            doc.add(totalsTable);

            // ── Paid stamp ────────────────────────────────────────────────────
            Paragraph paid = new Paragraph("✓  PAID", FONT_PAID);
            paid.setAlignment(Element.ALIGN_RIGHT);
            doc.add(paid);

            // ── Footer ────────────────────────────────────────────────────────
            doc.add(new Chunk(new LineSeparator(0.5f, 100, COLOR_LIGHT, Element.ALIGN_CENTER, -2)));
            Paragraph footer = new Paragraph("Thank you for your business · Unitum Billing · unitumgroup1@gmail.com", FONT_SMALL);
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(6);
            doc.add(footer);

            doc.close();
            log.info("PDF generated for invoice {}", invoice.getInvoiceNumber());
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("PDF generation failed for invoice {}: {}", invoice.getInvoiceNumber(), e.getMessage(), e);
            return new byte[0];
        }
    }

    private void addItemRow(PdfPTable table, String desc, int qty,
                            double unitPrice, double total,
                            String currency, Color bg, boolean isVat) {
        Font font = isVat ? new Font(Font.HELVETICA, 10, Font.NORMAL, COLOR_GRAY) : FONT_BODY;
        String[] values = { desc, String.valueOf(qty),
            currency + " " + String.format("%.2f", unitPrice),
            currency + " " + String.format("%.2f", total) };
        int[] aligns = { Element.ALIGN_LEFT, Element.ALIGN_RIGHT, Element.ALIGN_RIGHT, Element.ALIGN_RIGHT };
        for (int i = 0; i < values.length; i++) {
            PdfPCell cell = new PdfPCell(new Phrase(values[i], font));
            cell.setBackgroundColor(bg);
            cell.setPadding(10);
            cell.setBorderColor(COLOR_LIGHT);
            cell.setBorderWidth(0.5f);
            cell.setHorizontalAlignment(aligns[i]);
            table.addCell(cell);
        }
    }

    private void addTotalRow(PdfPTable table, String label, String value, boolean isBold, Color bg) {
        Font labelFont = isBold ? new Font(Font.HELVETICA, 11, Font.BOLD, COLOR_DARK) : FONT_BODY;
        Font valueFont = isBold ? FONT_TOTAL : FONT_BODY_BOLD;

        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(bg);
        labelCell.setPadding(10);
        labelCell.setBorder(Rectangle.NO_BORDER);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBackgroundColor(bg);
        valueCell.setPadding(10);
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valueCell);
    }
}
