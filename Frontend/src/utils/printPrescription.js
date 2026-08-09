import jsPDF from "jspdf";
import { drawPdfLetterhead, drawPdfDentistFooterPanel } from "./letterhead";

const BRAND_BLUE = [20, 70, 140];
const INK        = 25;
const MUTED      = 110;
const RULE       = 205;

// Vertical budget on the A4 page. The dentist roster panel starts at y=247 and
// the address footer at y=277 (see letterhead.js), so body content must stop
// before the signature block at y=232.
const BODY_TOP    = 52;
const BODY_BOTTOM = 214;

const FOOD_LABEL = { before: "before food", after: "after food", with: "with food", any: "" };

const fmtDate = (d) => {
  if (!d) return new Date().toLocaleDateString("en-PK");
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-PK"); } catch { return String(d); }
};

/** "1+0+1" from either explicit m/n/e counts or a stored dose string. */
const doseTriplet = (med) => {
  const parts = String(med.dose || "0+0+0").split("+");
  const m = med.m !== undefined ? (med.m | 0) : parseInt(parts[0]) || 0;
  const n = med.n !== undefined ? (med.n | 0) : parseInt(parts[1]) || 0;
  const e = med.e !== undefined ? (med.e | 0) : parseInt(parts[2]) || 0;
  return `${m}+${n}+${e}`;
};

