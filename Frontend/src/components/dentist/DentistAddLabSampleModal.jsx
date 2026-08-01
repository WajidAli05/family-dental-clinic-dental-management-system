import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dentistApi } from "@/lib/dentistApi";
import { useDentistCasesStore } from "@/store/dentistCasesStore";
import { useFormatMoney } from "@/store/clinicConfigStore";

export default function DentistAddLabSampleModal({ open, onClose }) {
  const { addCase } = useDentistCasesStore();
  const money = useFormatMoney();

  const [patients, setPatients]     = useState([]);
  const [labs, setLabs]             = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId]         = useState("");
  const [labId, setLabId]                 = useState("");
  const [sampleTypeId, setSampleTypeId]   = useState("");
  const [teethInput, setTeethInput]       = useState("");
  const [note, setNote]                   = useState("");
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");

  // Load dropdowns when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingData(true);
    Promise.all([
      dentistApi.getLabs(),
      dentistApi.getCatalogSampleTypes({ limit: 200 }),
    ])
      .then(([labsRes, stRes]) => {
        setLabs(labsRes.data || []);
        setSampleTypes(stRes.rows || stRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [open]);

  // Debounced patient search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (patientSearch.length < 1) { setPatients([]); return; }
      dentistApi.getPatients({ q: patientSearch, limit: 20 })
        .then((res) => setPatients(res.data || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch, open]);

  const resetForm = () => {
    setPatientSearch(""); setPatientId(""); setLabId(""); setSampleTypeId("");
    setTeethInput(""); setNote(""); setError("");
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const teeth = teethInput.split(/[,\s]+/).map((t) => t.replace("#", "").trim()).filter(Boolean);
    if (!patientId) { setError("Select a patient"); return; }
    if (!labId)     { setError("Select a lab"); return; }
    if (!sampleTypeId) { setError("Select a sample type"); return; }
    if (!teeth.length) { setError("Enter at least one tooth number"); return; }

    setSaving(true);
    try {
      await addCase({ patientId, labId, sampleTypeId, teeth, note });
      handleClose();
    } catch (e) {
      setError(e.message || "Failed to create lab sample");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Lab Sample</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Patient search */}
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
            {patientId && (
              <p className="text-xs text-[#2ec4b6]">✓ {patientSearch}</p>
            )}
          </div>

          {/* Lab */}
          <div className="space-y-1">
            <Label>Lab *</Label>
            <Select value={labId} onValueChange={setLabId} disabled={loadingData}>
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
            <Select value={sampleTypeId} onValueChange={setSampleTypeId} disabled={loadingData}>
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
            <Label>Tooth Numbers *</Label>
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
              {saving ? "Saving…" : "Create Sample"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
