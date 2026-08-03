import Notification from "../models/Notification.model.js";

// ─── GET /owner/notifications ─────────────────────────────────────────────────

export const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ recipientId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipientId: req.user._id,
    read:        false,
  });

  return res.json({ success: true, data: notifications, unreadCount });
};

// ─── PATCH /owner/notifications/:id/read ─────────────────────────────────────

export const markRead = async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user._id },
    { $set: { read: true } }
  );
  return res.json({ success: true });
};

// ─── PATCH /owner/notifications/read-all ─────────────────────────────────────

export const markAllRead = async (req, res) => {
  await Notification.updateMany(
    { recipientId: req.user._id, read: false },
    { $set: { read: true } }
  );
  return res.json({ success: true });
};
