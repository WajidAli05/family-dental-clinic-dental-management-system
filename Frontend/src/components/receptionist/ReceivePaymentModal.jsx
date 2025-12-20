import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const ReceivePaymentModal = ({
  open,
  onOpenChange,
  invoice,
  onSubmit,
}) => {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");

  // Reset state every time modal opens
  useEffect(() => {
    if (open) {
      setAmount("");
      setMode("Cash");
    }
  }, [open]);

  if (!invoice) return null;

  const handleConfirm = () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) return;

    onSubmit({
      id: `PAY-${Date.now()}`,
      amount: numericAmount,
      mode,
      date: new Date().toISOString().split("T")[0],
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>
            Receive Payment — {invoice.patientName}
          </DialogTitle>
        </DialogHeader>

        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full border rounded-md p-2"
        >
          <option>Cash</option>
          <option>Card</option>
          <option>Online</option>
        </select>

        <Button
          onClick={handleConfirm}
          disabled={!amount}
          className="bg-[#2ec4b6] hover:bg-[#26a699]"
        >
          Confirm Payment
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ReceivePaymentModal;