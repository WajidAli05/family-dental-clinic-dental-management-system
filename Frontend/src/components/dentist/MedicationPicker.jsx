import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { dentistApi } from "@/lib/dentistApi";
import { usePrescriptionStore } from "@/store/prescriptionStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const FORM_OPTIONS = [
  "tablet", "capsule", "syrup", "suspension",
  "injection", "drops", "gel", "mouthwash", "other",
];

const WITH_FOOD_OPTIONS = [
  { value: "before", label: "Before food" },
  { value: "after",  label: "After food"  },
  { value: "with",   label: "With food"   },
  { value: "any",    label: "Any time"    },
];

const Stepper = ({ value, onChange }) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={() => onChange(Math.max(0, (value | 0) - 1))}
      className="w-6 h-6 rounded border bg-gray-100 hover:bg-gray-200 text-sm font-bold leading-none flex items-center justify-center"
    >
      −
    </button>
    <span className="w-5 text-center text-sm font-semibold tabular-nums">{value | 0}</span>
    <button
      type="button"
      onClick={() => onChange(Math.min(10, (value | 0) + 1))}
      className="w-6 h-6 rounded border bg-gray-100 hover:bg-gray-200 text-sm font-bold leading-none flex items-center justify-center"
    >
      +
    </button>
  </div>
);

const EMPTY_NEW = { name: "", genericName: "", form: "tablet", strength: "" };

const MedicationPicker = () => {
  const medications    = usePrescriptionStore((s) => s.medications);
  const addMedication  = usePrescriptionStore((s) => s.addMedication);
  const updateMedication = usePrescriptionStore((s) => s.updateMedication);
  const removeMedication = usePrescriptionStore((s) => s.removeMedication);

  // Combobox
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [searching,   setSearching]   = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  // Inline add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm,     setNewForm]     = useState(EMPTY_NEW);
  const [adding,      setAdding]      = useState(false);
  const [addError,    setAddError]    = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!String(q || "").trim()) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await dentistApi.searchMedications(q);
        setSuggestions(Array.isArray(res.data) ? res.data : []);
        setShowDrop(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, []);

  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  const selectSuggestion = (med) => {
    addMedication({
      medicationId: med.id,
      name:         med.name,
      form:         med.form || "tablet",
      strength:     med.strength || "",
      m: 1, n: 0, e: 1,
      durationDays: 5,
      withFood:     "after",
      instructions: "",
    });
    setQuery("");
    setSuggestions([]);
    setShowDrop(false);
  };

  const handleAddNew = async () => {
    if (!newForm.name.trim()) { setAddError("Name is required"); return; }
    setAddError("");
    setAdding(true);
    try {
      const res = await dentistApi.createMedication(newForm);
      const med = res.data;
      addMedication({
        medicationId: med.id,
        name:         med.name,
        form:         med.form || "tablet",
        strength:     med.strength || "",
        m: 1, n: 0, e: 1,
        durationDays: 5,
        withFood:     "after",
        instructions: "",
      });
      setNewForm(EMPTY_NEW);
      setShowAddForm(false);
    } catch (e) {
      setAddError(e.message || "Failed to add medication");
    } finally {
      setAdding(false);
    }
  };

  const upd = (idx, key, val) => updateMedication(idx, { [key]: val });

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-gray-800">Medications</Label>

      {/* Search combobox */}
      <div ref={wrapperRef} className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search medications…"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => query && suggestions.length > 0 && setShowDrop(true)}
              autoComplete="off"
            />
            {searching && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setShowAddForm((v) => !v); setShowDrop(false); }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {showDrop && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-14 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((med) => (
              <button
                key={med.id}
                type="button"
                onMouseDown={() => selectSuggestion(med)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
              >
                <span className="font-medium">{med.name}</span>
                {med.strength && <span className="text-gray-500 ml-1">{med.strength}</span>}
                {med.form && (
                  <span className="text-gray-400 ml-1 capitalize">({med.form})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline add form */}
      {showAddForm && (
        <div className="rounded-xl border bg-gray-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700">Add new medication to catalog</p>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Name *"
              value={newForm.name}
              onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Generic name"
              value={newForm.genericName}
              onChange={(e) => setNewForm((f) => ({ ...f, genericName: e.target.value }))}
            />
            <Select
              value={newForm.form}
              onValueChange={(v) => setNewForm((f) => ({ ...f, form: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Form" />
              </SelectTrigger>
              <SelectContent>
                {FORM_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Strength (e.g. 500mg)"
              value={newForm.strength}
              onChange={(e) => setNewForm((f) => ({ ...f, strength: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setShowAddForm(false); setAddError(""); setNewForm(EMPTY_NEW); }}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleAddNew} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </div>
        </div>
      )}

      {/* Medication rows */}
      {medications.length > 0 && (
        <div className="space-y-3">
          {medications.map((med, idx) => (
            <div key={idx} className="rounded-xl border bg-white p-3 space-y-3 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-gray-900">{med.name}</span>
                  {med.strength && (
                    <span className="text-gray-500 text-xs ml-1">{med.strength}</span>
                  )}
                  {med.form && (
                    <span className="text-gray-400 text-xs ml-1 capitalize">({med.form})</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMedication(idx)}
                  className="shrink-0 text-red-400 hover:text-red-600 p-0.5 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* M / N / E steppers */}
              <div className="grid grid-cols-3 gap-3">
                {[["Morning", "m"], ["Noon", "n"], ["Evening", "e"]].map(([label, key]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-xs text-gray-500">{label}</p>
                    <Stepper
                      value={med[key]}
                      onChange={(v) => upd(idx, key, v)}
                    />
                  </div>
                ))}
              </div>

              {/* Duration + food */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Duration (days)</p>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={med.durationDays}
                    onChange={(e) =>
                      upd(idx, "durationDays", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">With food</p>
                  <Select
                    value={med.withFood}
                    onValueChange={(v) => upd(idx, "withFood", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WITH_FOOD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Special instructions */}
              <Input
                placeholder="Special instructions (optional)"
                value={med.instructions}
                onChange={(e) => upd(idx, "instructions", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicationPicker;
