const asyncHandler = require("../utils/asyncHandler");
const Attendance = require("../models/Attendance");
const AttendanceSetting = require("../models/AttendanceSetting");
const Staff = require("../models/Staff");
const { computeSalaryBreakdown, round2 } = require("../utils/salary");

// @desc  Salary for every active staff member for a month, computed from attendance
// @route GET /api/salary/summary?month=YYYY-MM
const monthlySummary = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400);
    throw new Error("month query param must be in YYYY-MM format");
  }

  const staffList = await Staff.find({ active: true }).sort({ name: 1 });
  const settings = await AttendanceSetting.getSingleton();
  const records = await Attendance.find({ date: { $regex: `^${month}` } });

  const byStaff = new Map();
  for (const r of records) {
    const key = String(r.staff);
    if (!byStaff.has(key)) byStaff.set(key, []);
    byStaff.get(key).push(r);
  }

  const rows = staffList.map((staff) => {
    const res = computeSalaryBreakdown(staff, byStaff.get(String(staff._id)) || [], settings, month);
    const isReceived = (staff.paidMonths || []).includes(month) || staff.salaryStatus === "received";
    res.salaryReceived = isReceived;
    res.salaryStatus = isReceived ? "received" : "pending";
    res.staff.paidMonths = staff.paidMonths || [];
    return res;
  });

  const totals = rows.reduce(
    (acc, r) => ({
      presentDays: acc.presentDays + r.presentDays,
      lateDays: acc.lateDays + r.lateDays,
      overtimePay: round2(acc.overtimePay + r.overtimePay),
      deductions: round2(acc.deductions + r.leaveDeduction + r.lateDeduction),
      netSalary: round2(acc.netSalary + r.netSalary),
    }),
    { presentDays: 0, lateDays: 0, overtimePay: 0, deductions: 0, netSalary: 0 }
  );

  res.json({
    success: true,
    data: { month, policy: settings.salary || {}, rows, totals },
  });
});

// @desc  Detailed salary computation for one staff member for a month
// @route GET /api/salary/staff/:staffId?month=YYYY-MM
const staffSalary = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400);
    throw new Error("month query param must be in YYYY-MM format");
  }

  const staff = await Staff.findById(staffId);
  if (!staff) {
    res.status(404);
    throw new Error("Staff member not found");
  }

  const records = await Attendance.find({ staff: staffId, date: { $regex: `^${month}` } }).sort({ date: 1 });
  const settings = await AttendanceSetting.getSingleton();
  const breakdown = computeSalaryBreakdown(staff, records, settings, month);
  const isReceived = (staff.paidMonths || []).includes(month) || staff.salaryStatus === "received";
  breakdown.salaryReceived = isReceived;
  breakdown.salaryStatus = isReceived ? "received" : "pending";

  res.json({
    success: true,
    data: { ...breakdown, days: records.map((r) => ({ date: r.date, status: r.status, checkIn: r.checkIn, checkOut: r.checkOut, lateMinutes: r.lateMinutes || 0 })) },
  });
});

// @desc  Toggle or update salary received status for a staff member for a month
// @route PATCH /api/salary/status
const toggleSalaryStatus = asyncHandler(async (req, res) => {
  const { staffId, month, status } = req.body;
  const staff = await Staff.findById(staffId);
  if (!staff) {
    res.status(404);
    throw new Error("Staff member not found");
  }

  const targetMonth = month || new Date().toISOString().slice(0, 7);
  let paid = staff.paidMonths || [];

  if (status === "received") {
    if (!paid.includes(targetMonth)) paid.push(targetMonth);
    staff.salaryStatus = "received";
  } else {
    paid = paid.filter((m) => m !== targetMonth);
    staff.salaryStatus = paid.length > 0 ? "received" : "pending";
  }

  staff.paidMonths = paid;
  await staff.save();

  res.json({
    success: true,
    data: {
      staffId: staff._id,
      month: targetMonth,
      salaryStatus: staff.salaryStatus,
      paidMonths: staff.paidMonths,
      salaryReceived: status === "received",
    },
  });
});

module.exports = { monthlySummary, staffSalary, toggleSalaryStatus };
