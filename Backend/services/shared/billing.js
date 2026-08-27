import Invoice from "../../models/Invoice.model.js";

/**
 * The single definition of an invoice that counts toward ACTIVE money.
 *
 * Voided invoices keep their records but must not appear in revenue or
 * outstanding. Soft-deleted ones are already removed by the softDelete
 * plugin's own `aggregate` hook, so this only has to carry the void rule.
 * `voidedAt: null` also matches legacy documents written before the field
 * existed, so nothing pre-existing drops out.
 *
 * finance.js imports this so the dashboard/cashbook figures and the Billing
 * list can never disagree about what counts.
 */
export const ACTIVE_INVOICE_MATCH = Object.freeze({ voidedAt: null });

const buildRange = (dateFrom, dateTo) => {
  const range = {};
  if (dateFrom) range.$gte = dateFrom;
  if (dateTo) range.$lte = dateTo;
  return Object.keys(range).length ? range : null;
};

/**
 * Total amount actually collected: SUM of Invoice.payments[].amount whose
 * payment date falls within [dateFrom, dateTo] (inclusive, "YYYY-MM-DD"
 * strings). Pass undefined for either bound to leave it open.
 */
export async function revenueCollected(dateFrom, dateTo) {
  const range = buildRange(dateFrom, dateTo);

  const pipeline = [{ $match: { ...ACTIVE_INVOICE_MATCH } }, { $unwind: "$payments" }];
  if (range) pipeline.push({ $match: { "payments.date": range } });
  pipeline.push({ $group: { _id: null, total: { $sum: "$payments.amount" } } });

  const agg = await Invoice.aggregate(pipeline);
  return Number(agg?.[0]?.total || 0);
}

/**
 * Total outstanding balance: SUM over invoices (filtered by invoice `date`
 * in [dateFrom, dateTo]) of max(0, totalAmount - paidAmount).
 */
export async function outstanding(dateFrom, dateTo) {
  const range = buildRange(dateFrom, dateTo);

  const pipeline = [
    { $match: { ...ACTIVE_INVOICE_MATCH } }, // voided invoices are owed by nobody
    range ? { $match: { date: range } } : null,
    {
      $project: {
        totalAmount: 1,
        paidAmount: {
          $sum: {
            $map: {
              input: { $ifNull: ["$payments", []] },
              as: "p",
              in: { $ifNull: ["$$p.amount", 0] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        invoiceOutstanding: { $max: [0, { $subtract: ["$totalAmount", "$paidAmount"] }] },
      },
    },
    { $group: { _id: null, total: { $sum: "$invoiceOutstanding" } } },
  ].filter(Boolean);

  const agg = await Invoice.aggregate(pipeline);
  return Number(agg?.[0]?.total || 0);
}

/** Paid/Partial/Pending status for a single invoice given its totals. */
export function invoiceStatus(totalAmount, paidAmount) {
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);

  if (paid >= total) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
}
