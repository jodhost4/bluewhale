const express = require("express");
const { monthlySummary, staffSalary, toggleSalaryStatus } = require("../controllers/salaryController");
const { protect, access } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/summary", access("salary", "view", "super_admin", "admin", "hr_manager"), monthlySummary);
router.get("/staff/:staffId", access("salary", "view", "super_admin", "admin", "hr_manager", "indoor_staff", "outdoor_staff", "billing_staff", "cashier", "entry_staff", "exit_staff"), staffSalary);
router.patch("/status", access("salary", "edit", "super_admin", "admin", "hr_manager"), toggleSalaryStatus);

module.exports = router;
