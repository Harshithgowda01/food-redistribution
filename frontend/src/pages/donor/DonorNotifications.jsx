import { useState, useEffect } from 'react';
import DonorNavbar from '../../components/DonorNavbar';
import { getMyNotifications, markNotificationRead } from '../../api/notification.api';
import toast from 'react-hot-toast';

const DonorNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await getMyNotifications();
        if (isMounted) setNotifications(res.data.notifications || []);
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
  }, []);

  const handleClick = async (n) => {
    if (!n.isRead) {
      await markNotificationRead(n._id);
      setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DonorNavbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Notifications & Alerts</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time updates regarding your food donations, NGO matchings, and handovers.</p>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 text-center text-slate-400 text-sm">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200/80 text-center">
            <span className="text-3xl">🔔</span>
            <p className="text-slate-600 font-bold text-sm mt-2">No notifications right now</p>
            <p className="text-slate-400 text-xs mt-1">Alerts about matching NGOs and volunteer arrivals will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleClick(n)}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition ${
                  n.isRead ? 'bg-white border-slate-200/80 hover:bg-slate-50' : 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="font-bold text-slate-800 text-sm">{n.title}</p>
                  {!n.isRead && (
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{n.message}</p>
                <p className="text-[11px] text-slate-400 mt-3">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorNotifications;