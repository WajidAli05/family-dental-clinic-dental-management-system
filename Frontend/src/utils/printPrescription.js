import jsPDF from "jspdf";

export const printPrescription = (data) => {
  const doc = new jsPDF("p", "mm", "a4");

  // ===== Letterhead =====
  doc.setFontSize(18);
  doc.text("Family Dental Clinic", 105, 20, { align: "center" });

  doc.setFontSize(11);
  doc.text(
    "Harley Street, Saddar, Rawalpindi",
    105,
    27,
    { align: "center" }
  );

  doc.line(20, 32, 190, 32);

  // ===== Body =====
  let y = 45;

  doc.setFontSize(12);

  const row = (label, value) => {
    doc.text(`${label}:`, 20, y);
    doc.text(String(value || "-"), 70, y);
    y += 8;
  };

  row("Patient Type", data.patientType);
  row("Selected Teeth", data.selectedTeeth.join(", "));
  row("Diagnosis", data.diagnosis);
  row("Treatment", data.treatment);
  row("Clinical Findings", data.clinicalFinding);
  row("Treatment Status", data.visualStatus);

  y += 6;
  doc.text("Notes:", 20, y);
  y += 6;

  doc.setFontSize(11);
  doc.text(data.notes || "-", 20, y, {
    maxWidth: 170,
  });

  // ===== Footer =====
  doc.line(20, 260, 90, 260);
  doc.text("Doctor Signature", 20, 267);

  doc.text(
    `Date: ${new Date().toLocaleDateString()}`,
    140,
    267
  );

  // ===== Download =====
  doc.save(
    `Prescription_${new Date().toISOString().split("T")[0]}.pdf`
  );
};