import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ownerApi } from "@/lib/ownerApi";
import { useFormatMoney } from "@/store/clinicConfigStore";

const ALL_STATUSES = [
  { value: "sent", label: "Sent" },
  { value: "in_progress", label: "In Process" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function OwnerLabCaseModal({
  open,
  mode = "create",
  initial = null,
  labs = [],
  dentists = [],
  sampleTypes = [],
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit";
  const money = useFormatMoney();

  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId]         = useState("");
  const [patients, setPatients]           = useState([]);
  const [dentistId, setDentistId]         = useState("");
  const [labId, setLabId]                 = useState("");
  const [sampleTypeId, setSampleTypeId]   = useState("");
  const [teethInput, setTeethInput]       = useState("");
  const [note, setNote]                   = useState("");
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");

  // Pre-fill when editing
  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setPatientSearch(initial.patientName || "");
      setPatientId(initial.patientId || "");
      setDentistId(initial.dentistId || "");
      setLabId(initial.labId || "");
      setSampleTypeId(initial.sampleTypeId || "");
      setTeethInput(Array.isArray(initial.teeth) ? initial.teeth.join(", ") : (initial.teeth || ""));
      setNote(initial.notes || "");
    } else {
      resetForm();
    }
  }, [open, mode, initial]);

  // Patient search (debounced)
  useEffect(() => {
    if (!open || isEdit) return;
    const t = setTimeout(() => {
      if (patientSearch.length < 1) { setPatients([]); return; }
      ownerApi.listPatients({ q: patientSearch, limit: 20 })
        .then((res) => setPatients(res.data || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch, open, isEdit]);

  const resetForm = () => {
    setPatientSearch(""); setPatientId(""); setPatients([]);
    setDentistId(""); setLabId(""); setSampleTypeId("");
    setTeethInput(""); setNote(""); setError("");
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEdit && !patientId) { setError("Select a patient"); return; }
    if (!isEdit && !dentistId) { setError("Select a dentist"); return; }
    if (!labId)         { setError("Select a lab"); return; }
    if (!sampleTypeId)  { setError("Select a sample type"); return; }

    const teeth = teethInput.split(/[,\s]+/).map((t) => t.replace("#", "").trim()).filter(Boolean);
    if (!isEdit && !teeth.length) { setError("Enter at least one tooth number"); return; }

    const payload = isEdit
      ? { labId, sampleTypeId, teeth: teeth.length ? teeth : undefined, note }
      : { patientId, dentistId, labId, sampleTypeId, teeth, note };

    setSaving(true);
    try {
      await onSubmit(payload);
      handleClose();
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lab Case" : "Add Lab Case"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Patient — only for create */}
          {!isEdit && (
            <div className="space-y-1">
              <Label>Patient *</Label>
              <Input
                placeholder="Search patient name or MR…"
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setPatientId(""); }}
              />
              {patients.length > 0 && !patientId && (
                <div className="border rounded-lg max-h-36 overflow-y-auto text-sm shadow-sm">
                  {patients.map((p) => (
                    <div
                      key={p.id || p.publicId}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setPatientId(p.id || p.publicId);
                        setPatientSearch(p.name);
                        setPatients([]);
                      }}
                    >
                      {p.name} {p.mr ? `(MR: ${p.mr})` : ""}
                    </div>
                  ))}
                </div>
              )}
              {patientId && <p className="text-xs text-[#2ec4b6]">✓ {patientSearch}</p>}
            </div>
          )}

          {/* Dentist — only for create */}
          {!isEdit && (
            <div className="space-y-1">
              <Label>Dentist *</Label>
              <Select value={dentistId} onValueChange={setDentistId}>
                <SelectTrigger><SelectValue placeholder="Select dentist…" /></SelectTrigger>
                <SelectContent>
                  {dentists.map((d) => (
                    <SelectItem key={d.id || d.publicId} value={d.id || d.publicId}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lab */}
          <div className="space-y-1">
            <Label>Lab *</Label>
            <Select value={labId} onValueChange={setLabId}>
              <SelectTrigger><SelectValue placeholder="Select lab…" /></SelectTrigger>
              <SelectContent>
                {labs.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sample Type */}
          <div className="space-y-1">
            <Label>Sample Type *</Label>
            <Select value={sampleTypeId} onValueChange={setSampleTypeId}>
              <SelectTrigger><SelectValue placeholder="Select sample type…" /></SelectTrigger>
              <SelectContent>
                {sampleTypes.map((s) => (
                  <SelectItem key={s.id || s.publicId} value={s.id || s.publicId}>
                    {s.name}{s.price > 0 ? ` — ${money(s.price)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teeth */}
          <div className="space-y-1">
            <Label>Tooth Numbers {!isEdit && "*"}</Label>
            <Input
              placeholder="e.g. 14, 15, 16"
              value={teethInput}
              onChange={(e) => setTeethInput(e.target.value)}
            />
            <p className="text-xs text-gray-400">Comma-separated tooth numbers</p>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label>Note</Label>
            <Textarea
              placeholder="Shade, instructions…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="bg-[#2ec4b6] hover:bg-[#26a699]" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
