import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getMyNotifications, markNotificationRead } from '../api/notification.api';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenIdsRef = useRef(new Set());
  const initialLoadRef = useRef(false);

  const showNotificationToast = (n) => {
    let borderColor = 'border-blue-500';
    let icon = '🔔';
    let bgColor = 'bg-blue-50';

    switch (n.type) {
      case 'NEW_DONATION_AVAILABLE':
        borderColor = 'border-amber-500';
        icon = '🍲';
        bgColor = 'bg-amber-50';
        break;
      case 'NEW_DELIVERY_REQUEST':
        borderColor = 'border-amber-500';
        icon = '🛵';
        bgColor = 'bg-amber-50';
        break;
      case 'VOLUNTEER_ASSIGNED':
      case 'VOLUNTEER_FOUND':
      case 'DELIVERY_ASSIGNED':
        borderColor = 'border-indigo-500';
        icon = '🛵';
        bgColor = 'bg-indigo-50';
        break;
      case 'DONATION_COMPLETED':
      case 'DELIVERY_COMPLETED':
      case 'NGO_ACCEPTED':
        borderColor = 'border-emerald-500';
        icon = '✅';
        bgColor = 'bg-emerald-50';
        break;
      case 'NO_VOLUNTEER_AVAILABLE':
        borderColor = 'border-amber-600';
        icon = '⚠️';
        bgColor = 'bg-amber-50';
        break;
      case 'DONATION_CANCELLED':
      case 'NO_NGO_FOUND':
      case 'NGO_REJECTED':
        borderColor = 'border-rose-500';
        icon = '❌';
        bgColor = 'bg-rose-50';
        break;
      case 'FOOD_COLLECTED':
      case 'NGO_SELF_COLLECTING':
        borderColor = 'border-teal-500';
        icon = '📦';
        bgColor = 'bg-teal-50';
        break;
      default:
        borderColor = 'border-blue-500';
        icon = '🔔';
        bgColor = 'bg-blue-50';
    }

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          } max-w-sm w-full bg-white shadow-xl rounded-xl pointer-events-auto flex border-l-4 ${borderColor} p-4 border border-slate-200 transition-all duration-300`}
        >
          <div className="flex-1 w-0">
            <div className="flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center text-base`}>
                {icon}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs font-bold text-slate-800">{n.title}</p>
                <p className="mt-0.5 text-xs text-slate-600 leading-normal">{n.message}</p>
              </div>
            </div>
          </div>
          <div className="ml-2 flex-shrink-0 flex items-start">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="rounded-md inline-flex text-slate-400 hover:text-slate-600 focus:outline-none p-1"
              aria-label="Close notification"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: 'top-right'
      }
    );
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const res = await getMyNotifications();
      const list = res.data.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);

      if (!initialLoadRef.current) {
        // Initial load on mount: record existing IDs without toasting
        list.forEach(n => seenIdsRef.current.add(n._id));
        initialLoadRef.current = true;
      } else {
        // Subsequent poll: find genuinely new notifications arrived after initial load
        const newItems = list.filter(n => !seenIdsRef.current.has(n._id));
        newItems.forEach(n => {
          seenIdsRef.current.add(n._id);
          showNotificationToast(n);
        });
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [user]);

  useEffect(() => {
    seenIdsRef.current = new Set();
    initialLoadRef.current = false;
    setNotifications([]);
    setUnreadCount(0);

    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Ignore error
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
