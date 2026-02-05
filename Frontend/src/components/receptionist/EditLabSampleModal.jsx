import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useLabSampleStore } from "@/store/labSampleStore";
import { receptionistApi } from "@/lib/receptionistApi";

const EditLabSampleModal = ({ open, onOpenChange, sample }) => {
  const { editSample, updateSample } = useLabSampleStore();

  const [labs, setLabs] = useState([]);
  const [metaLoading, setMetaLoading] = useState(false);

  const [form, setForm] = useState({
    labId: "",
    teeth: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const currentLabId = useMemo(() => {
    // sample.lab may be a name in UI
    // If your store maps `labId` too, it will use that; otherwise we match by name.
    if (!sample) return "";
    return sample.labId || "";
  }, [sample]);

  // Load labs when modal opens
  useEffect(() => {
    if (!open) return;

    const loadLabs = async () => {
      setMetaLoading(true);
      try {
        const res = await receptionistApi.getLabs();
        setLabs(res?.data || []);
      } catch (e) {
        setNotification({
          type: "error",
          message: e?.message || "Failed to load labs.",
        });
      } finally {
        setMetaLoading(false);
      }
    };

    loadLabs();
  }, [open]);

  // Populate form from sample
  useEffect(() => {
    if (!sample) return;

    // Try to resolve labId:
    // - If sample.labId exists, use it
    // - else match by lab name against labs list once loaded
    const resolvedLabId =
      sample.labId ||
      (labs.find((l) => String(l.name).toLowerCase() === String(sample.lab).toLowerCase())?.id ?? "");

    setForm({
      labId: resolvedLabId,
      teeth: Array.isArray(sample.teeth) ? sample.teeth.join(", ") : "",
      notes: sample.comments || sample.note || "",
    });

    setNotification(null);
  }, [sample, labs]);

  const handleSubmit = async () => {
    if (!sample?.id) return;

    if (!form.labId || !form.teeth.trim()) {
      setNotification({
        type: "error",
        message: "Lab and teeth are required.",
      });
      return;
    }

    const teethArray = form.teeth
      .split(",")
      .map((t) => String(t).replace("#", "").trim())
      .filter(Boolean);

    if (teethArray.length === 0) {
      setNotification({
        type: "error",
        message: "Please enter valid tooth numbers (e.g. 12, 14).",
      });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      const payload = {
        labId: form.labId,     // ✅ backend can resolve to ObjectId
        teeth: teethArray,     // ✅ ["12","14"]
        notes: form.notes || "", // backend should store into `note`
      };

      // ✅ Prefer real DB edit method if available
      if (typeof editSample === "function") {
        await editSample(sample.id, payload);
      } else {
        // fallback (won't break other dashboards)
        await updateSample(sample.id, payload);
      }

      setNotification({
        type: "success",
        message: "Sample updated successfully.",
      });

      setTimeout(() => {
        setLoading(false);
        onOpenChange(false);
      }, 600);
    } catch (e) {
      setLoading(false);
      setNotification({
        type: "error",
        message: e.message || "Failed to update sample.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setNotification(null);
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lab Sample</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lab dropdown */}
          <div className="space-y-1">
            <Label>Lab</Label>
            <Select
              value={form.labId}
              onValueChange={(value) => setForm({ ...form, labId: value })}
              disabled={metaLoading || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={metaLoading ? "Loading labs..." : "Select lab"} />
              </SelectTrigger>
              <SelectContent>
                {labs.map((lab) => (
                  <SelectItem key={lab.id} value={lab.id}>
                    {lab.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teeth */}
          <div className="space-y-1">
            <Label>Teeth (comma separated)</Label>
            <Input
              value={form.teeth}
              onChange={(e) => setForm({ ...form, teeth: e.target.value })}
              placeholder="#12, #14"
              disabled={loading}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any note..."
              disabled={loading}
            />
          </div>

          {/* Notification */}
          {notification && (
            <Alert
              className={
                notification.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }
            >
              <AlertDescription>{notification.message}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#2ec4b6] hover:bg-[#26a699]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Sample"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLabSampleModal;