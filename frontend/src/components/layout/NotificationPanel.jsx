import React, { useEffect, useState } from "react";
import { X, Bell, Check, Clock, User, CalendarClock, UserPlus, Receipt, Ticket, CalendarHeart, MessageSquare } from "lucide-react";
import api from "../../api/axios";

const moduleIcons = {
  attendance: CalendarClock,
  staff: UserPlus,
  users: User,
  billing: Receipt,
  bookings: CalendarHeart,
  coupons: Ticket,
  enquiries: MessageSquare,
};

const moduleColors = {
  attendance: "bg-emerald-50 text-emerald-700 border-emerald-200",
  staff: "bg-teal-50 text-teal-700 border-teal-200",
  users: "bg-ocean-50 text-ocean-700 border-ocean-200",
  billing: "bg-blue-50 text-blue-700 border-blue-200",
  bookings: "bg-purple-50 text-purple-700 border-purple-200",
  coupons: "bg-amber-50 text-amber-700 border-amber-200",
  enquiries: "bg-rose-50 text-rose-700 border-rose-200",
};

const fmtTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const NotificationPanel = ({ open, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = () => {
    setLoading(true);
    api
      .get("/notifications")
      .then(({ data }) => {
        setNotifications(data.data || []);
      })
      .catch(() => {
        setNotifications([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (open) {
      fetchNotifs();
    }
  }, [open]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform">
        <div className="flex items-center justify-between border-b border-ocean-100 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ocean-900">Notifications</h2>
              <p className="text-xs text-ocean-400">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}` : "All caught up"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50"
                title="Mark all as read"
              >
                <Check size={14} /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-ocean-400 hover:bg-ocean-50 hover:text-ocean-700">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading && notifications.length === 0 ? (
            <p className="py-12 text-center text-sm text-ocean-400">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ocean-50 text-ocean-300">
                <Bell size={22} />
              </div>
              <p className="mt-3 text-sm font-semibold text-ocean-700">No notifications yet</p>
              <p className="text-xs text-ocean-400">Activities across modules will appear here in real-time.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = moduleIcons[n.module] || Bell;
              const colorClass = moduleColors[n.module] || "bg-ocean-50 text-ocean-700 border-ocean-200";
              return (
                <div
                  key={n._id}
                  className={`relative rounded-xl border p-3.5 transition ${
                    n.read ? "border-ocean-100 bg-white opacity-70" : "border-ocean-200 bg-ocean-50/50 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase ${colorClass}`}>
                        <Icon size={12} />
                        {n.module}
                      </span>
                      {n.username && (
                        <span className="font-mono text-xs font-medium text-ocean-600 bg-white border border-ocean-100 rounded px-1.5 py-0.5">
                          @{n.username}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-ocean-400">
                      <Clock size={11} />
                      {fmtTime(n.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-ocean-800">{n.message}</p>

                  {!n.read && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => markRead(n._id)}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                      >
                        Mark as read
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
