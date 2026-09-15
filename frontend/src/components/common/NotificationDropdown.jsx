import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const recentNotifications = notifications.slice(0, 5);

  const getAlertColor = (type) => {
    switch (type) {
        case "WARNING": return "#ef4444";
        case "SUCCESS": return "#22c55e";
        default: return "#3b82f6";
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <div 
        style={styles.bellContainer} 
        onClick={toggleDropdown}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div style={styles.badge}>
            {unreadCount}
          </div>
        )}
      </div>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={{ fontWeight: '600' }}>Notifications</span>
            {unreadCount > 0 && (
                <button 
                  style={styles.markAllBtn}
                  onClick={(e) => {
                      e.stopPropagation();
                      markAllAsRead();
                  }}
                >
                  Mark all as read
                </button>
            )}
          </div>
          
          <div style={styles.list}>
            {recentNotifications.length === 0 ? (
                <div style={styles.empty}>No recent notifications.</div>
            ) : (
                recentNotifications.map(n => (
                    <div 
                      key={n.notification_id} 
                      style={{
                          ...styles.item,
                          backgroundColor: n.is_read ? '#fff' : '#f0f9ff'
                      }}
                      onClick={() => {
                          if (!n.is_read) markAsRead(n.notification_id);
                      }}
                    >
                        <div style={{
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%',
                            backgroundColor: getAlertColor(n.alert_type),
                            flexShrink: 0,
                            marginTop: '6px'
                        }} />
                        <div>
                            <div style={styles.itemTitle}>{n.title}</div>
                            <div style={styles.itemMsg}>{n.message}</div>
                            <div style={styles.itemDate}>{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                    </div>
                ))
            )}
          </div>

          <div 
            style={styles.footer}
            onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
            }}
          >
            View all notifications
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  bellContainer: {
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    transition: 'background-color 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  dropdown: {
    position: 'absolute',
    bottom: '45px', // Open upwards or downwards depending on sidebar layout
    left: '0',
    width: '300px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    zIndex: 1000,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
  },
  list: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  item: {
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    gap: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '2px',
  },
  itemMsg: {
    fontSize: '13px',
    color: '#475569',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  itemDate: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  footer: {
    padding: '12px',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: '500',
    color: '#3b82f6',
    cursor: 'pointer',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  }
};
