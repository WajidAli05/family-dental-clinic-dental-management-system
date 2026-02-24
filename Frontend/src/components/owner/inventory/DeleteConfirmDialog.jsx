import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DeleteConfirmDialog = ({ open, title, description, loading, onCancel, onConfirm }) => {
  return (
    <Dialog open={!!open} onOpenChange={(v) => (!v ? onCancel?.() : null)}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title || "Confirm delete"}</DialogTitle>
          {description ? <DialogDescription className="text-sm">{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="outline" className="rounded-xl" onClick={onCancel} disabled={!!loading}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={!!loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmDialog;