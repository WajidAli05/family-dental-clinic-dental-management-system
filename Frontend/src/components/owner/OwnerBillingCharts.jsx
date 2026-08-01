import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import { formatMoney } from "@/utils/formatMoney";

const OwnerBillingCharts = ({ tab, trendData = [], commissionRows = [], labDuesRows = [] }) => {
  const currency     = useClinicConfigStore((s) => s.currency);
  const country      = useClinicConfigStore((s) => s.country);
  const exchangeRate = useClinicConfigStore((s) => s.exchangeRate);

  // Apply rate once here so both the chart data AND the axis use the same scale.
  // Original props are never mutated — .map() creates new objects.
  const rate = currency !== "PKR" && exchangeRate > 0 ? exchangeRate : 1;

  const cashbookData = trendData.map((d) => ({ ...d, total: d.total * rate }));
  const commData     = commissionRows.map((r) => ({
    ...r,
    earned: r.earned * rate,
    paid:   r.paid   * rate,
  }));
  const labData      = labDuesRows.map((r) => ({
    ...r,
    totalBilled: r.totalBilled * rate,
    paid:        r.paid        * rate,
    remaining:   r.remaining   * rate,
  }));

  // Compact axis tick — adapts scale (values are already converted, no extra rate multiply).
  const tickFmt = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toString();
  };

  // Full formatter for tooltip — data is pre-converted so pass exchangeRate:1 to avoid
  // double-conversion inside formatMoney.
  const ttFmt = (v) => formatMoney(v, { currency, country, exchangeRate: 1 });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="text-sm font-semibold text-gray-900">Financial Chart</div>
      <div className="text-xs text-gray-500 mt-1">
        {tab === "cashbook"    && "30-day daily collections trend"}
        {tab === "commissions" && "Earned vs Paid per dentist"}
        {tab === "labDues"     && "Remaining dues per lab"}
      </div>

      <div className="mt-4 h-[260px]">
        {tab === "cashbook" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashbookData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2ec4b6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2ec4b6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFmt} />
              <Tooltip formatter={(v) => ttFmt(v)} labelFormatter={(d) => `Date: ${d}`} />
              <Area type="monotone" dataKey="total" stroke="#2ec4b6" fill="url(#colorTotal)" strokeWidth={2} name="Collected" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {tab === "commissions" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFmt} />
              <Tooltip formatter={(v) => ttFmt(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="earned" fill="#2ec4b6" name="Earned" radius={[3, 3, 0, 0]} />
              <Bar dataKey="paid"   fill="#a3e4de" name="Paid"   radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === "labDues" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={labData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFmt} />
              <Tooltip formatter={(v) => ttFmt(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="totalBilled" fill="#e2e8f0" name="Total Billed" radius={[3, 3, 0, 0]} />
              <Bar dataKey="paid"        fill="#2ec4b6" name="Paid"         radius={[3, 3, 0, 0]} />
              <Bar dataKey="remaining"   fill="#f97316" name="Remaining"    radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default OwnerBillingCharts;
