import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { printInvoice } from "@/utils/printInvoice";

/**
 * Downloads the itemised invoice PDF.
 *
 * Previously called a bare window.print(), which printed whatever happened to
 * be on screen and ignored the invoice entirely. It now goes through the same
 * printInvoice generator the billing table uses, so there is one invoice
 * layout in the app rather than two.
 */
const PrintInvoiceButton = ({ invoice, size = "sm", variant = "outline" }) => {
  const { t } = useTranslation();
  if (!invoice) return null;

  return (
    <Button size={size} variant={variant} onClick={() => printInvoice(invoice)}>
      <Printer className="w-4 h-4 me-2" />
      {t("invoices.print")}
    </Button>
  );
};

export default PrintInvoiceButton;
