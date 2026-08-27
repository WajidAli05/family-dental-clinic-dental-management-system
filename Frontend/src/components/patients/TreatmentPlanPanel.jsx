import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useFormatMoney } from "@/store/clinicConfigStore";
import {
  itemStatusKey, planStatusKey, itemBadgeClass, planBadgeClass,
} from "@/lib/treatmentPlanConfig";
import { NESTED_POPOVER } from "@/lib/zLayers";
import AddPlanItemModal from "./AddPlanItemModal";
import SchedulePlanItemModal from "./SchedulePlanItemModal";

/**
 * Treatment plans for one patient.
 *
 * `api` is the caller's role-scoped client, so this panel is role-agnostic —
 * one component serves owner, dentist and receptionist rather than three
 * copies. `canEdit=false` renders read-only (the receptionist case); the
 * SERVER refuses the writes regardless, so this only shapes the UI.
 *
 * No money math happens here: unit prices are snapshotted server-side via the
 * fee resolver and totals arrive derived. The UI only formats via formatMoney.
 */
const TreatmentPlanPanel = ({ patientId, api, canEdit = false, odontogram = [] }) => {
  const { t } = useTranslation();
  const money = useFormatMoney();

  const [plans, setPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [creating, setCreating] = useState(false);
  const [addItemFor, setAddItemFor] = useState(null);
  const [scheduleFor, setScheduleFor] = useState(null); // { planId, itemId }

  const load = useCallback(async () => {
    if (!patientId || !api?.listTreatmentPlans) return;
    setLoading(true);
    try {
      const [plansRes, schedRes] = await Promise.all([
        api.listTreatmentPlans(patientId),
        api.getPlanFeeSchedules?.().catch(() => ({ data: [] })) ?? Promise.resolve({ data: [] }),
      ]);
      setPlans(plansRes?.data || []);
      setSchedules(schedRes?.data || []);
    } catch (e) {
      toast.error(e.message || t("treatmentPlans.loadError"));
    } finally {
      setLoading(false);
    }
  }, [patientId, api, t]);

  useEffect(() => { load(); }, [load]);

  const defaultScheduleId = useMemo(
    () => schedules.find((s) => s.isDefault)?.id || schedules[0]?.id || "",
    [schedules]
  );

  const run = async (planId, fn) => {
    setBusyId(planId);
    try {
      await fn();
      await load();
    } catch (e) {
      toast.error(e.message || t("treatmentPlans.actionFailed"));
    } finally {
      setBusyId("");
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.createTreatmentPlan({ patientId, feeScheduleId: defaultScheduleId || undefined });
      toast.success(t("treatmentPlans.created"));
      await load();
    } catch (e) {
      toast.error(e.message || t("treatmentPlans.actionFailed"));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("treatmentPlans.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-[#2ec4b6]" />
          {t("treatmentPlans.title")}
        </p>
        {canEdit && (
          <Button size="sm" onClick={handleCreate} disabled={creating} className="bg-[#2ec4b6] hover:bg-[#26a699]">
            {creating ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <Plus className="h-4 w-4 me-1" />}
            {t("treatmentPlans.newPlan")}
          </Button>
        )}
      </div>

      {plans.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
          {t("treatmentPlans.empty")}
        </p>
      )}

      {plans.map((plan) => {
        const busy = busyId === plan.id;
        return (
          <div key={plan.id} className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Plan header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-gray-900">{plan.id}</span>
                {plan.title && <span className="text-sm text-gray-600 truncate">— {plan.title}</span>}
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${planBadgeClass(plan.status)}`}>
                  {t(planStatusKey(plan.status))}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Fee schedule this plan quotes from. Switching prices only NEW
                    items — existing lines keep their snapshot (server rule). */}
                {canEdit && schedules.length > 0 ? (
                  <Select
                    value={plan.feeScheduleId || defaultScheduleId || undefined}
                    onValueChange={(v) => run(plan.id, () => api.setPlanFeeSchedule(plan.id, v))}
                    disabled={busy}
                  >
                    <SelectTrigger className="h-7 w-[160px] text-xs">
                      <SelectValue placeholder={t("treatmentPlans.feeSchedule")} />
                    </SelectTrigger>
                    {/* Portaled at z-50 by default, which is BEHIND the
                        z-[60] patient modal — the options rendered but every
                        click landed on the modal instead of the option. */}
                    <SelectContent className={NESTED_POPOVER}>
                      {schedules.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name}{s.isDefault ? ` (${t("treatmentPlans.default")})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-gray-500">
                    {plan.feeScheduleName || t("treatmentPlans.default")}
                  </span>
                )}

                {canEdit && (
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    disabled={busy}
                    onClick={() => run(plan.id, () => api.deleteTreatmentPlan(plan.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white text-gray-500 border-b border-gray-100">
                    <th className="text-start font-semibold py-2 px-3">{t("treatmentPlans.colTreatment")}</th>
                    <th className="text-start font-semibold py-2 px-3">{t("treatmentPlans.colTeeth")}</th>
                    <th className="text-end font-semibold py-2 px-3">{t("treatmentPlans.colUnit")}</th>
                    <th className="text-end font-semibold py-2 px-3">{t("treatmentPlans.colQty")}</th>
                    <th className="text-end font-semibold py-2 px-3">{t("treatmentPlans.colLineTotal")}</th>
                    <th className="text-start font-semibold py-2 px-3">{t("treatmentPlans.colStatus")}</th>
                    {canEdit && <th className="text-end font-semibold py-2 px-3">{t("treatmentPlans.colActions")}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plan.items.length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 7 : 6} className="py-4 text-center text-gray-400">
                        {t("treatmentPlans.noItems")}
                      </td>
                    </tr>
                  )}

                  {plan.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="py-2 px-3">
                        {/* Treatment names are data — never translated. */}
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.notes && <div className="text-[11px] text-gray-500">{item.notes}</div>}
                      </td>
                      <td className="py-2 px-3 text-gray-700">
                        {item.toothNumbers.length ? item.toothNumbers.join(", ") : "—"}
                      </td>
                      <td className="py-2 px-3 text-end text-gray-700 whitespace-nowrap">{money(item.unitFee)}</td>
                      <td className="py-2 px-3 text-end text-gray-700">{item.quantity}</td>
                      <td className="py-2 px-3 text-end font-semibold text-gray-900 whitespace-nowrap">{money(item.lineTotal)}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${itemBadgeClass(item.status)}`}>
                          {t(itemStatusKey(item.status))}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {/* allowedNext comes from the server — the UI never
                                guesses which transitions are legal. */}
                            {(item.allowedNext || []).map((next) => (
                              <Button
                                key={next}
                                size="sm" variant="outline"
                                className="h-6 px-2 text-[11px]"
                                disabled={busy}
                                onClick={() => {
                                  if (next === "scheduled") {
                                    return setScheduleFor({ planId: plan.id, itemId: item.id });
                                  }
                                  return run(plan.id, () => api.setPlanItemStatus(plan.id, item.id, next));
                                }}
                              >
                                {t(itemStatusKey(next))}
                              </Button>
                            ))}
                            <Button
                              size="sm" variant="ghost"
                              className="h-6 px-1.5 text-red-500 hover:bg-red-50"
                              disabled={busy}
                              onClick={() => run(plan.id, () => api.removePlanItem(plan.id, item.id))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer — derived totals, never stored */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2">
              {canEdit ? (
                <Button
                  size="sm" variant="outline" className="h-7 text-xs"
                  disabled={busy}
                  onClick={() => setAddItemFor(plan)}
                >
                  <Plus className="h-3.5 w-3.5 me-1" />{t("treatmentPlans.addItem")}
                </Button>
              ) : <span />}

              <div className="flex items-center gap-4 text-sm">
                {plan.acceptedTotal !== plan.totalEstimate && (
                  <span className="text-gray-500">
                    {t("treatmentPlans.acceptedTotal")}:{" "}
                    <span className="font-semibold text-gray-700">{money(plan.acceptedTotal)}</span>
                  </span>
                )}
                <span className="text-gray-600">
                  {t("treatmentPlans.total")}:{" "}
                  <span className="font-bold text-gray-900">{money(plan.totalEstimate)}</span>
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <SchedulePlanItemModal
        open={!!scheduleFor}
        patientId={patientId}
        api={api}
        /* A dentist books onto their own diary (server forces their id), so no
           dentist picker is shown for them. */
        canPickDentist={!!api.getDentists}
        onOpenChange={(v) => { if (!v) setScheduleFor(null); }}
        onPick={(appointmentId) => {
          const { planId, itemId } = scheduleFor;
          setScheduleFor(null);
          run(planId, () => api.setPlanItemStatus(planId, itemId, "scheduled", { appointmentId }));
        }}
        onBooked={async (booking) => {
          // Books AND links in one server action — errors propagate so the
          // modal can surface a slot conflict without closing.
          const { planId, itemId } = scheduleFor;
          await api.bookAppointmentForPlanItem(planId, itemId, booking);
          setScheduleFor(null);
          toast.success(t("treatmentPlans.bookedAndScheduled"));
          await load();
        }}
      />

      <AddPlanItemModal
        open={!!addItemFor}
        plan={addItemFor}
        api={api}
        odontogram={odontogram}
        onOpenChange={(v) => { if (!v) setAddItemFor(null); }}
        onAdded={() => { setAddItemFor(null); load(); }}
      />
    </div>
  );
};

export default TreatmentPlanPanel;
