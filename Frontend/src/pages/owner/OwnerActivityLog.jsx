import React, { useCallback, useEffect, useState } from "react";
import { useAuditLogStore } from "@/store/auditLogStore";
import { useUserStore } from "@/store/userStore";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import { describeAuditEntry } from "@/utils/auditDescription";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import TablePagination from "@/components/ui/TablePagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { ChevronDown, ChevronRight, RotateCcw, Search } from "lucide-react";

const ALL_ACTIONS = [
  "patient.create",      "patient.update",          "patient.delete",
  "appointment.create",  "appointment.update",       "appointment.status_change",
  "appointment.assign",  "appointment.cancel",       "appointment.delete",
  "invoice.create",      "invoice.payment",          "invoice.update",
  "labcase.create",      "labcase.status_change",    "labcase.update",  "labcase.delete",
  "prescription.create", "prescription.update",
  "permission.change",
  "config.update",       "settings.update",
  "user.login",          "user.logout",
  "auth.login_failed",   "auth.lockout",             "session.revoke_all",
  "audit.view",
];

const RECEPTIONIST_SAFE_ACTIONS = [
  "appointment.create",  "appointment.update",   "appointment.status_change",
  "appointment.assign",  "appointment.cancel",
  "patient.create",      "patient.update",
  "invoice.create",      "invoice.payment",      "invoice.update",
  "user.login",          "user.logout",
];

const ROLE_COLOR = {
  owner:        "bg-purple-100 text-purple-800",
  receptionist: "bg-blue-100 text-blue-800",
  dentist:      "bg-green-100 text-green-800",
  lab:          "bg-orange-100 text-orange-800",
  system:       "bg-gray-100 text-gray-600",
};

const DEFAULT_FILTERS = {
  startDate:      "",
  endDate:        "",
  startInclusive: true,
  endInclusive:   true,
  action:         "",
  actorRole:      "",
  q:              "",
};

function formatAt(dateVal, timezone) {
  if (!dateVal) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone:    timezone || "Asia/Karachi",
      year:        "numeric",
      month:       "short",
      day:         "2-digit",
      hour:        "2-digit",
      minute:      "2-digit",
      hour12:      false,
    }).format(new Date(dateVal));
  } catch {
    return String(dateVal);
  }
}

function buildParams(filters, page) {
  const p = {};
  if (filters.startDate) p.startDate = filters.startDate;
  if (filters.endDate)   p.endDate   = filters.endDate;
  p.startInclusive = String(filters.startInclusive);
  p.endInclusive   = String(filters.endInclusive);
  if (filters.action)   p.action   = filters.action;
  if (filters.actorRole) p.actorRole = filters.actorRole;
  if (filters.q)        p.q        = filters.q;
  p.page = String(page || 1);
  return p;
}

