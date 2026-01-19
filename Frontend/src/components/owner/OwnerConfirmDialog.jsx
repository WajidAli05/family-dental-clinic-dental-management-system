import { Button } from "@/components/ui/button";

const OwnerConfirmDialog = ({ open, title, message, onCancel, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{message}</p>
        </div>
        <div className="p-5 flex items-center justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OwnerConfirmDialog;