import { recordAudit } from "../services/shared/audit.js";
import {
  buildFullExport,
  buildCsvExport,
  CSV_EXPORTABLE_COLLECTIONS,
} from "../services/shared/dataExport.js";

// ─── GET /owner/data-export/collections ───────────────────────────────────────
// Lists which collections support the CSV format, for the frontend to render buttons.

export const listExportableCollections = async (req, res) => {
  return res.json({ success: true, data: CSV_EXPORTABLE_COLLECTIONS });
};

// ─── GET /owner/data-export/json ──────────────────────────────────────────────

export const exportJson = async (req, res) => {
  const payload = await buildFullExport();

  await recordAudit({
    req,
    action:      "data.export",
    entityType:  "Clinic",
    entityLabel: "full data export",
    after:       { format: "json", counts: payload.meta.counts },
  });

  const filename = `fdc-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(JSON.stringify(payload, null, 2));
};

// ─── GET /owner/data-export/csv/:collection ───────────────────────────────────

export const exportCsv = async (req, res) => {
  const { collection } = req.params;

  let csv;
  try {
    csv = await buildCsvExport(collection);
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }

  await recordAudit({
    req,
    action:      "data.export",
    entityType:  "Clinic",
    entityLabel: `${collection} (csv)`,
    after:       { format: "csv", collection },
  });

  const filename = `fdc-export-${collection}-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(csv);
};
