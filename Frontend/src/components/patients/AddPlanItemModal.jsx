import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useFormatMoney } from "@/store/clinicConfigStore";
import Odontogram from "@/components/patients/Odontogram";

/**
 * Adds one priced, optionally tooth-linked item to a plan.
 *
 * NO price math happens here. The catalogue arrives already resolved by the
 * server for THIS plan's fee schedule (getTreatmentFee), the price is shown
 * read-only, and the server re-resolves and snapshots it on save.
 */
const AddPlanItemModal = ({ open, onOpenChange, plan, api, odontogram = [], onAdded }) => {
  const { t } = useTranslation();
  const money = useFormatMoney();

  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [treatmentId, setTreatmentId] = useState("");
  const [teeth, setTeeth] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !plan) return;
    setTreatmentId(""); setTeeth([]); setQuantity(1); setNotes("");

    let alive = true;
    setLoading(true);
    api
      .getPlanCatalog({ limit: 500, scheduleId: plan.feeScheduleId || undefined })
      .then((res) => { if (alive) setTreatments(res?.data || []); })
      .catch((e) => { if (alive) toast.error(e.message || t("treatmentPlans.loadError")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, plan, api, t]);

  if (!open || !plan) return null;

  const picked = treatments.find((x) => x.id === treatmentId);
  const unitFee = Number(picked?.fee) || 0;

  const submit = async () => {
    if (!treatmentId) return;
    setSaving(true);
    try {
      await api.addPlanItem(plan.id, {
        treatmentId,
        toothNumbers: teeth,
        quantity: Math.max(1, Number(quantity) || 1),
        notes: notes.trim() || undefined,
      });
      toast.success(t("treatmentPlans.itemAdded"));
      onAdded?.();
    } catch (e) {
      toast.error(e.message || t("treatmentPlans.actionFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("treatmentPlans.addItemTitle")}</DialogTitle>
          <DialogDescription>{t("treatmentPlans.addItemSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label>{t("treatmentPlans.pickTreatment")}</Label>
              <Select value={treatmentId || undefined} onValueChange={setTreatmentId} disabled={loading || saving}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? t("treatmentPlans.loading") : t("treatmentPlans.pickTreatment")} />
                </SelectTrigger>
                <SelectContent>
                  {treatments.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {/* Treatment names are data — never translated. */}
                      {tr.name}{tr.code ? ` (${tr.code})` : ""} — {money(tr.fee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t("treatmentPlans.colQty")}</Label>
              <Input
                type="number" min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Resolved price — read-only, straight from the server's resolver. */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm flex items-center justify-between">
            <span className="text-gray-500">{t("treatmentPlans.resolvedPrice")}</span>
            <span className="font-semibold text-gray-900">
              {money(unitFee)} × {Math.max(1, Number(quantity) || 1)} = {money(unitFee * Math.max(1, Number(quantity) || 1))}
            </span>
          </div>

          <div className="space-y-1">
            <Label>{t("treatmentPlans.selectTeeth")}</Label>
            <p className="text-xs text-gray-500">{t("treatmentPlans.teethOptional")}</p>
            {/* The existing chart in picker mode — one tooth UI in the app. */}
            <Odontogram
              odontogram={odontogram}
              selectable
              selectedTeeth={teeth}
              onToggleSelect={(tooth) =>
                setTeeth((prev) => (prev.includes(tooth) ? prev.filter((x) => x !== tooth) : [...prev, tooth]))
              }
            />
            {teeth.length > 0 && (
              <p className="text-xs text-gray-600">
                {t("treatmentPlans.colTeeth")}: <span className="font-medium">{teeth.join(", ")}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>{t("treatmentPlans.itemNotes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("treatmentPlans.cancel")}
            </Button>
            <Button
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
              disabled={!treatmentId || saving}
              onClick={submit}
            >
              {saving ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <Plus className="h-4 w-4 me-1" />}
              {t("treatmentPlans.addItem")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlanItemModal;
