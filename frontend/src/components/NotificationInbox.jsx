import { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { getMyNotifications, markNotificationRead } from '../api/notification.api';
import { useNotifications } from '../context/NotificationContext';
import toast from 'react-hot-toast';
import EmptyState from './ui/EmptyState';
import PageHeader from './ui/PageHeader';
import Skeleton from './ui/Skeleton';

const NotificationInbox = ({ title, description }) => {
  const { markAllAsRead } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await getMyNotifications();
        if (isMounted) {
          const list = res.data.notifications || [];
          setNotifications(list);
          // When entering notifications inbox, mark all as read so the badge count clears
          if (markAllAsRead) {
            markAllAsRead();
          }
        }
      } catch {
        toast.error('Failed to load notifications');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [markAllAsRead]);

  const handleClick = async (n) => {
    if (!n.isRead) {
      await markNotificationRead(n._id);
      setNotifications((prev) => prev.map((item) => (item._id === n._id ? { ...item, isRead: true } : item)));
    }
  };

  const handleManualMarkAll = async () => {
    if (markAllAsRead) {
      await markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      toast.success('All notifications marked as read');
    }
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          notifications.some(n => !n.isRead) && (
            <button
              type="button"
              onClick={handleManualMarkAll}
              className="btn-secondary text-xs"
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
          )
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications right now"
          description="Updates about matching, pickups, and deliveries will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <button
              type="button"
              key={n._id}
              onClick={() => handleClick(n)}
              className={`w-full text-left p-4 sm:p-5 rounded-card border transition ${
                n.isRead
                  ? 'bg-white border-line hover:bg-slate-50'
                  : 'bg-forest-light/70 border-forest-muted shadow-card'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <p className="font-semibold text-ink text-sm">{n.title}</p>
                {!n.isRead && (
                  <span className="text-[10px] font-bold bg-forest text-white px-2 py-0.5 rounded-full">
                    New
                  </span>
                )}
              </div>
              <p className="text-sm text-body mt-1.5 leading-relaxed">{n.message}</p>
              <p className="text-xs text-muted mt-3">{new Date(n.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default NotificationInbox;
