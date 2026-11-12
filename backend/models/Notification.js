const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    module: {
      type: String,
      enum: ["attendance", "staff", "users", "billing", "bookings", "customers", "enquiries", "coupons", "general"],
      default: "general",
    },
    username: { type: String, trim: true },
    data: { type: mongoose.Schema.Types.Mixed },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);

