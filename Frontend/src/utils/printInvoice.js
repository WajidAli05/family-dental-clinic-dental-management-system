import { htmlLetterheadStyles, htmlLetterheadHeader, htmlLetterheadFooter } from "./letterhead";
import { useClinicConfigStore } from "@/store/clinicConfigStore";

const pkr = (n) => useClinicConfigStore.getState().fmt(n);

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-PK"); } catch { return String(d); }
};

export const printInvoice = (invoice) => {
  if (!invoice) return;

  const payments    = Array.isArray(invoice.payments) ? invoice.payments : [];
  const totalAmount = Number(invoice.totalAmount ?? invoice.total ?? 0);
  const totalPaid   = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balance     = totalAmount - totalPaid;

  // Resolve patient name — try all known field shapes
  const patientName =
    invoice.patientName ||
    invoice.patient?.name  ||
    invoice.patient        ||
    "—";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${invoice.id || ""}</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            color: #1a1a1a;
            padding: 36px 44px;
            max-width: 780px;
            margin: 0 auto;
          }

          ${htmlLetterheadStyles()}

          /* ── Invoice-specific styles ── */
          .inv-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 24px;
            margin-bottom: 20px;
            font-size: 12px;
            line-height: 1.7;
          }
          .inv-meta strong { color: #333; }

          .inv-title {
            font-size: 14px;
            font-weight: 700;
            color: #14468C;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border-bottom: 1.5px solid #dde3ec;
            padding-bottom: 4px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 12px;
          }
          th {
            background: #f0f4f9;
            color: #14468C;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #dde3ec;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          th.num { text-align: right; }
          td {
            border: 1px solid #e8ecf1;
            padding: 7px 10px;
            vertical-align: middle;
          }
          td.num { text-align: right; font-variant-numeric: tabular-nums; }
          tr:nth-child(even) td { background: #fafbfc; }

          .summary {
            margin-left: auto;
            width: 260px;
            border: 1px solid #dde3ec;
            border-radius: 6px;
            overflow: hidden;
            font-size: 12px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 7px 12px;
            border-bottom: 1px solid #e8ecf1;
          }
          .summary-row:last-child { border-bottom: none; }
          .summary-row.balance {
            background: #f0f4f9;
            font-weight: 700;
            font-size: 13px;
          }
          .summary-label { color: #555; }
          .summary-value { font-variant-numeric: tabular-nums; }
          .balance .summary-value { color: ${balance > 0 ? "#c0392b" : "#27ae60"}; }

          @media print {
            body { padding: 20px 28px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>

        ${htmlLetterheadHeader()}

        <div class="inv-meta">
          <div><strong>Invoice ID:</strong> ${invoice.id || "—"}</div>
          <div><strong>Status:</strong> ${invoice.status || "—"}</div>
          <div><strong>Patient:</strong> ${patientName}</div>
          <div><strong>Date:</strong> ${fmtDate(invoice.date)}</div>
          ${invoice.mr != null ? `<div><strong>MR No:</strong> ${invoice.mr}</div>` : ""}
        </div>

        <p class="inv-title">Payments</p>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Mode</th>
              <th class="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${payments.length > 0
              ? payments.map((p) => `
                <tr>
                  <td>${fmtDate(p.date)}</td>
                  <td>${p.mode || "—"}</td>
                  <td class="num">${pkr(p.amount)}</td>
                </tr>`).join("")
              : `<tr><td colspan="3" style="text-align:center;color:#999;padding:14px;">No payments recorded</td></tr>`
            }
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Total Amount</span>
            <span class="summary-value">${pkr(totalAmount)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Paid</span>
            <span class="summary-value">${pkr(totalPaid)}</span>
          </div>
          <div class="summary-row balance">
            <span class="summary-label">Balance Due</span>
            <span class="summary-value">${pkr(balance)}</span>
          </div>
        </div>

        ${htmlLetterheadFooter()}

      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.close();
};
