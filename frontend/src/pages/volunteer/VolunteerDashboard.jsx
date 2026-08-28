import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import VolunteerNavbar from '../../components/VolunteerNavbar';
import {
  getVolunteerProfile,
  getAvailableRequests,
  acceptDelivery
} from '../../api/volunteer.api';
import toast from 'react-hot-toast';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const isMountedRef = useRef(true);

  const fetchRequests = async () => {
    try {
      const res = await getAvailableRequests();
      if (isMountedRef.current) {
        setRequests(res.data.requests || []);
      }
    } catch {
      console.error('Failed to load available requests');
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    async function initialLoad() {
      try {
        const [profileRes, requestsRes] = await Promise.all([
          getVolunteerProfile(),
          getAvailableRequests()
        ]);
        if (isMountedRef.current) {
          setProfile(profileRes.data.volunteer);
          setRequests(requestsRes.data.requests || []);
        }
      } catch {
        console.error('Failed to load dashboard data');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    initialLoad();
    const interval = setInterval(fetchRequests, 15000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const handleAccept = async (id) => {
    setAcceptingId(id);
    try {
      const res = await acceptDelivery(id);
      toast.success(res.data.message || 'Delivery accepted successfully!');
      navigate('/volunteer/active');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept delivery. It may have been taken by another volunteer.');
      fetchRequests();
    } finally {
      if (isMountedRef.current) {
        setAcceptingId(null);
      }
    }
  };

  const hasActiveDelivery = profile?.activeDelivery;

  return (
    <div className="min-h-screen bg-slate-50">
      <VolunteerNavbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome, {user?.name} 👋
            </h1>
            <p className="text-sm text-slate-500">Pick up food donations and deliver them directly to local charities</p>
          </div>
          <Link
            to="/volunteer/active"
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
              hasActiveDelivery
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 animate-pulse'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {hasActiveDelivery ? '⚡ Active Mission in Progress' : 'View Mission Tracker'}
          </Link>
        </div>

        {!user?.profileCompleted && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3.5 rounded-2xl mb-6 flex justify-between items-center flex-wrap gap-2 text-xs">
            <div>
              <p className="font-bold">Set up your volunteer profile</p>
              <p className="text-amber-700 mt-0.5">Add your registered vehicle and map location so nearby delivery requests are matched to you.</p>
            </div>
            <Link
              to="/volunteer/profile"
              className="bg-amber-500 text-white px-3.5 py-1.5 rounded-xl font-semibold hover:bg-amber-600 shadow-sm"
            >
              Complete Profile →
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Deliveries Rescued</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{profile?.totalDeliveries || 0}</p>
            <p className="text-xs text-slate-400 mt-2">Completed trips</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Availability Status</p>
            <div className="mt-2">
              {hasActiveDelivery ? (
                <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                  🛵 On Active Delivery
                </span>
              ) : profile?.isAvailable ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                  🟢 Ready for Deliveries
                </span>
              ) : (
                <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                  ⏸️ Offline / Paused
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">Live dispatcher status</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Registered Vehicle</p>
            <p className="text-xl font-bold text-slate-800 capitalize mt-1">
              {profile?.vehicleType || 'Not set'}
            </p>
            <p className="text-xs text-slate-400 mt-2">Used for ETA calculations</p>
          </div>
        </div>

        {/* Active Delivery Quick Hero Banner */}
        {hasActiveDelivery && (
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-indigo-800/40 mb-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                  ⚡ Live Mission Underway
                </span>
                <h2 className="text-xl font-bold text-white mt-2">
                  {profile.activeDelivery.donation?.foodName || 'Food Delivery'}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Status: <span className="font-semibold text-emerald-400">{profile.activeDelivery.status?.replace(/_/g, ' ')}</span>
                </p>
              </div>
              <Link
                to="/volunteer/active"
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/30 transition"
              >
                Open Live Mission Stepper →
              </Link>
            </div>
          </div>
        )}

        {/* Available Requests Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Available Delivery Requests {requests.length > 0 && `(${requests.length})`}
            </h2>
            <p className="text-xs text-slate-500">Pickups within your geographical operating radius</p>
          </div>
          <button
            onClick={fetchRequests}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
          >
            <span>🔄</span> Refresh Feed
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 text-center">
            <p className="text-slate-400 text-sm">Finding nearby delivery dispatches...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 text-center">
            <span className="text-3xl">🛵</span>
            <p className="text-slate-700 font-bold text-sm mt-2">No open delivery requests near you right now</p>
            <p className="text-xs text-slate-400 mt-1">When an NGO requests volunteer transport for a donation, it will appear here instantly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req._id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:border-emerald-300 transition"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-800">{req.foodName}</h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold capitalize">
                        {req.foodType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quantity: <span className="font-semibold text-slate-700">{req.quantity} {req.quantityUnit}</span>
                    </p>
                  </div>
                  {req.distanceToPickupKm !== null && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      📍 {req.distanceToPickupKm} km to pickup
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl my-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider">Pickup Spot (Donor)</p>
                    <p className="font-bold text-slate-800 mt-1 text-sm">{req.donorName}</p>
                    <p className="text-slate-500 mt-0.5">{req.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider">Dropoff Center (NGO)</p>
                    <p className="font-bold text-slate-800 mt-1 text-sm">{req.ngoName}</p>
                    <p className="text-slate-500 mt-0.5">{req.deliveryAddress}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center flex-wrap gap-3 pt-1">
                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>🛣️ Transit Trip: ~{req.deliveryTripKm} km</span>
                    <span>•</span>
                    <span>⏱️ Est. Travel: ~{req.estimatedMinutes} mins</span>
                    <span>•</span>
                    <span>⏰ Expiry: {new Date(req.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <button
                    onClick={() => handleAccept(req._id)}
                    disabled={acceptingId === req._id || hasActiveDelivery}
                    className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/20 transition disabled:opacity-50"
                  >
                    {acceptingId === req._id ? 'Accepting...' : hasActiveDelivery ? 'Busy with Active Delivery' : 'Accept Delivery Request →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;