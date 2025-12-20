import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import EditPaymentModal from "@/components/receptionist/EditPaymentModal";
import { useState } from "react";

const PaymentHistory = ({ invoice, onEdit, onDelete }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  if (!invoice) return null;

  return (
    <div className="space-y-2">
      {invoice.payments.map((p) => (
        <div
          key={p.id}
          className="flex justify-between items-center border p-3 rounded"
        >
          <div>
            <p className="font-medium">
              PKR {p.amount} — {p.mode}
            </p>
            <p className="text-sm text-gray-500">{p.date}</p>
          </div>

          <div className="flex gap-2">
            {/* EDIT */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setSelectedPayment(p);
                setEditOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>

            {/* DELETE (NO CONFIRM HERE) */}
            <Button
              size="icon"
              variant="destructive"
              onClick={() => onDelete(p.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      {/* EDIT PAYMENT MODAL */}
      <EditPaymentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        payment={selectedPayment}
        onSave={(amount) => {
          onEdit(selectedPayment.id, amount);
        }}
      />
    </div>
  );
};

export default PaymentHistory;