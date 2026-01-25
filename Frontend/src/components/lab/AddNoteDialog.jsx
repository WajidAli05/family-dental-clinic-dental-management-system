import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { useLabStore } from "@/store/labStore";

export default function AddNoteDialog({ sample }) {
  const { addNote } = useLabStore();

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(sample.note || "");
  const [saving, setSaving] = useState(false);

  // Keep note synced when dialog opens (important after list refresh)
  useEffect(() => {
    if (open) setNote(sample.note || "");
  }, [open, sample.note]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await addNote(sample.id, note);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <MessageSquare
            size={16}
            className={sample.note ? "text-blue-600" : "text-gray-600"}
          />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Notes – {sample.id}</DialogTitle>
        </DialogHeader>

        <Textarea
          placeholder="Enter lab notes here..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[120px]"
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}