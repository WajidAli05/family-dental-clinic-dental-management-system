import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import AppToast from "@/components/AppToast";

const PrintInvoiceButton = () => {
  const handlePrint = () => {
    window.print();

    AppToast({
      type: "success",
      title: "Invoice Ready",
      description: "Invoice opened for printing",
    });
  };

  return (
    <Button variant="outline" onClick={handlePrint}>
      <Printer className="w-4 h-4 mr-2" />
      Print
    </Button>
  );
};

export default PrintInvoiceButton;