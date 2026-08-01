import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Calendar, Clock } from "lucide-react";
import { useDentistFinanceStore } from "@/store/dentistFinanceStore";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { useFormatMoney } from "@/store/clinicConfigStore";

const StatCard = ({ icon: Icon, label, value, sub, highlight }) => (
  <div className={`rounded-2xl border p-4 flex gap-3 items-start ${highlight ? "border-[#2ec4b6]/30 bg-[#f0fdfc]" : "border-gray-100 bg-white"}`}>
    <div className={`p-2 rounded-xl ${highlight ? "bg-[#2ec4b6]/10 text-[#2ec4b6]" : "bg-gray-100 text-gray-500"}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-500 truncate">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${highlight ? "text-[#2ec4b6]" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const DentistMyFinance = () => {
  const money = useFormatMoney();
  const { loading, error, data, fetch } = useDentistFinanceStore();

  useEffect(() => { fetch(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2ec4b6] to-[#1a9e92] px-6 py-8 text-white">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">My Finance</h1>
          <p className="mt-1 text-sm text-white/80">
            Commission earnings and payment history
            {data && <span className="ml-2 opacity-70">· Rate: {data.rate}%</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <Card className="rounded-2xl"><CardContent className="p-6"><TableSkeleton rows={4} cols={3} /></CardContent></Card>
      ) : data ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={DollarSign}  label="Earned Today"        value={money(data.earnedToday)}     highlight />
            <StatCard icon={Calendar}    label="Earned This Week"    value={money(data.earnedThisWeek)} />
            <StatCard icon={TrendingUp}  label="Earned This Month"   value={money(data.earnedThisMonth)} />
            <StatCard icon={TrendingUp}  label="Earned This Year"    value={money(data.earnedThisYear)} />
            <StatCard icon={DollarSign}  label="Earned All-Time"     value={money(data.earnedAllTime)} />
            <StatCard icon={DollarSign}  label="Total Paid to Me"    value={money(data.totalPaid)}      sub="Sum of owner payments" />
            <StatCard icon={Clock}       label="Remaining Balance"   value={money(data.remaining)}      sub="All-time earned minus paid" />
          </div>

          {/* Info card */}
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">How commissions work</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your commission rate is <span className="font-semibold text-gray-800">{data.rate}%</span>.
                Commissions accrue on patient invoice payments attributed to you.
                The "Remaining Balance" is your all-time earned minus what the owner has recorded as paid to you.
                Contact the clinic owner to record a payment or update your commission rate.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-gray-500 text-sm">
            No finance data available yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DentistMyFinance;
