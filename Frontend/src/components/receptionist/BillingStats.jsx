import StatCard from "@/components/receptionist/StatCard";
import StatsGrid from "@/components/receptionist/StatsGrid";
import { Clock, CreditCard, CheckCircle } from "lucide-react";
import { useClinicConfig } from "@/store/clinicConfigStore";

const BillingStats = ({ stats }) => {
  const { currency } = useClinicConfig();
  return (
    <StatsGrid>
      <StatCard title="Pending" value={stats.pending} icon={Clock} />
      <StatCard title="Partial" value={stats.partial} icon={CreditCard} />
      <StatCard title="Paid" value={stats.paid} icon={CheckCircle} />
      <StatCard title={`Outstanding (${currency})`} value={stats.outstanding} icon={CreditCard} />
    </StatsGrid>
  );
};

export default BillingStats;