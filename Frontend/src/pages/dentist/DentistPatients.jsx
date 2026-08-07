// src/pages/dentist/DentistPatients.jsx
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Wave from "react-wavify";
import TableSkeleton from "@/components/ui/TableSkeleton";
import TablePagination from "@/components/ui/TablePagination";
import { dentistApi } from "@/lib/dentistApi";
import { toast } from "sonner";
import DentistPatientViewModal from "@/components/dentist/DentistPatientViewModal";

const PAGE_LIMIT = 50;

const DentistPatients = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [viewPatient, setViewPatient] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dentistApi.getPatients({
        page,
        limit: PAGE_LIMIT,
        q: query,
        sortBy,
        sortDir,
      });
      setRows(res?.data || res?.rows || []);
      setTotal(res?.total ?? 0);
      setPage(res?.page ?? 1);
      setPages(res?.pages ?? 1);
    } catch (e) {
      toast.error(e.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, [page, query, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-white px-6 py-7">
        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-1 text-gray-500">All clinic patients — read-only view</p>
        </div>
        <Wave
          fill="#2ec4b6"
          paused={false}
          options={{ height: 18, amplitude: 26, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <Wave
          fill="#2ec4b6"
          paused={false}
          options={{ height: 10, amplitude: 18, speed: 0.12, points: 4 }}
          className="absolute bottom-0 left-0 w-full opacity-10"
        />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search by name, phone, MR…"
                className="pl-9 rounded-xl"
              />
            </div>
            <p className="text-sm text-gray-500 ml-auto">
              {total > 0 ? `${total} patient${total !== 1 ? "s" : ""}` : ""}
            </p>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th
                      className="py-3 pr-4 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("name")}
                    >
                      Patient <SortIcon col="name" />
                    </th>
                    <th className="py-3 pr-4">Phone</th>
                    <th
                      className="py-3 pr-4 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("age")}
                    >
                      Age <SortIcon col="age" />
                    </th>
                    <th className="py-3 pr-4">Gender</th>
                    <th className="py-3 pr-4">City</th>
                    <th
                      className="py-3 pr-4 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("lastVisit")}
                    >
                      Last Visit <SortIcon col="lastVisit" />
                    </th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No patients found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((p) => (
                      <tr
                        key={p.id || p.publicId}
                        className="hover:bg-gray-50/60 transition cursor-pointer"
                        onClick={() => setViewPatient(p)}
                      >
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.id || p.publicId}</div>
                        </td>
                        <td className="py-3 pr-4">{p.phone || "-"}</td>
                        <td className="py-3 pr-4">{p.age ?? "-"}</td>
                        <td className="py-3 pr-4">{p.gender || "-"}</td>
                        <td className="py-3 pr-4">{p.city || "-"}</td>
                        <td className="py-3 pr-4">{p.lastVisit || "-"}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                            p.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-gray-50 text-gray-700 border-gray-100"
                          }`}>
                            {p.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <TablePagination
            page={page}
            pages={pages}
            total={total}
            limit={PAGE_LIMIT}
            onPage={(p) => setPage(p)}
          />
        </CardContent>
      </Card>

      <DentistPatientViewModal
        open={!!viewPatient}
        patient={viewPatient}
        onClose={() => setViewPatient(null)}
      />
    </div>
  );
};

export default DentistPatients;
