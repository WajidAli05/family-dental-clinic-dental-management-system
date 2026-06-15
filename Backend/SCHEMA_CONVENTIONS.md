# Schema Conventions

## publicId

Every collection (Patient, Appointment, LabCase, LabBill via `_id`, Invoice,
InventoryItem, User, SampleType) has a human-readable `publicId` string used
for lookups from the frontend and across services (e.g. `PT-0001`,
`APT-1001`, `CASE-0001`, `INV-1001`).

## Cross-collection references

- Cross-collection links use Mongoose `ObjectId` refs (e.g.
  `Appointment.patient -> Patient`, `LabCase.lab -> User`,
  `Patient.primaryDentist -> User`).
- **Exception — ledger snapshots**: `OwnerPayment.dentistId` /
  `OwnerPayment.dentistName` and `LabBill.labId` / `LabBill.labName` are
  intentional denormalized `publicId` + name snapshots, not ObjectId refs.
  They preserve the historical billing record even if the referenced
  dentist/lab is later renamed or removed. Do not "fix" these into ObjectId
  refs.

## Canonical enum values

### Appointment.status (`models/Appointment.model.js`)
`scheduled | checked_in | completed | cancelled | no_show`

UI strings ("Scheduled", "Completed", "Cancelled", ...) are mapped to/from
these via `toDbAppointmentStatus` / `toUiAppointmentStatus` in
`services/receptionist.service.js`.

### LabCase.status (`models/LabCase.model.js`)
`sent | received | in_progress | ready | delivered | approved | rejected`

`in_progress` (underscore) is canonical — **not** `in-process`. Frontend lab
UI components may accept either spelling for display purposes only; anything
written to or queried from the database must use `in_progress`.

### Invoice status (virtual, `models/Invoice.model.js`)
`Pending | Partial | Paid`

Computed from `totalAmount` vs sum of `payments[].amount` — see
`services/shared/billing.js#invoiceStatus`.
