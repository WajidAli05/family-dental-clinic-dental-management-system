import { useState } from "react";

// UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Stores
import { usePatientStore } from "@/store/patientStore";
import { useLabSampleStore } from "@/store/labSampleStore";

// Icons
import {
  Search,
  Loader2,
  User,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const AddLabSampleModal = ({ open, onOpenChange }) => {
  const { patients } = usePatientStore();
  const { addSample } = useLabSampleStore();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [sample, setSample] = useState({
    lab: "",
    teeth: "",
    status: "Sent",
  });

  const resetState = () => {
    setQuery("");
    setPatient(null);
    setError(null);
    setSample({ lab: "", teeth: "", status: "Sent" });
    setNotification(null);
    setIsSubmitting(false);
  };

  const handleSearch = () => {
    setLoading(true);
    setError(null);
    setPatient(null);

    setTimeout(() => {
      const found = patients.find(
        (p) =>
          p.mr.toString() === query ||
          p.phone.replace(/\s/g, "") === query.replace(/\s/g, "")
      );

      if (!found) {
        setError("Patient not found. Please register patient first.");
      } else {
        setPatient(found);
      }

      setLoading(false);
    }, 1000);
  };

const handleAddSample = () => {
  if (!patient) {
    setNotification({
      type: "error",
      message: "Please search and select a patient first.",
    });
    return;
  }

  if (!sample.lab.trim() || !sample.teeth.trim()) {
    setNotification({
      type: "error",
      message: "Lab name and teeth are required.",
    });
    return;
  }

  setIsSubmitting(true);
  setNotification(null);

  const teethArray = sample.teeth
    .split(",")
    .map((t) => t.replace("#", "").trim())
    .filter(Boolean);

  if (teethArray.length === 0) {
    setNotification({
      type: "error",
      message: "Please enter valid tooth numbers.",
    });
    setIsSubmitting(false);
    return;
  }

  setTimeout(() => {
    addSample({
      id: `LS-${Date.now()}`,
      patientName: patient.name,
      mr: patient.mr,
      lab: sample.lab,
      teeth: teethArray, // ✅ always array
      status: "Sent",
      paymentStatus: "Pending",
      comments: "",
      sentDate: new Date().toISOString().split("T")[0],
      receivedDate: null,
    });

    setNotification({
      type: "success",
      message: "Lab sample added successfully.",
    });

    setTimeout(() => {
      resetState();
      onOpenChange(false);
    }, 1200);
  }, 1200);
};

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Lab Sample</DialogTitle>
        </DialogHeader>

        {/* Search Patient */}
        <div className="space-y-2">
          <Label>Search Patient (MR or Phone)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1 or +923001234567"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              onClick={handleSearch}
              disabled={!query || loading}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {patient && (
          <>
            <Card className="p-4 bg-gray-50">
              <div className="flex gap-4">
                <User className="text-[#2ec4b6]" />
                <div className="text-sm">
                  <p className="font-semibold">{patient.name}</p>
                  <p className="text-gray-500">
                    MR: {patient.mr}
                  </p>
                  <p className="text-gray-500 flex gap-1 items-center">
                    <Phone size={14} />
                    {patient.phone}
                  </p>
                </div>
              </div>
            </Card>

            {/* Sample Fields */}
            <div className="grid gap-4">
              <div>
                <Label>Lab Name</Label>
                <Input
                  value={sample.lab}
                  onChange={(e) =>
                    setSample({ ...sample, lab: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Teeth (comma separated)</Label>
                <Input
                  placeholder="#12, #14"
                  value={sample.teeth}
                  onChange={(e) =>
                    setSample({ ...sample, teeth: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Notification */}
            {notification && (
              <Alert
                className={`${
                  notification.type === "success"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="ml-2">
                  {notification.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSample}
                disabled={isSubmitting}
                className="bg-[#2ec4b6] hover:bg-[#26a699]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Sample"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddLabSampleModal;