import { useEffect, useMemo, useState } from "react";

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
import { useDentistStore } from "@/store/dentistStore";

// API
import { receptionistApi } from "@/lib/receptionistApi";

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
  const { patients, lookupPatient } = usePatientStore();
  const { addSample } = useLabSampleStore();

  const { dentists, fetchAllDentists } = useDentistStore();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false); // patient search
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // dropdown data
  const [labs, setLabs] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [metaLoading, setMetaLoading] = useState(false);

  const [sample, setSample] = useState({
    labId: "",
    dentistId: "",
    sampleTypeId: "",
    teeth: "",
    notes: "",
    status: "Sent",
  });

  const resetState = () => {
    setQuery("");
    setPatient(null);
    setError(null);
    setSample({
      labId: "",
      dentistId: "",
      sampleTypeId: "",
      teeth: "",
      notes: "",
      status: "Sent",
    });
    setNotification(null);
    setIsSubmitting(false);
    setLoading(false);
  };

  // ✅ Load labs + sample types + dentists when modal opens
  useEffect(() => {
    if (!open) return;

    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const [labsRes, typesRes] = await Promise.all([
          receptionistApi.getLabs(),
          receptionistApi.getSampleTypes(),
        ]);

        setLabs(labsRes?.data || []);
        setSampleTypes(typesRes?.data || []);
      } catch (e) {
        // non-fatal: user can’t create without dropdowns though
        setNotification({
          type: "error",
          message: e?.message || "Failed to load labs/sample types.",
        });
      } finally {
        setMetaLoading(false);
      }
    };

    loadMeta();

    if (typeof fetchAllDentists === "function") fetchAllDentists();
  }, [open, fetchAllDentists]);

  const dentistOptions = useMemo(() => dentists || [], [dentists]);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setPatient(null);
    setNotification(null);

    try {
      // ✅ Prefer DB lookup if available
      if (typeof lookupPatient === "function") {
        const found = await lookupPatient(query); // backend lookup by MR/PT-0001/phone
        setPatient(found);
      } else {
        // fallback to local dummy data (won't break other dashboards)
        const found = (patients || []).find(
          (p) =>
            String(p.mr) === String(query) ||
            String(p.phone || "").replace(/\s/g, "") ===
              String(query).replace(/\s/g, "")
        );

        if (!found) throw new Error("Patient not found. Please register patient first.");

        // normalize shape similar to backend lookup
        setPatient({
          id: found.id || found.publicId || `PT-${String(found.mr).padStart(4, "0")}`,
          mr: found.mr,
          name: found.name,
          gender: found.gender,
          age: found.age,
          phone: found.phone,
        });
      }
    } catch (e) {
      setError(e.message || "Patient not found. Please register patient first.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSample = async () => {
    if (!patient) {
      setNotification({
        type: "error",
        message: "Please search and select a patient first.",
      });
      return;
    }

    if (!sample.labId || !sample.dentistId || !sample.sampleTypeId) {
      setNotification({
        type: "error",
        message: "Please select Lab, Dentist, and Sample Type.",
      });
      return;
    }

    if (!sample.teeth.trim()) {
      setNotification({
        type: "error",
        message: "Teeth are required.",
      });
      return;
    }

    const teethArray = sample.teeth
      .split(",")
      .map((t) => t.replace("#", "").trim())
      .filter(Boolean);

    if (teethArray.length === 0) {
      setNotification({
        type: "error",
        message: "Please enter valid tooth numbers (e.g. 12, 14).",
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      // ✅ Real DB create
      await addSample({
        patientId: patient.id, // PT-0001
        labId: sample.labId, // LAB publicId
        dentistId: sample.dentistId, // Dentist publicId
        sampleTypeId: sample.sampleTypeId, // SampleType publicId
        teeth: teethArray,
        notes: sample.notes || "",
      });

      setNotification({
        type: "success",
        message: "Lab sample added successfully.",
      });

      setTimeout(() => {
        resetState();
        onOpenChange(false);
      }, 900);
    } catch (e) {
      setNotification({
        type: "error",
        message: e.message || "Failed to add lab sample.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Lab Sample</DialogTitle>
        </DialogHeader>

        {/* Search Patient */}
        <div className="space-y-2">
          <Label>Search Patient (MR / PT-0001 / Phone)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1 or PT-0001 or 03001234567"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading || isSubmitting}
            />
            <Button
              onClick={handleSearch}
              disabled={!query || loading || isSubmitting}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </div>

        {patient && (
          <>
            <Card className="p-4 bg-gray-50">
              <div className="flex gap-4">
                <User className="text-[#2ec4b6]" />
                <div className="text-sm">
                  <p className="font-semibold">{patient.name}</p>
                  <p className="text-gray-500">
                    ID: {patient.id}
                    {patient.mr ? ` • MR: ${patient.mr}` : ""}
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
              {/* Lab dropdown */}
              <div className="space-y-1">
                <Label>Lab</Label>
                <Select
                  value={sample.labId}
                  onValueChange={(value) => setSample({ ...sample, labId: value })}
                  disabled={metaLoading || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={metaLoading ? "Loading labs..." : "Select lab"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(labs || []).map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dentist dropdown */}
              <div className="space-y-1">
                <Label>Dentist</Label>
                <Select
                  value={sample.dentistId}
                  onValueChange={(value) => setSample({ ...sample, dentistId: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dentist" />
                  </SelectTrigger>
                  <SelectContent>
                    {(dentistOptions || []).map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.name} — {doc.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sample type dropdown */}
              <div className="space-y-1">
                <Label>Sample Type</Label>
                <Select
                  value={sample.sampleTypeId}
                  onValueChange={(value) => setSample({ ...sample, sampleTypeId: value })}
                  disabled={metaLoading || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={metaLoading ? "Loading sample types..." : "Select type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(sampleTypes || []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Teeth (comma separated)</Label>
                <Input
                  placeholder="#12, #14"
                  value={sample.teeth}
                  onChange={(e) => setSample({ ...sample, teeth: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Any notes for lab..."
                  value={sample.notes}
                  onChange={(e) => setSample({ ...sample, notes: e.target.value })}
                  disabled={isSubmitting}
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