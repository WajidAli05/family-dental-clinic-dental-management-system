import {
  receptionistGetMe,
  receptionistUpdateMe,
  receptionistChangePassword,
  receptionistGetStats,
  receptionistGetAppointments,
  receptionistGetLabSamples,
  receptionistCreatePatient,
  receptionistCreateAppointment,
    receptionistGetPatients,
  receptionistGetPatientStats,
    receptionistGetDentists,
  receptionistLookupPatient,
    receptionistListAppointments,
  receptionistUpdateAppointmentStatus,

    receptionistListLabSamples,
  receptionistCreateLabSample,
  receptionistUpdateLabSample,
  receptionistUpdateLabSampleStatus,
  receptionistDeliverLabSample,
  receptionistDeleteLabSample,

    receptionistGetLabs,
  receptionistGetSampleTypes,

    receptionistListInvoices,
  receptionistBillingStats,
  receptionistListLabBills,
  receptionistAddInvoicePayment,
  receptionistUpdateInvoicePayment,
  receptionistDeleteInvoicePayment,
  receptionistCreateInvoice,
} from "../services/receptionist.service.js";

export const getReceptionistMe = async (req, res) => {
  try {
    const me = await receptionistGetMe(req.user._id);
    return res.json({ success: true, data: me });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateReceptionistMe = async (req, res) => {
  try {
    const updated = await receptionistUpdateMe(req.user._id, req.body);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const changeReceptionistPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const updated = await receptionistChangePassword(req.user._id, {
      currentPassword,
      newPassword,
    });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// dashboard
export const getReceptionistStats = async (req, res) => {
  try {
    const { date } = req.query;
    const stats = await receptionistGetStats(req.user._id, { date });
    return res.json({ success: true, data: stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// export const getReceptionistAppointments = async (req, res) => {
//   try {
//     const { date } = req.query;
//     const rows = await receptionistGetAppointments(req.user._id, { date });
//     return res.json({ success: true, data: rows });
//   } catch (e) {
//     return res.status(500).json({ success: false, message: e.message });
//   }
// };

export const getReceptionistLabSamples = async (req, res) => {
  try {
    const { date } = req.query;
    const rows = await receptionistGetLabSamples(req.user._id, { date });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// quick actions used by modals
export const createReceptionistPatient = async (req, res) => {
  try {
    const created = await receptionistCreatePatient(req.user, req.body);
    return res.json({ success: true, data: created });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const getReceptionistDentists = async (req, res) => {
  try {
    const rows = await receptionistGetDentists(req.user._id);
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const lookupReceptionistPatient = async (req, res) => {
  try {
    const { q } = req.query;
    const row = await receptionistLookupPatient(req.user._id, { q });
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const createReceptionistAppointment = async (req, res) => {
  try {
    const created = await receptionistCreateAppointment(req.user, req.body);
    return res.json({ success: true, data: created });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const getReceptionistPatients = async (req, res) => {
  try {
    const { q, limit, page } = req.query;
    const rows = await receptionistGetPatients(req.user._id, { q, limit, page });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getReceptionistPatientStats = async (req, res) => {
  try {
    const stats = await receptionistGetPatientStats(req.user._id);
    return res.json({ success: true, data: stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


export const getReceptionistAppointments = async (req, res) => {
  try {
    const { date, dentist, status, q } = req.query;
    const rows = await receptionistListAppointments(req.user._id, {
      date,
      dentist,
      status,
      q,
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateReceptionistAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params; // publicId e.g. AP-0001
    const { status } = req.body; // "Completed" | "Cancelled" | "Scheduled"
    const updated = await receptionistUpdateAppointmentStatus(req.user._id, id, { status });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// export const getReceptionistLabSamples = async (req, res) => {
//   try {
//     const { status, q, date } = req.query;
//     const rows = await receptionistListLabSamples(req.user._id, { status, q, date });
//     return res.json({ success: true, data: rows });
//   } catch (e) {
//     return res.status(500).json({ success: false, message: e.message });
//   }
// };

export const createReceptionistLabSample = async (req, res) => {
  try {
    const created = await receptionistCreateLabSample(req.user, req.body);
    return res.json({ success: true, data: created });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const updateReceptionistLabSample = async (req, res) => {
  try {
    const updated = await receptionistUpdateLabSample(req.user, req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const updateReceptionistLabSampleStatus = async (req, res) => {
  try {
    const updated = await receptionistUpdateLabSampleStatus(req.user, req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const deliverReceptionistLabSample = async (req, res) => {
  try {
    const updated = await receptionistDeliverLabSample(req.user, req.params.id);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteReceptionistLabSample = async (req, res) => {
  try {
    const out = await receptionistDeleteLabSample(req.user, req.params.id);
    return res.json({ success: true, data: out });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const getReceptionistLabs = async (req, res) => {
  try {
    const rows = await receptionistGetLabs(req.user._id);
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getReceptionistSampleTypes = async (req, res) => {
  try {
    const rows = await receptionistGetSampleTypes(req.user._id);
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const listInvoices = async (req, res) => {
  try {
    const data = await receptionistListInvoices(req.user._id, req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const billingStats = async (req, res) => {
  try {
    const data = await receptionistBillingStats(req.user._id, req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listLabBills = async (req, res) => {
  try {
    const data = await receptionistListLabBills(req.user._id, req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const addInvoicePayment = async (req, res) => {
  try {
    const data = await receptionistAddInvoicePayment(req.user._id, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const updateInvoicePayment = async (req, res) => {
  try {
    const data = await receptionistUpdateInvoicePayment(
      req.user._id,
      req.params.id,
      req.params.paymentId,
      req.body
    );
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteInvoicePayment = async (req, res) => {
  try {
    const data = await receptionistDeleteInvoicePayment(req.user._id, req.params.id, req.params.paymentId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};


// ✅ optional: create invoice endpoint (for "add via UI")
export const createInvoice = async (req, res) => {
  try {
    const data = await receptionistCreateInvoice(req.user._id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};