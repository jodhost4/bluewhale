const Notification = require("../models/Notification");

const createNotification = async ({ message, module, username, data }) => {
  try {
    return await Notification.create({ message, module, username, data });
  } catch (err) {
    console.error("Notification creation error:", err.message);
  }
};

module.exports = { createNotification };

