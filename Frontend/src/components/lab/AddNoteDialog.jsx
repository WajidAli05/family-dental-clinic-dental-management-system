import { useState } from "react";
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
  const [note, setNote] = useState(sample.note || "");

  const handleSave = () => {
    addNote(sample.id, note);
  };

  return (
    <Dialog>
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
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}