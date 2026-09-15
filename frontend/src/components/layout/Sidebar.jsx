import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  Package,
  Map,
  Wrench,
  Fuel,
  Bell,
  ClipboardCheck,
  LogOut,
  UserCog,
  UserCircle,
  Moon,
  Sun,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import NotificationDropdown from "../common/NotificationDropdown";

export default function Sidebar() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Vehicles",
      path: "/vehicles",
      icon: Truck,
    },
    {
      name: "Drivers",
      path: "/drivers",
      icon: Users,
    },
    {
      name: "Shipments",
      path: "/shipments",
      icon: Package,
    },
    {
      name: "Trips",
      path: "/trips",
      icon: Map,
    },
    {
      name: "Maintenance",
      path: "/maintenance",
      icon: Wrench,
    },
    {
      name: "Fuel Records",
      path: "/fuel",
      icon: Fuel,
    },
    {
      name: "Attendance",
      path: "/attendance",
      icon: ClipboardCheck,
    },
  ];

  // Admin/FleetManager items
  if (user?.role === "Admin" || user?.role === "FleetManager") {
    menuItems.push({
      name: "User Management",
      path: "/users",
      icon: UserCog,
    });
  }

  // Filter based on roles
  const filteredMenuItems = menuItems.filter(item => {
    if (user?.role === "Dispatcher" && item.name === "Fuel Records") return false;
    if (user?.role === "Driver" && item.name === "Drivers") return false;
    return true;
  });

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <Truck size={30} />
        <span>FleetFlow</span>
      </div>

      <nav style={styles.nav}>
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.activeLink : {}),
              })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
                <Icon size={20} />
                <span>{item.name}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div style={styles.footer}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
           <NotificationDropdown />
        </div>
        
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          style={{...styles.profileLink, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', padding: '12px 15px'}}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Profile link */}
        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            ...styles.profileLink,
            ...(isActive ? styles.activeLink : {}),
          })}
        >
          <UserCircle size={20} />
          <span>
            {user?.full_name || "Profile"}
          </span>
        </NavLink>

        {/* Logout */}
        <button onClick={handleLogout} style={styles.logout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "250px",
    minHeight: "100vh",
    background: "var(--sidebar-bg)",
    color: "var(--sidebar-text)",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    borderRight: "1px solid var(--border-color)",
  },

  logo: {
    height: "75px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 25px",
    fontSize: "24px",
    fontWeight: "700",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    flexShrink: 0,
  },

  nav: {
    padding: "20px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
    overflowY: "auto",
  },

  link: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 15px",
    borderRadius: "8px",
    color: "#cbd5e1",
    textDecoration: "none",
    fontSize: "15px",
    transition: "0.2s",
  },

  activeLink: {
    background: "var(--sidebar-hover)",
    color: "var(--sidebar-hover-text)",
  },

  footer: {
    padding: "12px",
    borderTop: "1px solid var(--border-color)",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  profileLink: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "11px 15px",
    borderRadius: "8px",
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "14px",
    transition: "0.2s",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  logout: {
    padding: "12px 15px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#dc2626",
    color: "white",
    fontSize: "15px",
    cursor: "pointer",
  },

  badge: {
    background: "#ef4444",
    color: "white",
    fontSize: "12px",
    fontWeight: "bold",
    borderRadius: "10px",
    padding: "2px 6px",
    minWidth: "18px",
    textAlign: "center",
  },
};