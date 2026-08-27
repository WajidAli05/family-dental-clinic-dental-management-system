/**
 * Stacking layers for modals that open on top of other modals.
 *
 * The patient profile shells (OwnerPatientProfileModal, DentistPatientViewModal)
 * are hand-rolled `fixed inset-0 z-[60]` overlays, and the owner's confirm
 * dialogs sit at z-[70]. shadcn's Dialog and Select portal to <body> but are
 * hardcoded at z-50, so anything opened from INSIDE a patient modal renders
 * underneath it — visible but unclickable, which is exactly how the
 * treatment-plan "Add item" modal and the fee-schedule dropdown broke.
 *
 * Portaling was never the problem; the z-index was. These constants keep the
 * nested layers above the shells they open from, in one place, instead of
 * magic numbers scattered across components.
 *
 *   60  patient profile modal shells
 *   70  owner confirm / erase dialogs
 *   80  NESTED_DIALOG   — a dialog opened from inside a patient modal
 *   90  NESTED_POPOVER  — a Select/popover opened inside that nested dialog
 */

/** Dialog opened from inside a patient profile modal (content + backdrop). */
export const NESTED_DIALOG = "z-[80]";

/** Select/popover content that must clear a nested dialog, or a z-[60] shell. */
export const NESTED_POPOVER = "z-[90]";
