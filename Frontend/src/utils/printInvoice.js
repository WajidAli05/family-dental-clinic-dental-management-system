import jsPDF from "jspdf";
import { drawPdfLetterhead } from "./letterhead";
import { useClinicConfigStore } from "@/store/clinicConfigStore";

/**
 * Itemised invoice PDF.
 *
 * Rewritten from an HTML/window.print() sheet that rendered ONLY the payments
 * table — invoice.items was never referenced, which is why printed invoices
 * showed a bare total. This now mirrors printPrescription.js: jsPDF plus the
 * shared drawPdfLetterhead, re-drawn on every page.
 *
 * LANGUAGE: jsPDF core fonts are WinAnsi-encoded and cannot render Arabic or
 * Urdu glyphs (the same known limitation as the prescription PDF), so every
 * LABEL here is deliberately English. Data values (patient and item names) are
 * printed as stored. On-screen labels remain fully translated.
 */

const BRAND_BLUE = [20, 70, 140];
const INK = 25;
const MUTED = 110;

const BODY_TOP = 52; // below the letterhead rule
const BODY_BOTTOM = 262; // above the letterhead footer divider (277)

const money = (n) => {
  try {
    return useClinicConfigStore.getState().fmt(Number(n) || 0);
  } catch {
    return String(Number(n) || 0);
  }
};

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-GB");
  } catch {
    return String(d);
  }
};

const KIND_LABEL = {
  consultation: "Consultation",
  treatment: "Treatment",
  lab_sample: "Lab",
};

/** Same rule the server uses: paid >= total => Paid. */
const statusOf = (total, paid) => {
  if (paid >= total && total > 0) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
};

