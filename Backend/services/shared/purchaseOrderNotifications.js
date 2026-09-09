/**
 * Purchase-order notifications — mirrors services/shared/inventoryNotifications.js
 * exactly: the existing Notification model, derived on read inside the list
 * query with no scheduler, i18n keys + params in meta.
 *
 * TWO TYPES:
 *   po_overdue           — expectedDeliveryDate has passed and the PO is not
 *                          yet fully received/closed/cancelled.
 *   supplier_outstanding — a supplier carries an outstanding balance.
 *
 * RECIPIENTS: every owner + receptionist user, resolved fresh each sweep —
 * same rationale as inventory: a purchasing/AP concern matters to whoever
 * runs the stock room and the books, not a single assignee.
 *
 * DEDUP KEYS:
 *   po_overdue:           (recipientId, type, meta.poId, meta.expectedDeliveryDate)
 *     — identical to the lab case's dueDate role: the date stays constant
 *     across repeated reads of the SAME overdue episode (dedupes), but a
 *     genuinely revised delivery date that is then also missed is a new key
 *     (re-notifies).
 *   supplier_outstanding: (recipientId, type, meta.supplierId, meta.outstanding)
 *     — identical to inventory's qty role: the amount stays constant across
 *     repeated reads of the SAME unpaid balance (dedupes), but a balance that
 *     changes — more billed, or paid down — is a new key (re-notifies).
 *
 * PHI: none. Only PO/supplier ids, names and amounts travel.
 */

import Notification from "../../models/Notification.model.js";
import User from "../../models/User.model.js";

export const PO_NOTIFICATION_TYPES = Object.freeze({
  OVERDUE: "po_overdue",
  SUPPLIER_OUTSTANDING: "supplier_outstanding",
});

const EN_TITLE = {
  po_overdue: "Purchase Order Overdue",
  supplier_outstanding: "Supplier Balance Outstanding",
};

const EN = {
  po_overdue: (p) => `Purchase order ${p.poId} from ${p.supplierName} is overdue (expected ${p.expectedDeliveryDate}).`,
  supplier_outstanding: (p) => `${p.supplierName} has an outstanding balance of ${p.outstanding}.`,
};

/**
 * `extraMeta` MUST include every field a caller's dedup query checks
 * (e.g. `meta.outstanding`) — only `extraMeta` is spread onto the top-level
 * `meta` object; `params` only ever reaches storage nested under
 * `meta.i18n.params`, which a Mongo dot-path query like `"meta.outstanding"`
 * cannot see. Passing a dedup field only in `params` silently disables
 * de-duplication for it (found and fixed during this session's own
 * self-verify — three page loads inserted six rows instead of two).
 */
async function notify(recipientId, type, params, extraMeta = {}) {
  if (!recipientId) return null;
  try {
    return await Notification.create({
      recipientId,
      type,
      title: EN_TITLE[type] || "Purchasing",
      message: (EN[type] || (() => ""))(params),
      meta: {
        ...extraMeta,
        i18n: { titleKey: `notifications.${type}.title`, messageKey: `notifications.${type}.message`, params },
      },
    });
  } catch {
    return null;
  }
}

const MAX_PER_SWEEP = 20;

async function getRecipientIds() {
  const users = await User.find({ role: { $in: ["owner", "receptionist"] } }).select("_id").lean();
  return users.map((u) => u._id);
}

/**
 * Sweeps mapped PO rows (from listPurchaseOrdersShared — already carries
 * canonical `status`) for overdue deliveries. Called from inside the PO list
 * query using rows already in hand.
 */
export async function sweepPoOverdueNotifications(rows, todayISO) {
  if (!Array.isArray(rows) || !rows.length || !todayISO) return 0;

  const overdue = rows
    .filter((po) => {
      const d = String(po.expectedDeliveryDate || "").trim();
      if (!d || d >= todayISO) return false;
      return !["received", "closed", "cancelled"].includes(po.status);
    })
    .slice(0, MAX_PER_SWEEP);
  if (!overdue.length) return 0;

  const recipients = await getRecipientIds();
  if (!recipients.length) return 0;

  let created = 0;
  for (const po of overdue) {
    for (const recipientId of recipients) {
      const exists = await Notification.countDocuments({
        recipientId,
        type: PO_NOTIFICATION_TYPES.OVERDUE,
        "meta.poId": po.id,
        "meta.expectedDeliveryDate": po.expectedDeliveryDate,
      });
      if (exists) continue;

      await notify(recipientId, PO_NOTIFICATION_TYPES.OVERDUE, {
        poId: po.id,
        supplierName: po.supplierName || "the supplier",
        expectedDeliveryDate: po.expectedDeliveryDate,
      }, { poId: po.id, expectedDeliveryDate: po.expectedDeliveryDate });
      created++;
    }
  }
  return created;
}

/**
 * Sweeps supplier ledger rows (from supplierDuesSummary) for outstanding
 * balances. Called from inside the Suppliers list query.
 */
export async function sweepSupplierOutstandingNotifications(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0;

  const owing = rows.filter((r) => Number(r.remaining || 0) > 0).slice(0, MAX_PER_SWEEP);
  if (!owing.length) return 0;

  const recipients = await getRecipientIds();
  if (!recipients.length) return 0;

  let created = 0;
  for (const row of owing) {
    const outstanding = Number(row.remaining || 0);
    for (const recipientId of recipients) {
      const exists = await Notification.countDocuments({
        recipientId,
        type: PO_NOTIFICATION_TYPES.SUPPLIER_OUTSTANDING,
        "meta.supplierId": row.supplierId,
        "meta.outstanding": outstanding,
      });
      if (exists) continue;

      await notify(recipientId, PO_NOTIFICATION_TYPES.SUPPLIER_OUTSTANDING, {
        supplierId: row.supplierId,
        supplierName: row.name || row.supplierId,
        outstanding,
      }, { supplierId: row.supplierId, outstanding });
      created++;
    }
  }
  return created;
}
