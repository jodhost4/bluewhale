import React, { useEffect, useState } from "react";
import {
  LogIn,
  LogOut,
  UserCircle2,
  MapPin,
  AlertTriangle,
  IndianRupee,
  CalendarDays,
  Calendar,
  Cake,
  CheckCircle2,
  Clock,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import FaceCapture from "../../components/common/FaceCapture";
import api from "../../api/axios";

const statusColors = { present: "green", absent: "red", "half-day": "amber", leave: "gray" };

const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const thisMonth = () => new Date().toISOString().slice(0, 7);

// Capture a GPS position if the browser allows it. Returns null when unavailable/denied.
const getPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });

const MyAttendance = ({ mode = "full" }) => {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // "checkin" | "checkout"
  const [gpsNote, setGpsNote] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(thisMonth());
  const [monthSummary, setMonthSummary] = useState(null);
  const [monthSalary, setMonthSalary] = useState(null);

  const loadSalaryAndSummary = (staffId, m) => {
    if (!staffId) return;
    api
      .get(`/attendance/salary/${staffId}?month=${m}`)
      .then((res) => setMonthSalary(res.data.data))
      .catch(() => setMonthSalary(null));
    api
      .get(`/attendance/summary?staffId=${staffId}&from=${m}-01&to=${m}-31`)
      .then((res) => setMonthSummary(res.data.data?.[0]))
      .catch(() => setMonthSummary(null));
  };

  const load = async () => {
    try {
      const { data: res } = await api.get("/attendance/me");
      setData(res.data);
      if (res.data?.staff?._id) {
        loadSalaryAndSummary(res.data.staff._id, selectedMonth);
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your attendance");
    }
  };

  useEffect(() => {
    load();
    api.get("/settings/attendance").then(({ data }) => setSettings(data.data)).catch(() => setSettings(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
    if (data?.staff?._id) {
      loadSalaryAndSummary(data.staff._id, newMonth);
    }
  };

  // Decide what the current step requires based on enforcement settings.
  const faceRequiredFor = (scope) =>
    settings?.faceVerification?.method === "photo_capture_store" &&
    (settings.faceVerification.enforcedOn || []).includes(scope);

  const gpsMode = () => settings?.gps?.enforcement || "recorded";

  const runAction = async (scope, facePhoto, gps) => {
    setBusy(true);
    setGpsNote(null);
    try {
      const payload = {};
      if (facePhoto) payload.facePhoto = facePhoto;
      if (gps) payload.gps = gps;

      if (scope === "checkin") await api.post("/attendance/me/checkin", payload);
      else {
        await api.post("/attendance/me/checkout", payload);
        if (user?.role !== "super_admin") {
          logout();
          return;
        }
      }
      setPendingAction(null);
      load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setGpsNote({ type: "error", text: msg || "Something went wrong" });
      setPendingAction(null);
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (scope) => {
    const gps = await getPosition();
    const mode = gpsMode();

    if (mode === "required" && !gps) {
      setGpsNote({
        type: "error",
        text: "GPS location is required for attendance — enable your location and try again.",
      });
      return;
    }
    if (mode !== "off" && !gps) {
      setGpsNote({
        type: "warn",
        text: "Could not get your location — recording this attendance without GPS.",
      });
    }

    if (faceRequiredFor(scope)) {
      setPendingAction({ scope, gps });
    } else {
      await runAction(scope, null, gps);
    }
  };

  const today = data?.today;
  const staff = data?.staff;

  const isReceived =
    monthSalary?.salaryReceived ||
    staff?.paidMonths?.includes(selectedMonth) ||
    staff?.salaryStatus === "received";

  const perDay =
    monthSalary?.perDaySalary ||
    (staff?.salaryAmount
      ? staff.salaryType === "monthly"
        ? Math.round(staff.salaryAmount / 30)
        : staff.salaryAmount
      : 0);

  const columns = [
    { key: "date", label: "Date" },
    { key: "checkIn", label: "Check In", render: (row) => fmtTime(row.checkIn) },
    { key: "checkOut", label: "Check Out", render: (row) => fmtTime(row.checkOut) },
    { key: "status", label: "Status", render: (row) => <Badge color={statusColors[row.status]}>{row.status}</Badge> },
    { key: "overtimeHours", label: "Overtime (hrs)", render: (row) => row.overtimeHours || 0 },
    {
      key: "gps",
      label: "Location",
      render: (row) =>
        row.gps && typeof row.gps.lat === "number" ? (
          <span className="inline-flex items-center gap-1 text-xs text-ocean-500">
            <MapPin size={12} />
            {row.gps.lat.toFixed(4)}, {row.gps.lng.toFixed(4)}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  if (error) {
    return (
      <div className="card max-w-4xl">
        <p className="text-sm font-medium text-coral-500">{error}</p>
      </div>
    );
  }

  if (!data?.staff) {
    return (
      <div className="card flex max-w-4xl items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <h2 className="text-base font-bold text-ocean-900">My Attendance unavailable</h2>
          <p className="mt-1 text-sm text-ocean-500">
            No staff profile is linked to this login, so you can't view or mark attendance here. Contact an admin to link your account to a staff member.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staff Header & Today's Attendance Card */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ocean-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <UserCircle2 size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ocean-900">{staff?.name}</h2>
              <p className="text-sm font-medium text-ocean-500 capitalize">
                {staff?.staffId} · {String(staff?.designation || "").replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-ocean-400 block mb-0.5">
                Month
              </label>
              <input
                type="month"
                className="input-field py-1 px-2.5 text-xs font-semibold"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Profile info: DOB & Joining Date */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-ocean-50/50 p-3 text-xs">
          <div>
            <span className="flex items-center gap-1 font-semibold text-ocean-400">
              <Cake size={13} /> Date of Birth (DOB)
            </span>
            <p className="mt-1 text-sm font-bold text-ocean-800">{fmtDate(staff?.dob)}</p>
          </div>
          <div>
            <span className="flex items-center gap-1 font-semibold text-ocean-400">
              <Calendar size={13} /> Joining Date
            </span>
            <p className="mt-1 text-sm font-bold text-ocean-800">{fmtDate(staff?.joiningDate)}</p>
          </div>
          <div>
            <span className="flex items-center gap-1 font-semibold text-ocean-400">
              <Wallet size={13} /> Salary Type
            </span>
            <p className="mt-1 text-sm font-bold text-ocean-800 capitalize">{staff?.salaryType || "Monthly"}</p>
          </div>
          <div>
            <span className="flex items-center gap-1 font-semibold text-ocean-400">
              <IndianRupee size={13} /> Base Salary
            </span>
            <p className="mt-1 text-sm font-bold text-teal-600">
              ₹{Number(staff?.salaryAmount || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Today's Live Status (Shown in My Attendance, hidden on Staff Dashboard) */}
        {mode !== "dashboard" && (
          <div className="mt-4 rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ocean-400">Today's Attendance Status</p>
            <div className="flex flex-wrap items-center gap-4">
              <Badge color={today ? statusColors[today.status] : "gray"}>
                {today ? today.status : "Not marked"}
              </Badge>
              <div className="flex items-center gap-4 text-sm text-ocean-600">
                <span>
                  In: <strong className="text-ocean-900">{fmtTime(today?.checkIn)}</strong>
                </span>
                <span>
                  Out: <strong className="text-ocean-900">{fmtTime(today?.checkOut)}</strong>
                </span>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={() => handleAction("checkin")}
                  disabled={busy || !!today?.checkIn}
                  className="btn-secondary text-xs sm:text-sm"
                >
                  <LogIn size={15} /> Check In
                </button>
                <button
                  onClick={() => handleAction("checkout")}
                  disabled={busy || !today?.checkIn || !!today?.checkOut}
                  className="btn-secondary text-xs sm:text-sm"
                >
                  <LogOut size={15} /> Check Out
                </button>
              </div>
            </div>
            {gpsNote && (
              <div
                className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                  gpsNote.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {gpsNote.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Salary & Attendance Cards for the Selected Month */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Received Salary or Not */}
        <div className="card flex items-center gap-3 border border-ocean-100 bg-white p-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isReceived ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            {isReceived ? <CheckCircle2 size={24} /> : <Clock size={24} />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-ocean-400">Salary Status ({selectedMonth})</p>
            <p className={`mt-0.5 text-base font-bold ${isReceived ? "text-emerald-700" : "text-amber-700"}`}>
              {isReceived ? "Received" : "Not Received"}
            </p>
            <span
              className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isReceived ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {isReceived ? "Paid" : "Pending"}
            </span>
          </div>
        </div>

        {/* Card 2: Daily Salary */}
        <div className="card flex items-center gap-3 border border-ocean-100 bg-white p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <IndianRupee size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-ocean-400">Daily Salary</p>
            <p className="mt-0.5 text-lg font-bold text-teal-700">₹{Number(perDay || 0).toLocaleString("en-IN")}</p>
            <p className="text-xs text-ocean-400">per working day</p>
          </div>
        </div>

        {/* Card 3: Working Days */}
        <div className="card flex items-center gap-3 border border-ocean-100 bg-white p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ocean-50 text-ocean-600">
            <CalendarDays size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-ocean-400">Working Days ({selectedMonth})</p>
            <p className="mt-0.5 text-lg font-bold text-ocean-900">
              {monthSummary?.presentDays || 0} Present
            </p>
            <p className="text-xs text-ocean-500">
              {monthSummary ? `${monthSummary.totalRecords} marked` : "0 marked"}
              {monthSummary?.lateDays > 0 ? ` · ${monthSummary.lateDays} late` : ""}
            </p>
          </div>
        </div>

        {/* Card 4: Monthly Salary Details */}
        <div className="card flex items-center gap-3 border border-ocean-100 bg-white p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Wallet size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-ocean-400">Monthly Net Salary</p>
            <p className="mt-0.5 text-lg font-bold text-purple-700">
              ₹{(monthSalary?.netSalary ?? staff?.salaryAmount ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-ocean-400">
              {monthSalary?.leaveDeduction > 0 ? `−₹${monthSalary.leaveDeduction} leave ded.` : "no deductions"}
            </p>
          </div>
        </div>
      </div>

      {/* Day by Day Recent Attendance Records (Shown in My Attendance, hidden on Staff Dashboard) */}
      {mode !== "dashboard" && (
        <>
          <div className="card">
            <h3 className="mb-3 text-base font-bold text-ocean-900">Recent Attendance History</h3>
            <Table columns={columns} rows={data?.recent || []} emptyMessage="No attendance records yet" />
          </div>

          {pendingAction && (
            <FaceCapture
              onCapture={(photo) => runAction(pendingAction.scope, photo, pendingAction.gps)}
              onClose={() => setPendingAction(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MyAttendance;
