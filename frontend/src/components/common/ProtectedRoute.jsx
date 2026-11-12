import React from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Wrap any page that requires login. Optionally pass roles={["super_admin","admin"]}
// to also restrict by role, and module="coupons" to restrict by view permission.
// Mirrors backend middleware/auth.js access(): an explicit module grant (Control)
// overrides the role whitelist; without explicit permissions the role decides.
const ProtectedRoute = ({ children, roles, module, anyOf }) => {
  const { user, can } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const hasExplicitPerms =
    user.permissions &&
    !Array.isArray(user.permissions) &&
    Object.keys(user.permissions).length > 0;
  const roleOk = !roles || roles.includes(user.role);

  let allowed = roleOk;
  if (hasExplicitPerms) {
    if (anyOf && Array.isArray(anyOf)) {
      allowed = anyOf.some((m) => can(m, "view"));
    } else if (module) {
      if (module === "dashboard") {
        allowed = can("dashboard", "view") || can("staff_dashboard", "view");
      } else if (module === "my_attendance") {
        allowed = can("my_attendance", "view") || can("attendance", "view");
      } else if (module === "tv_display") {
        allowed = can("tv_display", "view") || can("entry", "view");
      } else {
        allowed = can(module, "view");
      }
    }
  }

  if (!allowed) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <ShieldAlert size={24} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-ocean-800">Access restricted</h2>
          <p className="mt-2 text-sm text-ocean-500">
            You don't have permission to open this module. Contact your admin to update your access.
          </p>
        </div>
      </div>
    );
  }
  return children;
};

export default ProtectedRoute;
