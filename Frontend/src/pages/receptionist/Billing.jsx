import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Wavify from "react-wavify";

import { useBillingStore } from "@/store/billingStore";

import BillingStats from "@/components/receptionist/BillingStats";
import InvoiceFilters from "@/components/receptionist/InvoiceFilters";
import InvoiceTable from "@/components/receptionist/InvoiceTable";
import ReceivePaymentModal from "@/components/receptionist/ReceivePaymentModal";
import PaymentHistory from "@/components/receptionist/PaymentHistory";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

import { printInvoice } from "@/utils/printInvoice";

const Billing = () => {
  const {
    invoices,
    addPayment,
    updatePayment,
    deletePayment,
    getStats,
  } = useBillingStore();

  const stats = getStats();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedInvoice = invoices.find(
    (i) => i.id === selectedInvoiceId
  );

  const filtered = invoices.filter((i) => {
    const q = query.toLowerCase();
    return (
      (status === "All" || i.status === status) &&
      (i.patientName.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{
            height: 20,
            amplitude: 30,
            speed: 0.15,
            points: 3,
          }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold">
            Billing & Payments
          </h1>
          <p className="text-gray-500">
            Manage invoices, payments and receipts
          </p>
        </div>
      </div>

      {/* Stats */}
      <BillingStats stats={stats} />

      {/* Invoices */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <InvoiceFilters
            query={query}
            setQuery={setQuery}
            status={status}
            setStatus={setStatus}
          />

          <InvoiceTable
            data={filtered}
            onPay={(inv) => {
              setSelectedInvoiceId(inv.id);
              setIsPaymentOpen(true);
            }}
            onPrint={(inv) => printInvoice(inv)}
          />

          {selectedInvoice && (
            <PaymentHistory
              invoice={selectedInvoice}
              onEdit={(paymentId, amount) =>
                updatePayment(
                  selectedInvoice.id,
                  paymentId,
                  amount
                )
              }
              onDelete={(paymentId) => {
                setDeletePaymentId(paymentId);
                setConfirmOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Receive Payment */}
      <ReceivePaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        invoice={selectedInvoice}
        onSubmit={(payment) =>
          addPayment(selectedInvoice.id, payment)
        }
      />

      {/* Confirm Delete */}
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Payment?"
        description="This payment will be permanently removed. Are you sure?"
        onConfirm={() => {
          if (!selectedInvoice || !deletePaymentId) return;

          deletePayment(selectedInvoice.id, deletePaymentId);
          setDeletePaymentId(null);
        }}
      />
    </div>
  );
};

export default Billing;