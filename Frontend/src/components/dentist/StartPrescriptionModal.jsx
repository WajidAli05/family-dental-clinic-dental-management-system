import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const StartPrescriptionModal = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Patient Type</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Button className="w-full bg-[#2ec4b6]">
            Normal Patient
          </Button>
          <Button variant="outline" className="w-full">
            Ortho Patient
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StartPrescriptionModal;