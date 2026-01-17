import jsPDF from "jspdf";

const QUADRANTS = ["Q1", "Q2", "Q3", "Q4"];

/**
 * selectedTeeth values are like: "Q1-T1"
 * We print them grouped by quadrant, with 4 teeth per line.
 */
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

// --- Letterhead helpers (matches the photo layout) ---
const BRAND_BLUE = [20, 70, 140]; // close to the printed blue

const drawSimpleLogo = (doc, x, y) => {
  // A simple “people + tooth” mark (vector-ish, no external images needed)
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.6);

  // heads
  doc.circle(x + 6, y + 4, 2, "S");
  doc.circle(x + 14, y + 4, 2, "S");

  // bodies / arms
  doc.line(x + 6, y + 6.5, x + 10, y + 10);
  doc.line(x + 14, y + 6.5, x + 10, y + 10);

  // tooth-ish outline
  doc.setLineWidth(0.7);
  doc.roundedRect(x + 7.2, y + 8, 5.6, 7.5, 2, 2, "S");
  doc.line(x + 10, y + 10.2, x + 10, y + 14.6);
};

const drawLetterhead = (doc) => {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;

  // Left: logo + clinic name
  drawSimpleLogo(doc, margin, 12);

  doc.setTextColor(...BRAND_BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FAMILY DENTAL CLINIC", margin + 22, 22);

  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(120);
  doc.text("Spreading Smile", margin + 22, 29);

  // Right: doctor block
  const rightX = pageW - margin;
  doc.setTextColor(30);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text("DR. SAIFULLAH", rightX, 20, { align: "right" });

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  const creds = [
    "BDS, RDS",
    "MCPS (PERIODONTOLOGY PGT)",
    "MSC (PERIODONTOLOGY PGT)",
    "IMPLANTS (USA TATUM) DIPLOMA",
    "MEMBER OF AMERICAN DENTAL ASSOCIATION",
  ];

  let cy = 25;
  creds.forEach((line) => {
    doc.text(line, rightX, cy, { align: "right" });
    cy += 4;
  });

  // Light top divider (very subtle like printed paper)
  doc.setDrawColor(230);
  doc.setLineWidth(0.3);
  doc.line(margin, 36, pageW - margin, 36);

  // Footer (address + contact)
  const footerY = 285; // A4 in mm is 297, keep some bottom padding
  doc.setDrawColor(200);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 8, pageW - margin, footerY - 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    "Address: House # 09, Main Harlay Street Rawalpindi Cantt.",
    pageW / 2,
    footerY - 2,
    { align: "center" }
  );
  doc.text("Contact No: 0335-3400001", pageW / 2, footerY + 3, {
    align: "center",
  });

  // Reset body defaults
  doc.setTextColor(0);
};

const labelValue = (doc, label, value, xLabel, xValue, y) => {
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70);
  doc.text(label, xLabel, y);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20);
  doc.text(String(value || "-"), xValue, y);

  doc.setTextColor(0);
};

export const printPrescription = (data) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;

  // ===== Letterhead (matches your photo layout) =====
  drawLetterhead(doc);

  // ===== Top row: Name (left) + Date (right) =====
  let y = 50;

  doc.setFontSize(12);
  labelValue(doc, "Name:", data?.patientName || data?.name, margin, margin + 18, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(
    new Date().toLocaleDateString(),
    pageW - margin,
    y,
    { align: "right" }
  );
  doc.setTextColor(0);

  y += 10;

  // ===== Body fields (clean, form-replaced) =====
  const row = (label, value) => {
    labelValue(doc, `${label}:`, value, margin, margin + 50, y);
    y += 8;
  };

  row("Patient Type", data.patientType);
  row("Diagnosis", data.diagnosis);
  row("Treatment", data.treatment);
  row("Clinical Findings", data.clinicalFinding);
  row("Treatment Status", data.visualStatus);

  // ===== Selected Teeth (quadrant box like your new UI) =====
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(70);
  doc.text("Selected Teeth:", margin, y);
  y += 5;

  const grouped = groupSelectedTeeth(data.selectedTeeth || []);

  const boxX = margin;
  const boxY = y;
  const boxW = pageW - margin * 2;
  const boxH = 46;

  // thin + light grey (as requested)
  doc.setDrawColor(210);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2.5, 2.5);

  // center cross
  doc.line(boxX + boxW / 2, boxY, boxX + boxW / 2, boxY + boxH);
  doc.line(boxX, boxY + boxH / 2, boxX + boxW, boxY + boxH / 2);

  // quadrant labels + 4-per-line teeth
  doc.setFontSize(10);
  doc.setTextColor(90);

  const pad = 4;
  const qW = boxW / 2;
  const qH = boxH / 2;

  const drawQuadrant = (qKey, qx, qy) => {
    doc.setFont("helvetica", "bold");
    doc.text(qKey, qx + pad, qy + pad + 2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);

    const lines = formatTeethLines(grouped[qKey], 4);
    const startY = qy + pad + 8;

    // 2 lines max fits nicely (8 teeth = 2 lines)
    doc.text(lines[0] ?? "-", qx + pad, startY);
    doc.text(lines[1] ?? "", qx + pad, startY + 5);

    doc.setTextColor(90);
  };

  drawQuadrant("Q1", boxX, boxY);
  drawQuadrant("Q2", boxX + qW, boxY);
  drawQuadrant("Q3", boxX, boxY + qH);
  drawQuadrant("Q4", boxX + qW, boxY + qH);

  doc.setTextColor(0);
  y = boxY + boxH + 10;

  // ===== Notes (multi-line, friendly spacing) =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(70);
  doc.text("Notes:", margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text(data.notes || "-", margin, y, { maxWidth: boxW });

  // ===== Signature area (like the letter) =====
  const sigY = 265;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY, margin + 70, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Doctor Signature", margin, sigY + 6);

  // ===== Download =====
  doc.save(`Prescription_${new Date().toISOString().split("T")[0]}.pdf`);
};