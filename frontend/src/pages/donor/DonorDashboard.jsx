import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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

const DonorDashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const res = await getMyDonations();
        if (isMounted) setDonations(res.data.donations || []);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = {
    total: donations.length,
    active: donations.filter(d => !['COMPLETED', 'CANCELLED', 'EXPIRED', 'UNMATCHED'].includes(d.status)).length,
    completed: donations.filter(d => d.status === 'COMPLETED').length,
    mealsRescued: donations.filter(d => d.status === 'COMPLETED').reduce((sum, d) => sum + (d.quantity || 0), 0)
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DonorNavbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome, {user?.name} 👋
            </h1>
            <p className="text-sm text-slate-500">Track and manage your surplus food donations</p>
          </div>

          <Link
            to="/donor/donate"
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <span>➕</span> Post New Donation
          </Link>
        </div>

        {!user?.profileCompleted && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl mb-6 flex justify-between items-center flex-wrap gap-2 text-xs">
            <span>Please complete your donor profile to optimize automatic matching.</span>
            <Link to="/donor/profile" className="bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-600">
              Complete Profile →
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Donations</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.total}</p>
            <p className="text-xs text-slate-400 mt-2">All posted listings</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Missions</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{stats.active}</p>
            <p className="text-xs text-slate-400 mt-2">Matching & in transit</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.completed}</p>
            <p className="text-xs text-slate-400 mt-2">Delivered to NGOs</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meals Rescued</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{stats.mealsRescued}</p>
            <p className="text-xs text-slate-400 mt-2">Impacted lives</p>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800">Recent Donation Activity</h2>
          {donations.length > 0 && (
            <Link to="/donor/donations" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              View All ({donations.length}) →
            </Link>
          )}
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading activity...</p>
        ) : donations.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 text-center">
            <span className="text-3xl">🍲</span>
            <p className="text-slate-600 font-semibold text-sm mt-2">No donations posted yet</p>
            <p className="text-slate-400 text-xs mt-1">Post your surplus food to begin automatic matching with nearby charities.</p>
            <Link
              to="/donor/donate"
              className="inline-block mt-4 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-700 shadow-sm"
            >
              Post Food Donation
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {donations.slice(0, 5).map((donation) => (
              <Link
                key={donation._id}
                to={`/donor/donation/${donation._id}`}
                className="flex justify-between items-center p-4 hover:bg-slate-50 transition"
              >
                <div>
                  <p className="font-bold text-slate-800 text-sm">{donation.foodName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {donation.quantity} {donation.quantityUnit} • Posted {new Date(donation.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusColors[donation.status] || 'bg-slate-100 text-slate-700'}`}>
                  {donation.status.replace(/_/g, ' ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorDashboard;