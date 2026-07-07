/**
 * Shared finance helpers.
 * All date ranges use ISO "YYYY-MM-DD" string comparison (consistent with
 * Invoice.payments[].date and the localISODate pattern used on the frontend).
 *
 * Imported by owner and dentist service functions; never inline revenue math
 * elsewhere.
 */
import Invoice from "../../models/Invoice.model.js";
import User from "../../models/User.model.js";
import OwnerPayment from "../../models/OwnerPayment.model.js";
import LabBill from "../../models/LabBill.model.js";
import LabBillPayment from "../../models/LabBillPayment.model.js";
import CommissionRules from "../../models/CommissionRules.model.js";
import { revenueCollected } from "./billing.js";

// ─── date helpers (UTC, matches todayISO() convention in other services) ────

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function startOfYearISO() {
  return `${new Date().getFullYear()}-01-01`;
}

// ─── internal ───────────────────────────────────────────────────────────────

function buildRange(from, to) {
  const r = {};
  if (from) r.$gte = from;
  if (to)   r.$lte = to;
  return Object.keys(r).length ? r : null;
}

const MODE_SWITCH = {
  $switch: {
    branches: [
      { case: { $regexMatch: { input: { $toLower: "$payments.mode" }, regex: /^cash$/ } },            then: "Cash" },
      { case: { $regexMatch: { input: { $toLower: "$payments.mode" }, regex: /^card$/ } },            then: "Card" },
      { case: { $regexMatch: { input: { $toLower: "$payments.mode" }, regex: /^online/ } },           then: "Online Transfer" },
    ],
    default: "Other",
  },
};

function getRulesMap(rulesDoc) {
  const raw = rulesDoc?.byDentist;
  if (!raw) return {};
  if (raw instanceof Map) return Object.fromEntries(raw.entries());
  return raw; // already plain object from .lean()
}

