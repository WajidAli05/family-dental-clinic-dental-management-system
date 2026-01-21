import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

const OwnerBillingCharts = ({
  tab,
  cashbookChart,
  revenueByDentist,
  commissionChart,
  labDuesChart,
}) => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="text-sm font-semibold text-gray-900">
        Financial Chart
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Quick visual insight based on current filters
      </div>

      <div className="mt-4 h-[280px]">
        {tab === "cashbook" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashbookChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cash" />
              <Line type="monotone" dataKey="card" />
              <Line type="monotone" dataKey="total" />
            </LineChart>
          </ResponsiveContainer>
        ) : null}

        {tab === "revenue" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByDentist}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dentistName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}

        {tab === "commissions" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commissionChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dentistName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" />
              <Bar dataKey="commission" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}

        {tab === "labDues" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={labDuesChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="labName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="dues" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
};

export default OwnerBillingCharts;