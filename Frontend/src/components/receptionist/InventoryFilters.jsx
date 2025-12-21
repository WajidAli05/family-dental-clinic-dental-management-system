import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const InventoryFilters = ({
  query,
  setQuery,
  stockFilter,
  setStockFilter,
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Search item..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-64"
      />

      <Select value={stockFilter} onValueChange={setStockFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Stock Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Stock</SelectItem>
          <SelectItem value="InStock">In Stock</SelectItem>
          <SelectItem value="Low">Low Stock</SelectItem>
          <SelectItem value="Out">Out of Stock</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default InventoryFilters;