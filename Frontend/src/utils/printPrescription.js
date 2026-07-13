import jsPDF from "jspdf";
import { drawPdfLetterhead, drawPdfDentistFooterPanel } from "./letterhead";

const BRAND_BLUE = [20, 70, 140];

const QUADRANTS = ["Q1", "Q2", "Q3", "Q4"];

const groupSelectedTeeth = (selectedTeeth = []) => {
  const grouped = { Q1: [], Q2: [], Q3: [], Q4: [] };
  selectedTeeth.forEach((item) => {
    const match = String(item).match(/^(Q[1-4])-T(\d+)$/);
    if (!match) return;
    const q = match[1];
    const t = Number(match[2]);
    if (Number.isFinite(t)) grouped[q].push(t);
  });
  QUADRANTS.forEach((q) => grouped[q].sort((a, b) => a - b));
  return grouped;
};

const formatTeethLines = (arr, perLine = 4) => {
  if (!arr?.length) return ["-"];
  const lines = [];
  for (let i = 0; i < arr.length; i += perLine) {
    lines.push(arr.slice(i, i + perLine).join(", "));
  }
  return lines;
};

const labelValue = (doc, label, value, xLabel, xValue, y) => {
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(label, xLabel, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25);
  doc.text(String(value || "-"), xValue, y);
  doc.setTextColor(0);
};

export const printPrescription = (data) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;

  // ===== LETTERHEAD (from shared source) =====
  drawPdfLetterhead(doc);

  // ===== PATIENT INFO LINE =====
  let y = 53;

  // Fixed value column shared with the body rows below
  const VALUE_X = margin + 58;
  const BODY_LH  = 9; // mm between baselines, used for all body rows

  const patientDisplay = data?.patientName || data?.name || "";
  labelValue(doc, "Name:", patientDisplay, margin, VALUE_X, y);

  // Date + Patient ID — same font size, combined into one right-aligned string
  // so they can never overlap each other regardless of ID length.
  const dateDisplay = data?.date
    ? new Date(data.date + "T00:00:00").toLocaleDateString("en-PK")
    : new Date().toLocaleDateString("en-PK");
  const rightInfo = data?.patientId
    ? `ID: ${data.patientId}   ${dateDisplay}`
    : dateDisplay;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text(rightInfo, pageW - margin, y, { align: "right" });

  doc.setTextColor(0);

  // ===== Rx HEADING — section marker before clinical body =====
  y += 8;
  doc.setFont("times", "bolditalic");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("Rx", margin, y);
  // subtle underline
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.5, margin + doc.getTextWidth("Rx") + 1, y + 1.5);
  doc.setTextColor(0);
  y += 8;

  // ===== CLINICAL BODY FIELDS =====
  const row = (label, value) => {
    labelValue(doc, `${label}:`, value, margin, VALUE_X, y);
    y += BODY_LH;
  };

  row("Patient Type",     data.patientType);
  row("Diagnosis",        data.diagnosis);
  row("Treatment",        data.treatment);
  row("Clinical Findings",data.clinicalFinding);
  row("Treatment Status", data.visualStatus);

  // ===== SELECTED TEETH — label left + quadrant box top-right =====
  y += 4;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60);
  doc.text("Selected Teeth:", margin, y);
  doc.setTextColor(0);

  const grouped = groupSelectedTeeth(data.selectedTeeth || []);

  const boxW = (pageW - margin * 2) * 0.38;
  const boxH = 30;
  const boxX = pageW - margin - boxW;
  const boxY = y - 12;

  doc.setDrawColor(210);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2);
  doc.line(boxX + boxW / 2, boxY, boxX + boxW / 2, boxY + boxH);
  doc.line(boxX, boxY + boxH / 2, boxX + boxW, boxY + boxH / 2);

  doc.setFontSize(7);
  doc.setTextColor(90);
  const pad = 2;
  const qW = boxW / 2;
  const qH = boxH / 2;

  const drawQuadrant = (qKey, qx, qy) => {
    doc.setFont("helvetica", "bold");
    doc.text(qKey, qx + pad, qy + pad + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const lines = formatTeethLines(grouped[qKey], 2);
    const startY = qy + pad + 7;
    doc.text(lines[0] ?? "-", qx + pad, startY);
    doc.text(lines[1] ?? "",  qx + pad, startY + 4);
    doc.setTextColor(90);
  };

  drawQuadrant("Q1", boxX,      boxY);
  drawQuadrant("Q2", boxX + qW, boxY);
  drawQuadrant("Q3", boxX,      boxY + qH);
  drawQuadrant("Q4", boxX + qW, boxY + qH);
  doc.setTextColor(0);

  y = Math.max(y + 6, boxY + boxH + 10);

  // ===== NOTES =====
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60);
  doc.text("Notes:", margin, y);
  doc.setTextColor(0);
  y += BODY_LH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40);
  const bodyW = pageW - margin * 2;
  doc.text(data.notes || "-", margin, y, { maxWidth: bodyW });

  // ===== MEDICATIONS =====
  const meds = Array.isArray(data.medications) ? data.medications : [];

  // Always render the Medications section header so there is space to write by hand
  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60);
  doc.text("Medications:", margin, y);
  doc.setTextColor(0);
  y += BODY_LH;

  if (meds.length > 0) {
    const FOOD_LABEL = { before: "before food", after: "after food", with: "with food" };

    meds.forEach((med, i) => {
      if (y > 232) {
        doc.addPage();
        drawPdfLetterhead(doc);
        drawPdfDentistFooterPanel(doc);
        y = 53;
      }

      const m = med.m !== undefined ? (med.m | 0) : parseInt(String(med.dose || "0").split("+")[0]) || 0;
      const n = med.n !== undefined ? (med.n | 0) : parseInt(String(med.dose || "0+0").split("+")[1]) || 0;
      const e = med.e !== undefined ? (med.e | 0) : parseInt(String(med.dose || "0+0+0").split("+")[2]) || 0;

      const nameStr  = med.name + (med.strength ? ` ${med.strength}` : "") + (med.form ? ` (${med.form})` : "");
      const doseStr  = `${m}+${n}+${e}` + (med.durationDays ? ` × ${med.durationDays} days` : "");
      const foodStr  = FOOD_LABEL[med.withFood] ? `, ${FOOD_LABEL[med.withFood]}` : "";
      const instrStr = med.instructions ? ` — ${med.instructions}` : "";

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25);
      doc.text(`${i + 1}. ${nameStr}`, margin, y);
      y += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text(`   ${doseStr}${foodStr}${instrStr}`, margin, y);
      y += 6;
    });
  } else {
    // blank lines for hand-written medications
    doc.setDrawColor(210);
    doc.setLineWidth(0.2);
    for (let i = 0; i < 3; i++) {
      doc.line(margin, y + i * 10, pageW - margin, y + i * 10);
    }
    y += 32;
  }

  // ===== SIGNATURE =====
  const sigY = 235;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY, margin + 70, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Doctor Signature", margin, sigY + 6);

  // ===== DENTIST ROSTER PANEL (prescription only, last page) =====
  drawPdfDentistFooterPanel(doc);

  // ===== SAVE =====
  doc.save(`Prescription_${new Date().toISOString().split("T")[0]}.pdf`);
};