export const printPrescription = (data) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;

  drawPdfLetterhead(doc);
  let y = BODY_TOP;

  /** Start a new page when the next block wouldn't fit, keeping the
   *  letterhead + roster panel on every page. */
  const ensureSpace = (needed) => {
    if (y + needed <= BODY_BOTTOM) return;
    drawPdfDentistFooterPanel(doc);
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

  const pair = (label, value, x, colW) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(INK);
    doc.text(doc.splitTextToSize(String(value || "—"), colW)[0], x, y + 4.6);
    doc.setTextColor(0);
  };

  // ════════ SUPERSCRIPTION — prescriber (left) + date (right) ════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text(data.dentistName || "—", margin, y);

  const subBits = [data.dentistSpecialization, data.dentistRegNo ? `Reg. No: ${data.dentistRegNo}` : ""]
    .filter(Boolean);
  if (subBits.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(subBits.join("  ·  "), margin, y + 4.5);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text("DATE", pageW - margin, y, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text(fmtDate(data.date), pageW - margin, y + 4.6, { align: "right" });
  doc.setTextColor(0);
  y += subBits.length ? 11 : 9;

  // ════════ PATIENT BLOCK ════════
  ensureSpace(20);
  doc.setDrawColor(RULE);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, 15, 1.5, 1.5);

  const cols = 4;
  const colW = contentW / cols;
  const innerY = y + 5;
  const savedY = y;
  y = innerY;

  const dobOrAge = data.patientDob
    ? `${data.patientAge || "—"} (${data.patientDob})`
    : (data.patientAge !== "" && data.patientAge != null ? String(data.patientAge) : "—");

  pair("PATIENT NAME", data.patientName || data.name, margin + 3, colW - 6);
  pair("PATIENT ID",   data.patientId,                margin + colW + 3, colW - 6);
  pair("AGE / DOB",    dobOrAge,                      margin + colW * 2 + 3, colW - 6);
  pair("GENDER",       data.patientGender,            margin + colW * 3 + 3, colW - 6);

  y = savedY + 15 + 7;

  // ════════ CLINICAL SECTION — per-tooth (FDI) table ════════
  const toothEntries = Array.isArray(data.toothEntries) ? data.toothEntries : [];

  if (toothEntries.length) {
    sectionHeading("Clinical Findings — FDI Tooth Notation");

    // Column geometry: Tooth | Diagnosis | Treatment | Finding | X-Ray
    const cw = [16, (contentW - 16 - 14) * 0.34, (contentW - 16 - 14) * 0.33, (contentW - 16 - 14) * 0.33, 14];
    const cx = [];
    cw.reduce((acc, w, i) => { cx[i] = margin + acc; return acc + w; }, 0);

    const headerRow = () => {
      doc.setFillColor(243, 246, 250);
      doc.rect(margin, y - 4, contentW, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(90);
      ["TOOTH", "DIAGNOSIS", "TREATMENT", "CLINICAL FINDING", "X-RAY"].forEach((h, i) => {
        doc.text(h, cx[i] + 1.5, y);
      });
      doc.setTextColor(0);
      y += 6;
    };
    headerRow();

    doc.setFontSize(8.5);
    for (const e of toothEntries) {
      const cells = [
        [String(e.toothNumber || "—")],
        doc.splitTextToSize(e.diagnosis || "—", cw[1] - 3),
        doc.splitTextToSize(e.treatment || "—", cw[2] - 3),
        doc.splitTextToSize([e.clinicalFinding, e.note].filter(Boolean).join(" · ") || "—", cw[3] - 3),
        [e.xrayRequested ? "YES" : "—"],
      ];
      const rowH = Math.max(...cells.map((c) => c.length)) * 4 + 3;

      ensureSpace(rowH + 4);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(INK);
      doc.text(cells[0], cx[0] + 1.5, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      doc.text(cells[1], cx[1] + 1.5, y);
      doc.text(cells[2], cx[2] + 1.5, y);
      doc.text(cells[3], cx[3] + 1.5, y);

      // X-ray flag stands out — it is an actionable request
      if (e.xrayRequested) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_BLUE);
      }
      doc.text(cells[4], cx[4] + 1.5, y);
      doc.setTextColor(0);

      y += rowH;
      doc.setDrawColor(232);
      doc.setLineWidth(0.15);
      doc.line(margin, y - 2.5, pageW - margin, y - 2.5);
    }

    // X-ray requests called out again so they are not missed on a busy chart
    const xrayTeeth = toothEntries.filter((e) => e.xrayRequested);
    if (xrayTeeth.length) {
      ensureSpace(10);
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND_BLUE);
      doc.text("X-ray requested:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      const txt = xrayTeeth
        .map((e) => `${e.toothNumber}${e.xrayNote ? ` (${e.xrayNote})` : ""}`)
        .join(", ");
      doc.text(doc.splitTextToSize(txt, contentW - 32), margin + 30, y);
      doc.setTextColor(0);
      y += 7;
    }
    y += 3;
  } else {
    // ── Legacy fallback: pre-tooth-based prescriptions ──
    sectionHeading("Clinical Findings");
    const legacyRow = (label, value) => {
      ensureSpace(8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(MUTED);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(INK);
      const wrapped = doc.splitTextToSize(String(value || "—"), contentW - 42);
      doc.text(wrapped, margin + 42, y);
      doc.setTextColor(0);
      y += Math.max(7, wrapped.length * 5);
    };
    legacyRow("DIAGNOSIS", data.diagnosis);
    legacyRow("TREATMENT", data.treatment);
    legacyRow("CLINICAL FINDING", data.clinicalFinding);

    const teeth = Array.isArray(data.selectedTeeth) ? data.selectedTeeth : [];
    if (teeth.length) legacyRow("TEETH", teeth.join(", "));
    y += 3;
  }

  // ════════ Rx — GENERAL MEDICATIONS ════════
  // NOTE: the ℞ glyph (U+211E) is not in jsPDF's WinAnsi core-font encoding
  // and renders as mojibake, so the conventional "Rx" ligature styling is
  // used instead.
  ensureSpace(16);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("Rx", margin, y + 2);
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.4);
  doc.line(margin + 13, y + 1.6, pageW - margin, y + 1.6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("MEDICATIONS", margin + 16, y);
  doc.setTextColor(0);
  y += 9;

  const meds = Array.isArray(data.medications) ? data.medications : [];

  if (meds.length) {
    meds.forEach((med, i) => {
      ensureSpace(14);

      // Inscription — drug, strength, formulation
      const nameStr =
        `${med.name || "—"}` +
        (med.strength ? ` ${med.strength}` : "") +
        (med.form ? ` (${med.form})` : "");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(INK);
      doc.text(`${i + 1}.  ${nameStr}`, margin + 2, y);
      y += 4.8;

      // Subscription / transcription — dose, frequency, duration, directions
      const sig = [
        `Sig: ${doseTriplet(med)}`,
        med.durationDays ? `for ${med.durationDays} day(s)` : "",
        FOOD_LABEL[med.withFood] || "",
        med.instructions || "",
      ].filter(Boolean).join("  ·  ");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(75);
      const wrapped = doc.splitTextToSize(sig, contentW - 10);
      doc.text(wrapped, margin + 8, y);
      doc.setTextColor(0);
      y += wrapped.length * 4.4 + 3.5;
    });
  } else {
    // Ruled lines so medications can be written by hand on the printout
    doc.setDrawColor(215);
    doc.setLineWidth(0.2);
    for (let i = 0; i < 3; i++) doc.line(margin + 2, y + i * 9, pageW - margin, y + i * 9);
    y += 30;
  }

  // ════════ ADVICE / NOTES ════════
  if (data.notes) {
    ensureSpace(14);
    y += 2;
    sectionHeading("Advice / Notes");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55);
    const wrapped = doc.splitTextToSize(String(data.notes), contentW);
    doc.text(wrapped, margin, y);
    doc.setTextColor(0);
    y += wrapped.length * 4.6;
  }

  // ════════ SIGNATURE — fixed position on the final page ════════
  const sigY = 232;
  doc.setDrawColor(150);
  doc.setLineWidth(0.3);
  doc.line(pageW - margin - 62, sigY, pageW - margin, sigY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(INK);
  doc.text(data.dentistName || "Doctor Signature", pageW - margin, sigY + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  const sigSub = [data.dentistSpecialization, data.dentistRegNo ? `Reg. No: ${data.dentistRegNo}` : ""]
    .filter(Boolean).join("  ·  ");
  if (sigSub) doc.text(sigSub, pageW - margin, sigY + 9.5, { align: "right" });
  doc.text("Signature & Stamp", pageW - margin - 62, sigY + 5);
  doc.setTextColor(0);

  drawPdfDentistFooterPanel(doc);

  const safeId = String(data.patientId || "RX").replace(/[^\w-]/g, "");
  doc.save(`Prescription_${safeId}_${(data.date || new Date().toISOString().slice(0, 10))}.pdf`);
};
