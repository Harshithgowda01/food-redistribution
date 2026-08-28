import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import VolunteerNavbar from '../../components/VolunteerNavbar';
import { getVolunteerHistory } from '../../api/volunteer.api';

const VolunteerHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function loadHistory() {
      try {
        const res = await getVolunteerHistory();
        if (isMountedRef.current) {
          setHistory(res.data.history || []);
        }
      } catch {
        console.error('Failed to load delivery history');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <VolunteerNavbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Delivery History</h1>
            <p className="text-xs text-slate-500 mt-0.5">Permanent record of all meals and packages rescued by you</p>
          </div>
          <Link
            to="/volunteer/dashboard"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 text-center text-slate-400 text-sm">
            Loading delivery archive...
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200/80 text-center">
            <div className="text-4xl mb-3">📜</div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No completed deliveries yet</h3>
            <p className="text-slate-500 text-xs mb-5">
              Deliveries you complete will be permanently listed here with full trip metrics.
            </p>
            <Link
              to="/volunteer/dashboard"
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/20 transition"
            >
              Browse Open Missions →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item._id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {item.donation?.foodName || 'Food Delivery'}
                    </h3>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">
                      {item.donation?.foodType?.replace(/_/g, ' ')} • {item.donation?.quantity} {item.donation?.quantityUnit}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full">
                    ✓ Completed & Received
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl my-3">
                  <p><span className="font-semibold text-slate-500">From (Pickup):</span> {item.pickupAddress}</p>
                  <p><span className="font-semibold text-slate-500">To (NGO):</span> {item.deliveryAddress}</p>
                  <p><span className="font-semibold text-slate-500">Delivered To:</span> {item.ngo?.name || 'NGO'}</p>
                  <p><span className="font-semibold text-slate-500">Trip Distance:</span> ~{item.distanceKm || 0} km</p>
                </div>

                <div className="text-[11px] text-slate-400">
                  Completed: {item.completedAt ? new Date(item.completedAt).toLocaleString() : new Date(item.updatedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerHistory;
