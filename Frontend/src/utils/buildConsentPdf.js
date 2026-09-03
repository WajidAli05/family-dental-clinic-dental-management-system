import jsPDF from "jspdf";
import { drawPdfLetterhead } from "./letterhead";

/**
 * Generates the signed consent PDF — the human/legal artifact.
 *
 * Produced in the BROWSER so the backend needs no PDF library: jsPDF is
 * already a frontend dependency (printPrescription, printInvoice), and the
 * result is posted to the server through the same multipart upload path as any
 * other document.
 *
 * LANGUAGE: English only. jsPDF core fonts are WinAnsi-encoded and cannot
 * render Arabic or Urdu glyphs — the same known limitation as the prescription
 * and invoice PDFs. When staff reviewed the consent on screen in Urdu or
 * Arabic, `displayLanguage` is printed in the header so the signed artifact
 * states which wording the patient actually read, and the UI warns them.
 */

const BRAND_BLUE = [20, 70, 140];
const INK = 25;
const MUTED = 110;
const BODY_TOP = 52;
const BODY_BOTTOM = 262;

const LANG_LABEL = { en: "English", ur: "Urdu", ar: "Arabic" };

const fmtDateTime = (d) => {
  try { return new Date(d).toLocaleString("en-GB"); } catch { return String(d); }
};

/**
 * @returns {Blob} the consent PDF
 */
export function buildConsentPdf({
  clinicPatientName, patientId, patientDob = "",
  procedureLabel, consentText,
  displayLanguage = "en",
  englishText = "",
  signedByName, signedByRole = "patient", signatureMethod = "drawn",
  signatureDataUrl = "",
  witnessName = "",
  signedAt = new Date(),
  consentRef = "",
}) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;

  drawPdfLetterhead(doc);
  let y = BODY_TOP;

  const ensureSpace = (needed) => {
    if (y + needed <= BODY_BOTTOM) return;
    doc.addPage();
    drawPdfLetterhead(doc);
    y = BODY_TOP;
  };

  const heading = (label) => {
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

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("INFORMED CONSENT", margin, y);
  doc.setTextColor(0);
  y += 8;

  // ── Meta ──
  const meta = [
    ["Patient", patientId ? `${clinicPatientName} (${patientId})` : String(clinicPatientName || "-")],
    ["Procedure", procedureLabel || "-"],
    ["Date", fmtDateTime(signedAt)],
    ...(patientDob ? [["Date of Birth", patientDob]] : []),
    ...(consentRef ? [["Reference", consentRef]] : []),
  ];
  ensureSpace(meta.length * 5 + 6);
  doc.setFontSize(9);
  for (const [k, v] of meta) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MUTED);
    doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(INK);
    const w = doc.getTextWidth(`${k}:`) + 2;
    doc.text(doc.splitTextToSize(String(v), contentW - w)[0] || "-", margin + w, y);
    y += 5;
  }
  doc.setTextColor(0);
  y += 3;

  // If the patient read a non-English version, say so on the artifact itself.
  if (displayLanguage && displayLanguage !== "en") {
    ensureSpace(12);
    doc.setFillColor(255, 248, 225);
    doc.setDrawColor(240, 200, 120);
    doc.roundedRect(margin, y - 4, contentW, 9, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(140, 90, 10);
    doc.text(
      `Reviewed with the patient in ${LANG_LABEL[displayLanguage] || displayLanguage}. English text of the same consent follows.`,
      margin + 3, y + 1.5
    );
    doc.setTextColor(0);
    y += 12;
  }

  // ── Consent wording ──
  heading("Consent");
  // Always print the ENGLISH wording — the PDF cannot render Urdu/Arabic
  // glyphs, so printing them would produce unreadable boxes on a legal record.
  const printable = displayLanguage === "en" ? consentText : (englishText || consentText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(INK);
  for (const line of doc.splitTextToSize(String(printable || ""), contentW)) {
    ensureSpace(6);
    doc.text(line, margin, y);
    y += 4.6;
  }
  doc.setTextColor(0);
  y += 5;

  // ── Signature ──
  heading("Signature");
  ensureSpace(46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(signedByRole === "guardian" ? "Signed by (guardian):" : "Signed by (patient):", margin, y);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.text(String(signedByName || "-"), margin + 42, y);
  y += 6;

  if (signatureMethod === "drawn" && signatureDataUrl) {
    try {
      // Drawn on a white ground by SignaturePad, so it composites cleanly.
      doc.addImage(signatureDataUrl, "PNG", margin, y, 70, 26);
    } catch {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("[signature image could not be embedded]", margin, y + 10);
    }
    y += 28;
  } else {
    // Typed fallback — recorded as such, never presented as a drawn signature.
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(INK);
    doc.text(String(signedByName || ""), margin + 2, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED);
    doc.text("(typed signature)", margin + 2, y + 13);
    y += 18;
  }

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 70, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(`Signed at ${fmtDateTime(signedAt)}`, margin, y);
  y += 5;
  if (witnessName) {
    doc.text(`Witnessed by ${witnessName}`, margin, y);
    y += 5;
  }
  doc.setTextColor(0);

  // ── Page numbering ──
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, 272, { align: "right" });
  }
  doc.setTextColor(0);

  return doc.output("blob");
}