export default function OwnerActivityLog() {
  const role     = useUserStore((s) => s.role);
  const timezone = useClinicConfigStore((s) => s.timezone);

  const { rows, total, page, pages, loading, error, fetch } = useAuditLogStore();

  const [filters, setFilters]     = useState({ ...DEFAULT_FILTERS });
  const [activePage, setActivePage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const availableActions =
    role === "receptionist" ? RECEPTIONIST_SAFE_ACTIONS : ALL_ACTIONS;

  const load = useCallback(
    (f = filters, pg = activePage) => {
      fetch(buildParams(f, pg));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    load(filters, activePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    setActivePage(1);
    fetch(buildParams(filters, 1));
  };

  const handleReset = () => {
    const fresh = { ...DEFAULT_FILTERS };
    setFilters(fresh);
    setActivePage(1);
    fetch(buildParams(fresh, 1));
  };

  const handlePage = (p) => {
    setActivePage(p);
    fetch(buildParams(filters, p));
  };

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Activity Log"
        subtitle="Immutable, hash-chained audit trail of all clinic actions"
      />

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-5 space-y-4">

          {/* Date range row */}
          <div className="flex flex-wrap gap-5 items-end">
            <div className="flex items-end gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">From</p>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className="border rounded px-2.5 py-1.5 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-[#2ec4b6]"
                />
              </div>
              <label className="flex items-center gap-1 text-xs text-gray-500 pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.startInclusive}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, startInclusive: e.target.checked }))
                  }
                  className="accent-[#2ec4b6] w-3.5 h-3.5"
                />
                inclusive
              </label>
            </div>

            <div className="flex items-end gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">To</p>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className="border rounded px-2.5 py-1.5 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-[#2ec4b6]"
                />
              </div>
              <label className="flex items-center gap-1 text-xs text-gray-500 pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.endInclusive}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, endInclusive: e.target.checked }))
                  }
                  className="accent-[#2ec4b6] w-3.5 h-3.5"
                />
                inclusive
              </label>
            </div>
          </div>

          {/* Dropdowns + search row */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select
              value={filters.action || "_all"}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, action: v === "_all" ? "" : v }))
              }
            >
              <SelectTrigger className="w-52 h-9 text-sm">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Actions</SelectItem>
                {availableActions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {role === "owner" && (
              <Select
                value={filters.actorRole || "_all"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, actorRole: v === "_all" ? "" : v }))
                }
              >
                <SelectTrigger className="w-40 h-9 text-sm">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Roles</SelectItem>
                  {["owner", "receptionist", "dentist", "lab", "system"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input
              placeholder="Search name or entity…"
              className="w-52 h-9 text-sm"
              value={filters.q}
              onChange={(e) =>
                setFilters((f) => ({ ...f, q: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />

            <Button
              onClick={handleApply}
              size="sm"
              className="h-9 bg-[#2ec4b6] hover:bg-[#26b0a3] text-white"
            >
              <Search className="w-4 h-4 me-1.5" />
              Apply
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="h-9"
            >
              <RotateCcw className="w-4 h-4 me-1.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      <Card>
        <CardContent className="pt-5">
          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          <p className="text-xs text-gray-400 mb-3">
            {loading
              ? "Loading…"
              : `${total.toLocaleString()} entr${total === 1 ? "y" : "ies"}`}
          </p>

          {loading ? (
            <TableSkeleton rows={10} cols={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-7" />
                  <TableHead className="w-40">When</TableHead>
                  <TableHead className="w-40">Who</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-36">Entity</TableHead>
                  <TableHead className="w-28 text-gray-400 text-xs font-normal">Audit ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-400 py-10"
                    >
                      No audit entries match your filters.
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className="cursor-pointer select-none"
                      onClick={() => toggleExpand(row.id)}
                    >
                      <TableCell className="text-gray-300 ps-2">
                        {expandedId === row.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                        {formatAt(row.at, timezone)}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded inline-block mb-0.5 ${
                            ROLE_COLOR[row.actorRole] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.actorRole || "unknown"}
                        </span>
                        <p className="text-sm truncate max-w-[140px]">
                          {row.actorName || "—"}
                        </p>
                      </TableCell>

                      <TableCell className="text-sm">
                        {describeAuditEntry(row)}
                      </TableCell>

                      <TableCell className="text-xs text-gray-500">
                        {row.entityType && (
                          <span className="block font-medium">{row.entityType}</span>
                        )}
                        {row.entityLabel && (
                          <span className="block truncate max-w-[130px] text-gray-400">
                            {row.entityLabel}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-gray-400">
                        {row.id}
                      </TableCell>
                    </TableRow>

                    {expandedId === row.id && (
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableCell colSpan={6} className="p-0">
                          <div className="px-6 py-4 space-y-3">
                            {(row.before !== null || row.after !== null) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {row.before !== null && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-1.5">
                                      Before
                                    </p>
                                    <pre className="text-xs bg-white border rounded p-3 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                                      {JSON.stringify(row.before, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {row.after !== null && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-1.5">
                                      After
                                    </p>
                                    <pre className="text-xs bg-white border rounded p-3 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                                      {JSON.stringify(row.after, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-6 text-xs text-gray-400">
                              {row.ip && <span>IP: {row.ip}</span>}
                              {row.userAgent && (
                                <span className="truncate max-w-xs">
                                  UA: {row.userAgent}
                                </span>
                              )}
                              {row.hashSelf && (
                                <span className="font-mono">
                                  Hash: {row.hashSelf.slice(0, 20)}…
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}

          <TablePagination
            page={page}
            pages={pages}
            total={total}
            limit={50}
            onPage={handlePage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
