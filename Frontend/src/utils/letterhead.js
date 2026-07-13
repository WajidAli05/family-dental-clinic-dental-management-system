// Single source of truth for clinic identity.
// Consumed by printPrescription (jsPDF) and printInvoice (HTML/window.print).

export const CLINIC = {
  name:    "FAMILY DENTAL CLINIC",
  tagline: "Spreading Smile",
  address: "House # 09, Main Harlay Street Rawalpindi Cantt.",
  contact: "0335-3400001",
};

export const DENTISTS = [
  { name: "Dr. Saifullah",    specialty: "Periodontist & Implantologist" },
  { name: "Dr. Ashfaq Alam",  specialty: "Orthodontist" },
  { name: "Dr. Samin",        specialty: "Aesthetic Dentist" },
  { name: "Dr. Wajahat",      specialty: "Dental Surgeon" },
  { name: "Dr. Haseeb",       specialty: "Endodontist" },
  { name: "Dr. Naila Mir",    specialty: "General Dentist" },
];

const BRAND_BLUE_HEX = "#14468C";
const BRAND_BLUE_RGB = [20, 70, 140];

// ─────────────────────────────────────────────────────────────
// jsPDF: two-figure / tooth logo, horizontally centered at cx
// ─────────────────────────────────────────────────────────────
const _drawCenteredLogo = (doc, cx, y) => {
  const x = cx - 10; // drawn content spans x+4 … x+16 (≈12 mm wide)
  doc.setDrawColor(...BRAND_BLUE_RGB);
  doc.setLineWidth(0.6);
  doc.circle(x + 6,  y + 4, 2, "S");
  doc.circle(x + 14, y + 4, 2, "S");
  doc.line(x + 6,  y + 6.5, x + 10, y + 10);
  doc.line(x + 14, y + 6.5, x + 10, y + 10);
  doc.setLineWidth(0.7);
  doc.roundedRect(x + 7.2, y + 8, 5.6, 7.5, 2, 2, "S");
  doc.line(x + 10, y + 10.2, x + 10, y + 14.6);
};

// ─────────────────────────────────────────────────────────────
// jsPDF: centered header + address/contact footer
// Called on every page (page 1 + any overflow pages).
// ─────────────────────────────────────────────────────────────
export const drawPdfLetterhead = (doc) => {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const cx = pageW / 2;

  // ── Header ──
  _drawCenteredLogo(doc, cx, 12);

  doc.setTextColor(...BRAND_BLUE_RGB);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(CLINIC.name, cx, 33, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(CLINIC.tagline, cx, 40, { align: "center" });

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, 45, pageW - margin, 45);

  // ── Footer: address + contact ──
  doc.setDrawColor(200);
  doc.setLineWidth(0.4);
  doc.line(margin, 277, pageW - margin, 277);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Address: ${CLINIC.address}`, cx, 282, { align: "center" });
  doc.text(`Contact No: ${CLINIC.contact}`, cx, 287, { align: "center" });

  doc.setTextColor(0);
};

// ─────────────────────────────────────────────────────────────
// jsPDF: six-doctor roster panel — PRESCRIPTION ONLY
// Sits between body content (≤y 232) and footer divider (y 277).
// Call on each page after drawPdfLetterhead and before doc.save().
// ─────────────────────────────────────────────────────────────
export const drawPdfDentistFooterPanel = (doc) => {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const colW = (pageW - margin * 2) / 3;

  // Section divider
  doc.setDrawColor(210);
  doc.setLineWidth(0.2);
  doc.line(margin, 247, pageW - margin, 247);

  // Section label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("OUR DENTAL TEAM", pageW / 2, 253, { align: "center" });

  // 3 columns × 2 rows
  DENTISTS.forEach((d, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x    = margin + col * colW + 2;
    const nameY = 259 + row * 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND_BLUE_RGB);
    doc.text(d.name, x, nameY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(110);
    doc.text(d.specialty, x, nameY + 4);
  });

  doc.setTextColor(0);
};

// ─────────────────────────────────────────────────────────────
// HTML renderers — for printInvoice (window.print)
// ─────────────────────────────────────────────────────────────

const LOGO_SVG = `<svg viewBox="0 0 20 17" width="48" height="48" xmlns="http://www.w3.org/2000/svg" fill="none">
  <circle cx="6" cy="4" r="2" stroke="${BRAND_BLUE_HEX}" stroke-width="0.65"/>
  <circle cx="14" cy="4" r="2" stroke="${BRAND_BLUE_HEX}" stroke-width="0.65"/>
  <line x1="6" y1="6.5" x2="10" y2="10" stroke="${BRAND_BLUE_HEX}" stroke-width="0.65"/>
  <line x1="14" y1="6.5" x2="10" y2="10" stroke="${BRAND_BLUE_HEX}" stroke-width="0.65"/>
  <rect x="7.2" y="8" width="5.6" height="7.5" rx="2" stroke="${BRAND_BLUE_HEX}" stroke-width="0.75"/>
  <line x1="10" y1="10.2" x2="10" y2="14.6" stroke="${BRAND_BLUE_HEX}" stroke-width="0.75"/>
</svg>`;

export const htmlLetterheadStyles = () => `
  .lh-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 14px;
    margin-bottom: 18px;
    border-bottom: 1.5px solid #dde3ec;
    text-align: center;
  }
  .lh-logo { margin-bottom: 6px; }
  .lh-clinic-name {
    font-size: 20px;
    font-weight: 700;
    color: ${BRAND_BLUE_HEX};
    font-family: Arial, Helvetica, sans-serif;
    margin: 0 0 3px;
    letter-spacing: 0.4px;
  }
  .lh-tagline {
    font-size: 11px;
    color: #888;
    font-style: italic;
    font-family: Georgia, 'Times New Roman', serif;
    margin: 0;
  }
  .lh-footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid #ccc;
    text-align: center;
    font-size: 10px;
    color: #666;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.6;
  }
`;

export const htmlLetterheadHeader = () => `
<div class="lh-header">
  <div class="lh-logo">${LOGO_SVG}</div>
  <p class="lh-clinic-name">${CLINIC.name}</p>
  <p class="lh-tagline">${CLINIC.tagline}</p>
</div>`;

export const htmlLetterheadFooter = () => `
<div class="lh-footer">
  <p>Address: ${CLINIC.address}</p>
  <p>Contact No: ${CLINIC.contact}</p>
</div>`;

// Exported for any future HTML prescription variant — NOT imported by printInvoice.
export const htmlDentistFooterPanel = () => `
<div style="margin-top:16px;padding-top:10px;border-top:1px solid #dde3ec;">
  <p style="text-align:center;font-size:9px;font-weight:700;color:#aaa;letter-spacing:.8px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;margin:0 0 8px;">Our Dental Team</p>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px 12px;font-family:Arial,Helvetica,sans-serif;">
    ${DENTISTS.map(d => `<div><p style="font-size:9px;font-weight:700;color:${BRAND_BLUE_HEX};margin:0 0 1px;">${d.name}</p><p style="font-size:8px;color:#777;margin:0;">${d.specialty}</p></div>`).join("")}
  </div>
</div>`;
