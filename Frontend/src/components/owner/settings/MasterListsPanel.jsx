import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const MasterListsPanel = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Treatments & Samples Master Lists
        </h2>
        <p className="text-sm text-gray-500">
          Master data lives in dedicated pages. Use these shortcuts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="font-semibold text-gray-900">Treatments & Documentation</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage treatments, diagnosis templates, clinical findings and doc templates.
          </p>
          <div className="mt-3">
            <Button asChild className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white">
              <Link to="/owner-dashboard/clinical-master">Open</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="font-semibold text-gray-900">Sample Types</h3>
          <p className="text-sm text-gray-500 mt-1">
            Maintain lab sample type master list (used in lab cases).
          </p>
          <div className="mt-3">
            <Button asChild className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white">
              <Link to="/owner-dashboard/lab-management">Open</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterListsPanel;