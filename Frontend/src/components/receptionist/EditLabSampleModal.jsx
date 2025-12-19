import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLabSampleStore } from "@/store/labSampleStore";
import { Loader2 } from "lucide-react";

const EditLabSampleModal = ({ open, onOpenChange, sample }) => {
  const { updateSample } = useLabSampleStore();

  const [form, setForm] = useState({
    lab: "",
    teeth: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sample) {
      setForm({
        lab: sample.lab,
        teeth: Array.isArray(sample.teeth)
          ? sample.teeth.join(", ")
          : "",
      });
    }
  }, [sample]);

  const handleSubmit = () => {
    if (!form.lab || !form.teeth) return;

    setLoading(true);

    const teethArray = form.teeth
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setTimeout(() => {
      updateSample(sample.id, {
        lab: form.lab,
        teeth: teethArray,
      });

      setLoading(false);
      onOpenChange(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Lab Sample</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Lab Name</Label>
            <Input
              value={form.lab}
              onChange={(e) =>
                setForm({ ...form, lab: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Teeth</Label>
            <Input
              value={form.teeth}
              onChange={(e) =>
                setForm({ ...form, teeth: e.target.value })
              }
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#2ec4b6]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating
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