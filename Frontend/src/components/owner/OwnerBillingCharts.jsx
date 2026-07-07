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

const fmt = (v) => `PKR ${Number(v || 0).toLocaleString("en-PK")}`;

const OwnerBillingCharts = ({ tab, trendData = [], commissionRows = [], labDuesRows = [] }) => {
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
            <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2ec4b6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2ec4b6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} labelFormatter={(d) => `Date: ${d}`} />
              <Area type="monotone" dataKey="total" stroke="#2ec4b6" fill="url(#colorTotal)" strokeWidth={2} name="Collected" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {tab === "commissions" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commissionRows} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="earned" fill="#2ec4b6" name="Earned" radius={[3, 3, 0, 0]} />
              <Bar dataKey="paid"   fill="#a3e4de" name="Paid"   radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === "labDues" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={labDuesRows} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
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
