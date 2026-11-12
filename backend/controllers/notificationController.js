const asyncHandler = require("../utils/asyncHandler");
const Notification = require("../models/Notification");

// @desc  Get recent notifications + unread count
// @route GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ read: false });
  res.json({ success: true, data: notifications, unreadCount });
});

// @desc  Mark a notification as read
// @route PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }
  const unreadCount = await Notification.countDocuments({ read: false });
  res.json({ success: true, data: notification, unreadCount });
});

// @desc  Mark all notifications as read
// @route PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ read: false }, { read: true });
  res.json({ success: true, message: "All notifications marked as read", unreadCount: 0 });
});

module.exports = { getNotifications, markRead, markAllRead };

