import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Calendar, User, Phone } from "lucide-react";
import { dentistApi } from "@/lib/dentistApi";
import { localISODate } from "@/utils/localISODate";
import { toast } from "sonner";
import AppointmentTypeSelect from "@/components/appointments/AppointmentTypeSelect";

const DentistBookAppointmentModal = ({ open, onOpenChange, onSuccess }) => {
  const [query, setQuery]           = useState("");
  const [searching, setSearching]   = useState(false);
  const [results, setResults]       = useState([]);
  const [patient, setPatient]       = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: localISODate(),
    time: "",
    appointmentType: "",
    reason: "",
    notes: "",
  });

  const reset = () => {
    setQuery(""); setSearching(false); setResults([]); setPatient(null);
    setSubmitting(false);
    setForm({ date: localISODate(), time: "", appointmentType: "", reason: "", notes: "" });
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  const searchPatients = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setPatient(null);
    try {
      const res = await dentistApi.getPatients({ q: query.trim(), limit: 10 });
      setResults(res.data || []);
    } catch (e) {
      toast.error(e.message || "Patient search failed");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSubmit = async () => {
    if (!patient) return toast.error("Select a patient first");
    if (!form.date) return toast.error("Date is required");
    if (!form.time) return toast.error("Time is required");

    setSubmitting(true);
    try {
      await dentistApi.createAppointment({
        patientId: patient.id,
        date: form.date,
        time: form.time,
        appointmentType: form.appointmentType,
        reason: form.reason,
        notes: form.notes,
      });
      toast.success("Appointment booked");
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to book appointment");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
        </DialogHeader>

        {/* Patient search */}
        <div className="space-y-2">
          <Label>Search Patient (name / MR / phone)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Ali or PT-0001 or 0300..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPatients()}
              disabled={submitting}
            />
            <Button
              onClick={searchPatients}
              disabled={!query.trim() || searching || submitting}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && !patient && (
          <div className="border rounded-xl divide-y max-h-40 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                onClick={() => { setPatient(p); setResults([]); }}
              >
                <span className="font-semibold">{p.name}</span>{" "}
                <span className="text-gray-500">{p.id} · {p.phone}</span>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && query && !searching && !patient && (
          <p className="text-sm text-gray-500">No patients found. Try a different search.</p>
        )}

        {/* Selected patient card */}
        {patient && (
          <Card className="p-3 bg-gray-50 flex items-start gap-3">
            <User className="text-[#2ec4b6] mt-0.5" size={18} />
            <div className="text-sm flex-1">
              <p className="font-semibold">{patient.name}</p>
              <p className="text-gray-500">{patient.id} · {patient.gender}, {patient.age}</p>
              <p className="text-gray-500 flex items-center gap-1">
                <Phone size={12} /> {patient.phone}
              </p>
            </div>
            <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setPatient(null)}>
              Change
            </button>
          </Card>
        )}

        {/* Form */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1">
            <Label>Time</Label>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              disabled={submitting}
            />
          </div>
          <div className="col-span-2">
            <AppointmentTypeSelect
              value={form.appointmentType}
              onChange={(v) => setForm({ ...form, appointmentType: v })}
              disabled={submitting}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Reason</Label>
            <Input
              placeholder="Consultation, follow-up..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              disabled={submitting}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Input
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !patient}
            className="bg-[#2ec4b6] hover:bg-[#26a699]"
          >
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Booking...</> : <><Calendar className="w-4 h-4 mr-2" />Confirm</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DentistBookAppointmentModal;
