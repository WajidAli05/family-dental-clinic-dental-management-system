import StatCard from "@/components/receptionist/StatCard";
import StatsGrid from "@/components/receptionist/StatsGrid";
import { Clock, CreditCard, CheckCircle } from "lucide-react";

const BillingStats = ({ stats }) => (
  <StatsGrid>
    <StatCard title="Pending" value={stats.pending} icon={Clock} />
    <StatCard title="Partial" value={stats.partial} icon={CreditCard} />
    <StatCard title="Paid" value={stats.paid} icon={CheckCircle} />
    <StatCard title="Outstanding (PKR)" value={stats.outstanding} icon={CreditCard} />
  </StatsGrid>
);

export default BillingStats;