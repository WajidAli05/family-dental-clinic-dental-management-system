import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import AppToast from "@/components/AppToast";

const EmailInvoiceButton = ({ email }) => {
  const handleEmail = () => {
    AppToast({
      type: "success",
      title: "Invoice Sent",
      description: `Invoice emailed to ${email}`,
    });
  };

  return (
    <Button variant="outline" onClick={handleEmail}>
      <Mail className="w-4 h-4 mr-2" />
      Email
    </Button>
  );
};

export default EmailInvoiceButton;