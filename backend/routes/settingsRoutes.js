const express = require("express");
const {
  getAttendanceSettings,
  updateAttendanceSettings,
} = require("../controllers/settingsController");
const { protect, access, requirePermission } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
// Any authenticated user can read attendance settings to know GPS/face enforcement rules
router.get("/attendance", getAttendanceSettings);
router.put("/attendance", access("settings", "edit", "super_admin", "admin"), updateAttendanceSettings);

module.exports = router;
