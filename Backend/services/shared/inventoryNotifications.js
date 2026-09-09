/**
 * Inventory threshold notifications — mirrors services/shared/labCaseNotifications.js
 * exactly: reuses the EXISTING Notification model (no new model, table, or
 * delivery channel), derives state ON READ with no scheduler, and writes
 * i18n keys + params so the bell renders in the reader's language.
 *
 * RECIPIENTS: unlike a lab case (which has one dentist and one lab), a stock
 * threshold matters to whoever manages the stock room — every owner AND every
 * receptionist user, not a single assignee. Resolved fresh each sweep from
 * the User collection (role in [owner, receptionist]); there is no
 * active/disabled flag on this schema to filter by.
 *
 * DERIVATION: called from inside the list query (ownerInventoryListItems /
 * receptionistListInventory) using the rows already fetched for that page —
 * no extra query beyond resolving recipients once per sweep.
 *
 * DE-DUPLICATION KEY: (recipientId, type, meta.itemId, meta.qty).
 *
 * WHY qty IS PART OF THE KEY (mirroring the lab case's dueDate role exactly):
 * dueDate stayed constant across repeated reads of the SAME overdue episode,
 * but changed if the date was genuinely revised — letting a real new event
 * re-notify while identical re-reads deduped. qty plays the same role here:
 * as long as the item sits at the same quantity, three page loads see the
 * same key and produce exactly one notification. Once the item is restocked
 * and later crosses the threshold again at a DIFFERENT quantity, that is a
 * new key — a genuinely new episode notifies again. A quantity that returns
 * to an EXACT previous value would not re-notify, the same acceptable edge
 * case the lab case accepts for a due date reused verbatim.
 *
 * PHI: none. Only item id, name and quantity travel — no patient data touches
 * inventory at all.
 */

import Notification from "../../models/Notification.model.js";
import User from "../../models/User.model.js";

export const INVENTORY_NOTIFICATION_TYPES = Object.freeze({
  LOW_STOCK: "inventory_low_stock",
  OUT_OF_STOCK: "inventory_out_of_stock",
});

const EN_TITLE = {
  inventory_low_stock: "Low Stock",
  inventory_out_of_stock: "Out of Stock",
};

const EN = {
  inventory_low_stock: (p) => `${p.name} (${p.itemId}) is low on stock: ${p.qty} left (reorder at ${p.reorderLevel}).`,
  inventory_out_of_stock: (p) => `${p.name} (${p.itemId}) is out of stock.`,
};

async function notify(recipientId, type, params, extraMeta = {}) {
  if (!recipientId) return null;
  try {
    return await Notification.create({
      recipientId,
      type,
      title: EN_TITLE[type] || "Inventory",
      message: (EN[type] || (() => ""))(params),
      meta: {
        ...extraMeta,
        itemId: params.itemId,
        qty: params.qty,
        i18n: { titleKey: `notifications.${type}.title`, messageKey: `notifications.${type}.message`, params },
      },
    });
  } catch {
    return null;
  }
}

const MAX_PER_SWEEP = 20;

/** Every owner + receptionist user id, resolved fresh each sweep. */
async function getRecipientIds() {
  const users = await User.find({ role: { $in: ["owner", "receptionist"] } }).select("_id").lean();
  return users.map((u) => u._id);
}

/**
 * Sweeps the rows a list query already fetched (raw docs — qty/reorderLevel,
 * not either role's renamed DTO) and notifies every owner + receptionist
 * once per (item, quantity) threshold state. Bounded to MAX_PER_SWEEP items
 * per call so a large backlog cannot stall the request; safe to call on
 * every page load — repeated loads with no data change insert nothing.
 */
export async function sweepInventoryThresholdNotifications(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0;

  const crossing = rows
    .filter((r) => Number(r.qty || 0) <= Number(r.reorderLevel || 0))
    .slice(0, MAX_PER_SWEEP);
  if (!crossing.length) return 0;

  const recipients = await getRecipientIds();
  if (!recipients.length) return 0;

  let created = 0;
  for (const item of crossing) {
    const qty = Number(item.qty || 0);
    const type = qty === 0
      ? INVENTORY_NOTIFICATION_TYPES.OUT_OF_STOCK
      : INVENTORY_NOTIFICATION_TYPES.LOW_STOCK;
    const itemId = item.publicId;

    for (const recipientId of recipients) {
      const exists = await Notification.countDocuments({
        recipientId,
        type,
        "meta.itemId": itemId,
        "meta.qty": qty,
      });
      if (exists) continue;

      await notify(recipientId, type, {
        itemId,
        name: item.name || "",
        qty,
        reorderLevel: Number(item.reorderLevel || 0),
      });
      created++;
    }
  }
  return created;
}
