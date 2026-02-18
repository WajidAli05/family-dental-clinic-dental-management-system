import { useEffect, useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerPatientsStore } from "@/store/ownerPatientsStore";

const Pill = ({ children }) => (
  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
    {children}
  </span>
);

const OwnerPatientProfileModal = ({ open, patient, onClose }) => {
  const seedDemoProfile = useOwnerPatientsStore((s) => s.seedDemoProfile);
  const fetchProfile = useOwnerPatientsStore((s) => s.fetchProfile);
  const confirmAndDeletePatient = useOwnerPatientsStore((s) => s.confirmAndDeletePatient);
  const loading = useOwnerPatientsStore((s) => s.loading);

  const [profileState, setProfileState] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!open || !patient?.id) return;

      // instant UI
      setProfileState(seedDemoProfile(patient.id));

      // real profile
      const real = await fetchProfile(patient.id);
      if (alive && real) setProfileState(real);
    }

    run();
    return () => {
      alive = false;
    };
  }, [open, patient?.id, seedDemoProfile, fetchProfile]);

  const profile = useMemo(() => {
    return profileState || { history: [], invoices: [], labs: [], treatments: [] };
  }, [profileState]);

  if (!open || !patient) return null;

  const alreadyInactive = String(patient.status || "").toLowerCase() === "inactive";

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {patient.name}
            </h3>
            <p className="text-xs text-gray-500">
              {patient.id} • {patient.phone} • {patient.city}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>Age: {patient.age ?? "-"}</Pill>
              <Pill>Gender: {patient.gender ?? "-"}</Pill>
              <Pill>Dentist: {patient.dentist ?? "-"}</Pill>
              <Pill>Last Visit: {patient.lastVisit ?? "-"}</Pill>
              <Pill>Status: {patient.status ?? "-"}</Pill>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={loading || alreadyInactive}
              onClick={() => setConfirmOpen(true)}
              title={alreadyInactive ? "Patient is already inactive" : undefined}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? "Updating..." : "Delete"}
            </Button>

            <Button variant="ghost" className="rounded-xl" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
          <Panel title="History">
            <Timeline items={profile.history} />
          </Panel>

          <Panel title="Invoices">
            <SimpleList
              items={profile.invoices.map((x) => ({
                left: x.id,
                right: `${x.date} • PKR ${x.amount} • ${x.status}`,
              }))}
              empty="No invoices found."
            />
          </Panel>

          <Panel title="Lab Samples">
            <SimpleList
              items={profile.labs.map((x) => ({
                left: x.id,
                right: `${x.date} • ${x.type} • ${x.status}`,
              }))}
              empty="No lab samples found."
            />
          </Panel>

          <div className="lg:col-span-3">
            <Panel title="Treatments">
              <SimpleList
                items={profile.treatments.map((x) => ({
                  left: x.id,
                  right: `${x.date} • ${x.title}`,
                }))}
                empty="No treatments found."
              />
            </Panel>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-end">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* ✅ Custom Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Mark patient as inactive?"
        description={`This will mark ${patient.name} (${patient.id}) as inactive. No data will be deleted.`}
        confirmText={loading ? "Updating..." : "Yes, mark inactive"}
        cancelText="Cancel"
        disabled={loading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await confirmAndDeletePatient(patient.id); // marks inactive
            setConfirmOpen(false);
            onClose();
          } catch {
            // store already has error; keep dialog open if needed
          }
        }}
      />
    </div>
  );
};

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText,
  cancelText,
  disabled,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h4 className="text-base font-semibold text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>

        <div className="p-5 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={onClose}
            disabled={disabled}
          >
            {cancelText}
          </Button>

          <Button
            variant="destructive"
            className="rounded-xl"
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Panel = ({ title, children }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4">
    <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
    <div className="mt-3">{children}</div>
  </div>
);

const Timeline = ({ items = [] }) => {
  if (!items.length) return <p className="text-sm text-gray-500">No history found.</p>;

  return (
    <div className="space-y-3">
      {items.map((x, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#2ec4b6]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{x.type}</p>
            <p className="text-xs text-gray-500">{x.date}</p>
            <p className="text-sm text-gray-700 mt-1">{x.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const SimpleList = ({ items = [], empty }) => {
  if (!items.length) return <p className="text-sm text-gray-500">{empty}</p>;

  return (
    <div className="space-y-2">
      {items.map((x, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"
        >
          <p className="text-sm font-semibold text-gray-900">{x.left}</p>
          <p className="text-xs text-gray-600 text-right">{x.right}</p>
        </div>
      ))}
    </div>
  );
};

export default OwnerPatientProfileModal;