import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { toast } from "react-hot-toast";

const NotificationContext = createContext();

export const useNotifications = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchedOnce = useRef(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await api.get("/notifications/");
      const data = response.data;
      
      const unread = data.filter(n => !n.is_read);
      setUnreadCount(unread.length);
      
      // If we already fetched once, check for new notifications to toast
      if (fetchedOnce.current) {
         const oldUnreadIds = new Set(notifications.filter(n => !n.is_read).map(n => n.notification_id));
         const newUnread = unread.filter(n => !oldUnreadIds.has(n.notification_id));
         
         newUnread.forEach(n => {
            if (n.alert_type === "WARNING") {
                toast.error(n.title + ": " + n.message, { duration: 5000 });
            } else if (n.alert_type === "SUCCESS") {
                toast.success(n.title + ": " + n.message, { duration: 4000 });
            } else {
                toast(n.title + ": " + n.message, { duration: 4000, icon: 'ℹ️' });
            }
         });
      }
      
      setNotifications(data);
      fetchedOnce.current = true;
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        fetchedOnce.current = false;
        return;
    }

    fetchNotifications();
    
    // Poll every 10 seconds
    const interval = setInterval(() => {
        fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
