import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DonorNavbar from '../../components/DonorNavbar';
import { getMyDonations } from '../../api/donation.api';
import toast from 'react-hot-toast';

const statusColors = {
  POSTED: 'bg-blue-50 text-blue-700 border-blue-200',
  MATCHING: 'bg-blue-50 text-blue-700 border-blue-200',
  WAITING_FOR_NGO: 'bg-amber-50 text-amber-700 border-amber-200',
  NGO_ACCEPTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  NGO_COLLECTING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  VOLUNTEER_REQUESTED: 'bg-purple-50 text-purple-700 border-purple-200',
  VOLUNTEER_ASSIGNED: 'bg-purple-50 text-purple-700 border-purple-200',
  FOOD_COLLECTED: 'bg-teal-50 text-teal-700 border-teal-200',
  OUT_FOR_DELIVERY: 'bg-teal-50 text-teal-700 border-teal-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  EXPIRED: 'bg-rose-50 text-rose-700 border-rose-200',
  UNMATCHED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const MyDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    async function loadDonations() {
      try {
        const res = await getMyDonations();
        if (isMounted) setDonations(res.data.donations || []);
      } catch {
        toast.error('Failed to load donations');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDonations();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDonations = donations.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['COMPLETED', 'CANCELLED', 'EXPIRED', 'UNMATCHED'].includes(d.status);
    if (filter === 'completed') return d.status === 'COMPLETED';
    if (filter === 'cancelled') return ['CANCELLED', 'EXPIRED', 'UNMATCHED'].includes(d.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <DonorNavbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Food Donations</h1>
            <p className="text-xs text-slate-500 mt-0.5">Audit and track real-time delivery status of your donations</p>
          </div>
          <Link
            to="/donor/donate"
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/20 transition"
          >
            ➕ Post New Donation
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'active', 'completed', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition ${
                filter === f
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? 'All Donations' : f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading donations...</p>
        ) : filteredDonations.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 text-center">
            <span className="text-3xl">📦</span>
            <p className="text-slate-600 font-semibold text-sm mt-2">No donations found</p>
            <p className="text-slate-400 text-xs mt-1">There are no food donations matching this status filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {filteredDonations.map((donation) => (
              <Link
                key={donation._id}
                to={`/donor/donation/${donation._id}`}
                className="flex justify-between items-center p-4 sm:p-5 hover:bg-slate-50 transition"
              >
                <div>
                  <p className="font-bold text-slate-800 text-sm">{donation.foodName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {donation.quantity} {donation.quantityUnit} • {donation.foodType?.replace(/_/g, ' ')} • Posted {new Date(donation.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusColors[donation.status] || 'bg-slate-100 text-slate-700'}`}>
                    {donation.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-400 text-xs">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDonations;