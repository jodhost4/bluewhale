require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const customerRoutes = require("./routes/customerRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const packageRoutes = require("./routes/packageRoutes");
const billingRoutes = require("./routes/billingRoutes");
const entryRoutes = require("./routes/entryRoutes");
const staffRoutes = require("./routes/staffRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const couponRoutes = require("./routes/couponRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

connectDB().then(() => {
  // Sync any staff user roles whose role in User was defaulted to billing_staff
  // instead of matching their staff designation (e.g. indoor_staff, outdoor_staff, cashier)
  const syncStaffRoles = async () => {
    try {
      const User = require("./models/User");
      const users = await User.find({ staff: { $ne: null } }).populate("staff");
      for (const u of users) {
        if (u.staff && u.staff.designation && u.role === "billing_staff" && u.staff.designation !== "billing_staff") {
          u.role = u.staff.designation;
          await u.save();
          console.log(`Synced user ${u.username} role to ${u.role}`);
        }
      }
    } catch (err) {
      console.error("Staff role sync error:", err.message);
    }
  };
  syncStaffRoles();
});

const app = express();
const initCronJobs = require("./utils/cronJobs");
initCronJobs();

const allowedOrigins = [
  "https://bluewhalefec.in",
  "https://bluewhalecrm-gewx.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ success: true, message: "BlueWhale API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/entry", entryRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`BlueWhale API listening on port ${PORT}`));
