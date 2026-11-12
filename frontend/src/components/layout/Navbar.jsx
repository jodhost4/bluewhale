import React, { useState, useEffect, useCallback } from "react";
import { LogOut, Menu, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const roleLabels = {
  super_admin: "Super Admin",
  admin: "Admin / Manager",
  billing_staff: "Billing Staff",
  cashier: "Cashier",
  indoor_staff: "Indoor Staff",
  outdoor_staff: "Outdoor Staff",
  entry_staff: "Entry Staff",
  exit_staff: "Exit Staff",
  hr_manager: "HR / Staff Manager",
};

const Navbar = ({ title, onMenuClick, onNotifClick }) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore error
    }
  }, []);

  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 20000);
    return () => clearInterval(interval);
  }, [checkUnread]);

  const effectiveRole = user?.staff?.designation || user?.role;
  const roleDisplay =
    roleLabels[effectiveRole] ||
    roleLabels[user?.role] ||
    (effectiveRole ? String(effectiveRole).replace(/_/g, " ") : "");

  return (
    <header className="flex items-center justify-between gap-3 border-b border-ocean-100 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-lg border border-ocean-100 p-2 text-ocean-600 transition hover:bg-ocean-50 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="truncate text-lg font-bold text-ocean-900 sm:text-xl">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-ocean-800">{user?.name}</p>
          <p className="text-xs text-ocean-400 capitalize">{roleDisplay}</p>
        </div>
        <button
          onClick={onNotifClick}
          className="relative rounded-lg border border-ocean-100 p-2 text-ocean-500 transition hover:bg-ocean-50 hover:text-brand-500"
          title="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg border border-ocean-100 px-3 py-2 text-sm font-medium text-ocean-500 transition hover:bg-ocean-50 hover:text-coral-500"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