export const printInvoice = (invoice) => {
  if (!invoice) return;

  let cfg = {};
  try {
    cfg = useClinicConfigStore.getState() || {};
  } catch {
    cfg = {};
  }

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];

  // totalAmount is the authoritative figure payments settle against. It is
  // never recomputed here, so the PDF cannot disagree with the ledger.
  const totalAmount = Number(invoice.totalAmount ?? invoice.total ?? 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, totalAmount - totalPaid);

  const patientName =
    invoice.patientName || invoice.patient?.name || invoice.patient || "-";
  const patientId =
    invoice.patientId ||
    invoice.patient?.publicId ||
    (invoice.mr != null ? `MR ${invoice.mr}` : "");
  const dentistName = invoice.dentistName || invoice.dentist?.name || "";

  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;

  drawPdfLetterhead(doc);
  let y = BODY_TOP;

  /** New page when the next block would not fit, letterhead on every page. */
  const ensureSpace = (needed) => {
    if (y + needed <= BODY_BOTTOM) return;
    doc.addPage();
    drawPdfLetterhead(doc);
    y = BODY_TOP;
  };

  const sectionHeading = (label) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLUE);
    doc.text(label.toUpperCase(), margin, y);
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 1.6, pageW - margin, y + 1.6);
    doc.setTextColor(0);
    y += 7;
  };

  // ── Title + status chip ───────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("INVOICE", margin, y);

  // A voided invoice must be unmistakable on paper.
  const isVoid = !!invoice.isVoid || !!invoice.voidedAt;
  const status = isVoid ? "VOID" : statusOf(totalAmount, totalPaid);
  const chipW = 26;
  const chipX = pageW - margin - chipW;
  const chipColor =
    status === "VOID" ? [90, 90, 90]
      : status === "PAID" ? [39, 174, 96]
      : status === "PARTIAL" ? [214, 154, 26]
      : [192, 57, 43];
  doc.setFillColor(...chipColor);
  doc.roundedRect(chipX, y - 5, chipW, 7, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255);
  doc.text(status, chipX + chipW / 2, y - 0.3, { align: "center" });
  doc.setTextColor(0);
  y += 8;

  // ── Meta block ────────────────────────────────────────────────────────────
  const metaLeft = [
    ["Invoice No", invoice.id || invoice.publicId || "-"],
    ["Date", fmtDate(invoice.date)],
  ];
  const metaRight = [
    ["Patient", patientId ? `${patientName} (${patientId})` : String(patientName)],
    ...(dentistName ? [["Dentist", dentistName]] : []),
    // Legacy invoices carry no schedule id — they were quoted at the default.
    ["Fee Schedule", invoice.feeScheduleName || "Default"],
    ...(isVoid && invoice.voidReason ? [["Void Reason", String(invoice.voidReason)]] : []),
  ];

  const metaRows = Math.max(metaLeft.length, metaRight.length);
  ensureSpace(metaRows * 5 + 6);
  const metaX = [margin, margin + contentW / 2];
  doc.setFontSize(9);
  for (let i = 0; i < metaRows; i++) {
    [metaLeft[i], metaRight[i]].forEach((pair, c) => {
      if (!pair) return;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(MUTED);
      doc.text(`${pair[0]}:`, metaX[c], y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(INK);
      const labelW = doc.getTextWidth(`${pair[0]}:`) + 2;
      const val = doc.splitTextToSize(String(pair[1]), contentW / 2 - labelW - 4)[0] || "-";
      doc.text(val, metaX[c] + labelW, y);
    });
    y += 5;
  }
  doc.setTextColor(0);
  y += 3;

  // ── Itemised table ────────────────────────────────────────────────────────
  const cw = [
    contentW * 0.4,
    contentW * 0.16,
    contentW * 0.18,
    contentW * 0.08,
    contentW * 0.18,
  ];
  const cx = [];
  cw.reduce((acc, w, i) => {
    cx[i] = acc;
    return acc + w;
  }, margin);

  const headerRow = () => {
    ensureSpace(10);
    doc.setFillColor(240, 244, 249);
    doc.rect(margin, y - 4.6, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("DESCRIPTION", cx[0] + 1.5, y);
    doc.text("TYPE", cx[1] + 1.5, y);
    doc.text("UNIT PRICE", cx[2] + cw[2] - 1.5, y, { align: "right" });
    doc.text("QTY", cx[3] + cw[3] - 1.5, y, { align: "right" });
    doc.text("LINE TOTAL", cx[4] + cw[4] - 1.5, y, { align: "right" });
    doc.setTextColor(0);
    y += 6;
  };

  sectionHeading("Items");

  if (items.length === 0) {
    // BACKWARD-COMPAT: legacy invoices carry no items, so print the single
    // stored total as one line rather than an empty table.
    headerRow();
    ensureSpace(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(INK);
    doc.text("Invoice total (no itemised breakdown recorded)", cx[0] + 1.5, y);
    doc.setTextColor(MUTED);
    doc.text("-", cx[1] + 1.5, y);
    doc.setTextColor(INK);
    doc.text(money(totalAmount), cx[2] + cw[2] - 1.5, y, { align: "right" });
    doc.text("1", cx[3] + cw[3] - 1.5, y, { align: "right" });
    doc.text(money(totalAmount), cx[4] + cw[4] - 1.5, y, { align: "right" });
    y += 6;
    doc.setDrawColor(232);
    doc.setLineWidth(0.15);
    doc.line(margin, y - 2.5, pageW - margin, y - 2.5);
    doc.setTextColor(0);
  } else {
    headerRow();
    doc.setFontSize(8.5);

    for (const it of items) {
      const unit = Number(it.unitPrice) || 0;
      const qty = Number(it.qty) || 1;
      const line = it.lineTotal != null ? Number(it.lineTotal) : unit * qty;

      const nameLines = doc.splitTextToSize(String(it.name || "-"), cw[0] - 3);
      const rowH = Math.max(nameLines.length * 4, 5) + 2;

      // A row that would cross the bottom starts a fresh page WITH the
      // letterhead and the column header repeated.
      if (y + rowH + 4 > BODY_BOTTOM) {
        doc.addPage();
        drawPdfLetterhead(doc);
        y = BODY_TOP;
        sectionHeading("Items (continued)");
        headerRow();
        doc.setFontSize(8.5);
      }

      doc.setFont("helvetica", "normal");
      doc.setTextColor(INK);
      doc.text(nameLines, cx[0] + 1.5, y);

      doc.setTextColor(MUTED);
      doc.text(KIND_LABEL[it.kind] || String(it.kind || "-"), cx[1] + 1.5, y);

      doc.setTextColor(INK);
      doc.text(money(unit), cx[2] + cw[2] - 1.5, y, { align: "right" });
      doc.text(String(qty), cx[3] + cw[3] - 1.5, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(money(line), cx[4] + cw[4] - 1.5, y, { align: "right" });

      y += rowH;
      doc.setDrawColor(232);
      doc.setLineWidth(0.15);
      doc.line(margin, y - 2.5, pageW - margin, y - 2.5);
    }
    doc.setTextColor(0);
  }

  y += 4;

  // ── Totals block ──────────────────────────────────────────────────────────
  // The stored totalAmount is the authoritative Total: it is what payments
  // settle against and what billing.js aggregates. When tax is enabled it is
  // therefore presented as TAX-INCLUSIVE (subtotal derived back out of the
  // total) rather than added on top, which would make the printed total
  // disagree with the ledger.
  const taxEnabled = !!cfg.taxEnabled && Number(cfg.taxRate) > 0;
  const taxRate = Number(cfg.taxRate) || 0;
  const subtotal = taxEnabled ? totalAmount / (1 + taxRate / 100) : totalAmount;
  const taxAmount = taxEnabled ? totalAmount - subtotal : 0;

  const totalRows = [
    ["Subtotal", money(subtotal), false],
    ...(taxEnabled
      ? [[`${cfg.taxLabel || "Tax"} (${taxRate}%, incl.)`, money(taxAmount), false]]
      : []),
    ["Total", money(totalAmount), true],
    ["Amount Paid", money(totalPaid), false],
    ["Balance Due", money(balance), true],
  ];

  const boxW = 78;
  const boxX = pageW - margin - boxW;
  ensureSpace(totalRows.length * 6 + 8);

  doc.setDrawColor(221, 227, 236);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, y - 4.5, boxW, totalRows.length * 6 + 2, 1.5, 1.5, "S");

  totalRows.forEach(([label, value, strong], i) => {
    const ry = y + i * 6;
    if (label === "Balance Due") {
      doc.setFillColor(240, 244, 249);
      doc.rect(boxX + 0.4, ry - 4.2, boxW - 0.8, 6, "F");
    }
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.setFontSize(strong ? 9 : 8.5);
    doc.setTextColor(strong ? INK : MUTED);
    doc.text(label, boxX + 3, ry);

    if (label === "Balance Due") {
      doc.setTextColor(...(balance > 0 ? [192, 57, 43] : [39, 174, 96]));
    } else {
      doc.setTextColor(INK);
    }
    doc.text(value, boxX + boxW - 3, ry, { align: "right" });
  });
  doc.setTextColor(0);
  y += totalRows.length * 6 + 6;

  // ── Payment history ───────────────────────────────────────────────────────
  if (payments.length > 0) {
    sectionHeading("Payment History");
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("DATE", margin + 1.5, y);
    doc.text("METHOD", margin + contentW * 0.34, y);
    doc.text("AMOUNT", pageW - margin - 1.5, y, { align: "right" });
    doc.setTextColor(0);
    y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (const p of payments) {
      ensureSpace(7);
      doc.setTextColor(INK);
      doc.text(fmtDate(p.date), margin + 1.5, y);
      doc.text(String(p.mode || p.method || "-"), margin + contentW * 0.34, y);
      doc.text(money(p.amount), pageW - margin - 1.5, y, { align: "right" });
      y += 5;
      doc.setDrawColor(238);
      doc.setLineWidth(0.15);
      doc.line(margin, y - 2.4, pageW - margin, y - 2.4);
    }
    doc.setTextColor(0);
  }

  // ── Page numbering ────────────────────────────────────────────────────────
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    if (isVoid) {
      // Drawn last so it sits over the content, at low opacity where the
      // renderer supports it (older jsPDF builds simply skip the GState).
      try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.12 })); } catch { /* no alpha support */ }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(72);
      doc.setTextColor(200, 0, 0);
      doc.text("VOID", pageW / 2, 150, { align: "center", angle: 30 });
      try { doc.restoreGraphicsState(); } catch { /* no-op */ }
      doc.setTextColor(0);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, 272, { align: "right" });
  }
  doc.setTextColor(0);

  const safeId = String(invoice.id || invoice.publicId || "invoice").replace(/[^\w-]+/g, "_");
  const safeDate = invoice.date || new Date().toISOString().slice(0, 10);
  doc.save(`Invoice_${safeId}_${safeDate}.pdf`);
};
