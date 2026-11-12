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
      require("./models/Staff");
      const User = require("./models/User");
      const users = await User.find({ staff: { $ne: null } }).populate("staff");
      for (const u of users) {
        if (u.staff && u.staff.designation && u.role === "billing_staff" && u.staff.designation !== "billing_staff") {
          await User.updateOne({ _id: u._id }, { role: u.staff.designation });
          console.log(`Synced user ${u.username} role to ${u.staff.designation}`);
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
  "http://bluewhalefec.in",
  "https://www.bluewhalefec.in",
  "http://www.bluewhalefec.in",
  "https://bluewhale-ruddy.vercel.app",
  "https://bluewhalecrm-gewx.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const clean = origin.replace(/\/$/, "");
    if (
      allowedOrigins.includes(clean) ||
      clean.endsWith("bluewhalefec.in") ||
      clean.endsWith("vercel.app") ||
      clean.includes("localhost")
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Explicit fallback CORS middleware ensuring preflight and origin headers are always set
app.use((req, res, next) => {
  const origin = req.headers.origin || "https://bluewhalefec.in";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
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
