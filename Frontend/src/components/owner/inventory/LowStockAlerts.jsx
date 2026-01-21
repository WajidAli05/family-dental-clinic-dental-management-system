const LowStockAlerts = ({ data = [] }) => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-900">Low Stock Alerts</h3>
          <p className="text-sm text-gray-500">Items at or below reorder level</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((i) => (
          <div
            key={i.id}
            className="rounded-2xl border border-gray-100 p-4 bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">{i.name}</p>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                {i.qty === 0 ? "Out" : "Low"}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              SKU: {i.sku} • {i.qty} {i.unit} left • Reorder at {i.reorderLevel}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LowStockAlerts;