function getRate(rulesMap, defaultPercent, publicId) {
  if (!publicId) return null;
  const v = rulesMap[publicId];
  return Number(v !== undefined && v !== null ? v : defaultPercent);
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

/**
 * Total collections in range split by payment mode.
 * Returns { Cash, Card, "Online Transfer", Other, total }
 */
export async function collectionsByMethod(from, to) {
  const range = buildRange(from, to);
  const pipeline = [
    { $unwind: "$payments" },
    ...(range ? [{ $match: { "payments.date": range } }] : []),
    { $group: { _id: MODE_SWITCH, total: { $sum: "$payments.amount" } } },
  ];
  const agg = await Invoice.aggregate(pipeline);
  const result = { Cash: 0, Card: 0, "Online Transfer": 0, Other: 0, total: 0 };
  for (const { _id, total } of agg) {
    result[_id] = (result[_id] || 0) + Number(total || 0);
    result.total += Number(total || 0);
  }
  return result;
}

/**
 * Individual payment transactions in range, paginated and optionally searched.
 * Each row: { invoiceId, date, patientName, dentistName, mode, amount }
 */
export async function cashbookTransactions(from, to, { page = 1, limit = 50, q = "" } = {}) {
  const pg = Math.max(1, Number(page) || 1);
  const lm = Math.min(200, Math.max(1, Number(limit) || 50));
  const skip = (pg - 1) * lm;
  const range = buildRange(from, to);

  const basePipeline = [
    { $unwind: "$payments" },
    ...(range ? [{ $match: { "payments.date": range } }] : []),
    {
      $lookup: {
        from: "patients",
        localField: "patient",
        foreignField: "_id",
        as: "_pat",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "dentist",
        foreignField: "_id",
        as: "_den",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $project: {
        invoiceId:   "$publicId",
        date:        "$payments.date",
        patientName: { $ifNull: [{ $arrayElemAt: ["$_pat.name", 0] }, "—"] },
        dentistName: { $ifNull: [{ $arrayElemAt: ["$_den.name", 0] }, "—"] },
        mode: MODE_SWITCH,
        amount: "$payments.amount",
      },
    },
    ...(q
      ? [{
          $match: {
            $or: [
              { invoiceId:   { $regex: String(q), $options: "i" } },
              { patientName: { $regex: String(q), $options: "i" } },
              { dentistName: { $regex: String(q), $options: "i" } },
            ],
          },
        }]
      : []),
  ];

  const [countAgg, rows] = await Promise.all([
    Invoice.aggregate([...basePipeline, { $count: "n" }]),
    Invoice.aggregate([...basePipeline, { $sort: { date: -1 } }, { $skip: skip }, { $limit: lm }]),
  ]);

  const total = Number(countAgg[0]?.n || 0);
  return { rows, total, page: pg, pages: Math.max(1, Math.ceil(total / lm)) };
}

/**
 * 30-day (or N-day) daily collection totals for trend chart.
 * Returns [{ date, total }, ...] with zeros filled for missing days.
 */
export async function cashbookTrend(days = 30) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  const fromStr = from.toISOString().slice(0, 10);
  const toStr   = today.toISOString().slice(0, 10);

  const agg = await Invoice.aggregate([
    { $unwind: "$payments" },
    { $match: { "payments.date": { $gte: fromStr, $lte: toStr } } },
    { $group: { _id: "$payments.date", total: { $sum: "$payments.amount" } } },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map(agg.map((r) => [r._id, Number(r.total || 0)]));
  const result = [];
  const cur = new Date(fromStr + "T00:00:00Z");
  const end = new Date(toStr   + "T00:00:00Z");
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    result.push({ date: d, total: map.get(d) || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

/**
 * Invoice-level stats for a date range.
 * Returns { totalCollected, methodBreakdown, invoiceCount, totalBilled, outstandingAdded }
 */
export async function cashbookStats(from, to) {
  const [methods, ar] = await Promise.all([
    collectionsByMethod(from, to),
    Invoice.aggregate([
      ...(buildRange(from, to) ? [{ $match: { date: buildRange(from, to) } }] : []),
      {
        $project: {
          totalAmount: 1,
          paid: { $sum: { $map: { input: { $ifNull: ["$payments", []] }, as: "p", in: "$$p.amount" } } },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalBilled: { $sum: "$totalAmount" },
          totalOutstanding: { $sum: { $max: [0, { $subtract: ["$totalAmount", "$paid"] }] } },
        },
      },
    ]),
  ]);

  const arRow = ar[0] || { count: 0, totalBilled: 0, totalOutstanding: 0 };
  return {
    totalCollected:   methods.total,
    Cash:             methods.Cash,
    Card:             methods.Card,
    "Online Transfer": methods["Online Transfer"],
    Other:            methods.Other,
    invoiceCount:     Number(arRow.count || 0),
    totalBilled:      Number(arRow.totalBilled || 0),
    outstandingAdded: Number(arRow.totalOutstanding || 0),
  };
}

/**
 * Commission summary per dentist (+ Unassigned row).
 *
 * `collections` and `earned` are over [from,to].
 * `paid` and `remaining` are always ALL-TIME (so the liability column is accurate).
 *
 * Returns [{ publicId, name, rate, collections, earned, earnedAllTime, paid, remaining }]
 */
export async function commissionSummary(from, to) {
  const range = buildRange(from, to);

  const dentistPipeline = (extraMatch) => [
    { $unwind: "$payments" },
    ...(extraMatch ? [{ $match: extraMatch }] : []),
    { $group: { _id: { $ifNull: ["$dentist", null] }, total: { $sum: "$payments.amount" } } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "_den",
        pipeline: [{ $project: { publicId: 1, name: 1 } }],
      },
    },
    {
      $project: {
        dentistObjId: "$_id",
        publicId: { $arrayElemAt: ["$_den.publicId", 0] },
        name:     { $ifNull: [{ $arrayElemAt: ["$_den.name", 0] }, "Unassigned"] },
        total:    1,
      },
    },
  ];

  const [rangeRows, alltimeRows, rulesDoc, paidAgg] = await Promise.all([
    Invoice.aggregate(dentistPipeline(range ? { "payments.date": range } : null)),
    Invoice.aggregate(dentistPipeline(null)),
    CommissionRules.findById("COMMISSION-RULES").lean(),
    OwnerPayment.aggregate([{ $group: { _id: "$dentistId", paid: { $sum: "$amount" } } }]),
  ]);

  const defaultPct = Number(rulesDoc?.defaultPercent ?? 20);
  const rulesMap   = getRulesMap(rulesDoc);
  const paidMap    = new Map(paidAgg.map((p) => [String(p._id || ""), Number(p.paid || 0)]));

  // Build range-lookup map by dentistObjId string
  const rangeMap = new Map(rangeRows.map((r) => [String(r.dentistObjId ?? "null"), Number(r.total || 0)]));

  return alltimeRows.map((r) => {
    const key       = String(r.dentistObjId ?? "null");
    const publicId  = r.publicId ?? null;
    const rate      = getRate(rulesMap, defaultPct, publicId);
    const colRange  = rangeMap.get(key) || 0;
    const colAll    = Number(r.total || 0);

    const earned        = publicId && rate !== null ? Math.round(colRange * rate / 100) : null;
    const earnedAllTime = publicId && rate !== null ? Math.round(colAll   * rate / 100) : 0;
    const paid          = publicId ? (paidMap.get(publicId) || 0) : 0;

    return {
      publicId,
      name:         r.name || (publicId ? publicId : "Unassigned"),
      rate,
      collections:  colRange,
      earned,
      earnedAllTime,
      paid,
      remaining:    publicId ? Math.max(0, earnedAllTime - paid) : 0,
    };
  }).sort((a, b) => (b.collections || 0) - (a.collections || 0));
}

/**
 * Finance snapshot for a single dentist (reads from req.user.publicId on the server).
 * Earned figures are computed for today/week/month/year (UTC boundaries).
 * paid and remaining are always all-time.
 */
export async function dentistFinance(dentistPublicId) {
  const [rulesDoc, dentistUser] = await Promise.all([
    CommissionRules.findById("COMMISSION-RULES").lean(),
    User.findOne({ publicId: dentistPublicId, role: "dentist" }).lean(),
  ]);

  if (!dentistUser) {
    const e = new Error("Dentist not found");
    e.status = 404;
    throw e;
  }

  const defaultPct = Number(rulesDoc?.defaultPercent ?? 20);
  const rulesMap   = getRulesMap(rulesDoc);
  const rate       = getRate(rulesMap, defaultPct, dentistPublicId) ?? defaultPct;
  const dentistId  = dentistUser._id; // ObjectId

  const today      = todayISO();
  const weekStart  = startOfWeekISO();
  const monthStart = startOfMonthISO();
  const yearStart  = startOfYearISO();

  async function sum(from, to) {
    const range = buildRange(from, to);
    const agg = await Invoice.aggregate([
      { $match: { dentist: dentistId } },
      { $unwind: "$payments" },
      ...(range ? [{ $match: { "payments.date": range } }] : []),
      { $group: { _id: null, total: { $sum: "$payments.amount" } } },
    ]);
    return Number(agg[0]?.total || 0);
  }

  const [cToday, cWeek, cMonth, cYear, cAll, paidSum] = await Promise.all([
    sum(today, today),
    sum(weekStart, today),
    sum(monthStart, today),
    sum(yearStart, today),
    sum(undefined, undefined),
    OwnerPayment.aggregate([
      { $match: { dentistId: dentistPublicId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => Number(r[0]?.total || 0)),
  ]);

  const earnedAllTime = Math.round(cAll  * rate / 100);
  const totalPaid     = paidSum;

  return {
    publicId:        dentistPublicId,
    name:            dentistUser.name,
    rate,
    earnedToday:     Math.round(cToday * rate / 100),
    earnedThisWeek:  Math.round(cWeek  * rate / 100),
    earnedThisMonth: Math.round(cMonth * rate / 100),
    earnedThisYear:  Math.round(cYear  * rate / 100),
    earnedAllTime,
    totalPaid,
    remaining:       Math.max(0, earnedAllTime - totalPaid),
  };
}

/**
 * Lab dues summary across all labs.
 * `paid` is summed from the LabBillPayment ledger (authoritative).
 * `remaining` = totalBilled - paid, floored at 0.
 * Returns [{ labId, name, totalBilled, paid, remaining }]
 */
export async function labDuesSummary() {
  const [bills, payments] = await Promise.all([
    LabBill.aggregate([
      {
        $group: {
          _id:         "$labId",
          name:        { $first: "$labName" },
          totalBilled: { $sum: "$amount" },
          months:      { $push: "$month" },
        },
      },
    ]),
    LabBillPayment.aggregate([
      { $group: { _id: "$labId", paid: { $sum: "$amount" } } },
    ]),
  ]);

  const paidMap = new Map(payments.map((p) => [String(p._id), Number(p.paid || 0)]));

  return bills.map((b) => {
    const totalBilled = Number(b.totalBilled || 0);
    const paid        = paidMap.get(String(b._id)) || 0;
    return {
      labId:       b._id,
      name:        b.name || b._id,
      totalBilled,
      paid,
      remaining:   Math.max(0, totalBilled - paid),
      months:      b.months || [],
    };
  }).sort((a, b) => b.remaining - a.remaining);
}

/**
 * LabBill rows for a specific lab (for the "Bills" drawer).
 * Includes per-bill paid amount from LabBillPayment, and derived `fullyPaid` flag.
 */
export async function labBillsForLab(labId, { page = 1, limit = 50 } = {}) {
  const pg  = Math.max(1, Number(page) || 1);
  const lm  = Math.min(200, Number(limit) || 50);
  const skip = (pg - 1) * lm;
  const lid = String(labId);

  // Fetch ALL bills (oldest-first) so FIFO allocation covers the full history,
  // then paginate after allocation. Payments are lab-level (labBillId is always ""),
  // so we sum the entire lab's LabBillPayment pool and distribute oldest-bill-first.
  const [allBills, totalPaidAgg, total] = await Promise.all([
    LabBill.find({ labId: lid }).sort({ month: 1 }).lean(),
    LabBillPayment.aggregate([
      { $match: { labId: lid } },
      { $group: { _id: null, paid: { $sum: "$amount" } } },
    ]),
    LabBill.countDocuments({ labId: lid }),
  ]);

  // FIFO: walk oldest → newest, fill each bill from the pool until exhausted.
  let pool = Number(totalPaidAgg[0]?.paid || 0);
  const allocationMap = new Map();
  for (const b of allBills) {
    const amount    = Number(b.amount || 0);
    const allocated = Math.min(pool, amount);
    allocationMap.set(String(b._id), allocated);
    pool = Math.max(0, pool - allocated);
  }

  // Display newest-first (same UX order as before), then paginate.
  const pagedBills = allBills
    .slice()
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(skip, skip + lm);

  const rows = pagedBills.map((b) => {
    const amount = Number(b.amount || 0);
    const paid   = allocationMap.get(String(b._id)) || 0;
    return {
      id:        b._id,
      month:     b.month,
      amount,
      paid,
      remaining: Math.max(0, amount - paid),
      fullyPaid: paid >= amount,
    };
  });

  return { rows, total, page: pg, pages: Math.max(1, Math.ceil(total / lm)) };
}

// re-export billing.js helper so callers can import from one place
export { revenueCollected } from "./billing.js";
