const express = require("express");
const {
  checkIn,
  checkOut,
  markStatus,
  getAttendance,
  getAttendanceSummary,
  computeMonthlySalary,
  selfCheckIn,
  selfCheckOut,
  selfStatus,
  grantReLogin,
  deleteRecord,
} = require("../controllers/attendanceController");
const { protect, access, authorize, requirePermission } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/", requirePermission("attendance", "view"), getAttendance);

// Summary: allowed for attendance view, or for a staff member querying their own record
router.get("/summary", (req, res, next) => {
  const userStaffId = (req.user?.staff?._id || req.user?.staff)?.toString();
  if (userStaffId && req.query.staffId === userStaffId) return next();
  return requirePermission("attendance", "view")(req, res, next);
}, getAttendanceSummary);

// Self status: available to any logged in user/staff
router.get("/me", selfStatus);

// Salary calculation: allowed for admin/hr/attendance view, or for a staff member querying their own salary
router.get(
  "/salary/:staffId",
  (req, res, next) => {
    const userStaffId = (req.user?.staff?._id || req.user?.staff)?.toString();
    if (userStaffId && req.params.staffId === userStaffId) return next();
    return access("attendance", "view", "super_admin", "admin", "hr_manager")(req, res, next);
  },
  computeMonthlySalary
);

// Self check-in / check-out
router.post("/me/checkin", selfCheckIn);
router.post("/me/checkout", selfCheckOut);
router.post("/checkin", access("attendance", "create", "super_admin", "admin", "hr_manager"), checkIn);
router.post("/checkout", access("attendance", "create", "super_admin", "admin", "hr_manager"), checkOut);
router.post("/mark", access("attendance", "create", "super_admin", "admin", "hr_manager"), markStatus);
router.patch("/grant-relogin", authorize("super_admin"), grantReLogin);
router.delete("/:id", authorize("super_admin"), deleteRecord);

module.exports = router;
