import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ownerApi } from "@/lib/ownerApi";
import { toast } from "sonner";

const EMPTY = {
  name: "", phone: "", age: "", gender: "", address: "",
  city: "", email: "", lastVisit: "",
};

const AddEditPatientModal = ({ open, patient, onOpenChange, onSuccess }) => {
  const isEdit = !!patient;
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);

  const [phoneWarning, setPhoneWarning] = useState([]);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);

  useEffect(() => {
    if (open) {
      setPhoneWarning([]);
      setAcknowledgedDuplicate(false);
      setForm(patient
        ? {
            name:      patient.name      || "",
            phone:     patient.phone     || "",
            age:       patient.age       != null ? String(patient.age) : "",
            gender:    patient.gender    || "",
            address:   patient.address   || "",
            city:      patient.city      || "",
            email:     patient.email     || "",
            lastVisit: patient.lastVisit || "",
          }
        : { ...EMPTY }
      );
    }
  }, [open, patient]);

  const f = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "phone") {
      setPhoneWarning([]);
      setAcknowledgedDuplicate(false);
    }
  };

  const handlePhoneBlur = async () => {
    if (isEdit) return; // warning only on add
    const phone = form.phone.trim();
    if (!phone) return;
    try {
      const res = await ownerApi.checkPhone(phone);
      setPhoneWarning(res?.data || []);
    } catch {
      // silently ignore
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim())    return toast.error("Name is required");
    if (!form.phone.trim())   return toast.error("Phone is required");
    if (!form.address.trim()) return toast.error("Address is required");

    const ageNum = form.age !== "" ? Number(form.age) : null;
    if (ageNum !== null && (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      return toast.error("Age must be 1–120");
    }

    setSubmitting(true);
    try {
      const body = {
        name:      form.name.trim(),
        phone:     form.phone.trim(),
        address:   form.address.trim(),
        city:      form.city.trim(),
        email:     form.email.trim(),
        gender:    form.gender,
        lastVisit: form.lastVisit,
        ...(ageNum !== null ? { age: ageNum } : {}),
      };

      if (!isEdit && acknowledgedDuplicate) body.allowDuplicatePhone = true;

      if (isEdit) {
        await ownerApi.updatePatient(patient.id, body);
        toast.success("Patient updated");
      } else {
        await ownerApi.createPatient(body);
        toast.success("Patient added");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to save patient");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Patient" : "Add Patient"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={f("name")} disabled={submitting} placeholder="e.g. Ali Raza" />
          </div>

          <div className="space-y-1">
            <Label>Phone *</Label>
            <Input
              value={form.phone}
              onChange={f("phone")}
              onBlur={handlePhoneBlur}
              disabled={submitting}
              placeholder="0300..."
            />
            {/* Family-sharing warning (add only) */}
            {!isEdit && phoneWarning.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs mt-1">
                <p className="font-medium text-amber-800 mb-1">
                  {phoneWarning.length} patient{phoneWarning.length > 1 ? "s" : ""} already use this number:
                </p>
                <ul className="list-disc list-inside text-amber-700 mb-2 space-y-0.5">
                  {phoneWarning.map((p) => (
                    <li key={p.publicId}>
                      {p.name}
                      {p.publicId ? ` (${p.publicId})` : ""}
                      {p.age ? `, age ${p.age}` : ""}
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 cursor-pointer text-amber-900 select-none">
                  <input
                    type="checkbox"
                    checked={acknowledgedDuplicate}
                    onChange={(e) => setAcknowledgedDuplicate(e.target.checked)}
                    className="accent-amber-600"
                  />
                  Different family member — register anyway
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Age (1–120)</Label>
            <Input type="number" min="1" max="120" value={form.age} onChange={f("age")} disabled={submitting} placeholder="e.g. 30" />
          </div>

          <div className="space-y-1">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v }))} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={f("email")} disabled={submitting} placeholder="Optional" />
          </div>

          <div className="col-span-2 space-y-1">
            <Label>Address *</Label>
            <Input value={form.address} onChange={f("address")} disabled={submitting} placeholder="Street / area" />
          </div>

          <div className="space-y-1">
            <Label>City</Label>
            <Input value={form.city} onChange={f("city")} disabled={submitting} placeholder="e.g. Rawalpindi" />
          </div>

          <div className="space-y-1">
            <Label>Last Visit</Label>
            <Input type="date" value={form.lastVisit} onChange={f("lastVisit")} disabled={submitting} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-[#2ec4b6] hover:bg-[#26a699]">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (isEdit ? "Save Changes" : "Add Patient")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditPatientModal;
