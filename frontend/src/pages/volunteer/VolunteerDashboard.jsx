import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, Bike, MapPin, Clock, RefreshCw, ArrowRight, Activity, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import AlertBanner from '../../components/ui/AlertBanner';
import Skeleton from '../../components/ui/Skeleton';
import { getVolunteerProfile, getAvailableRequests, acceptDelivery } from '../../api/volunteer.api';
import toast from 'react-hot-toast';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const isMountedRef = useRef(true);

  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const res = await getAvailableRequests();
      if (isMountedRef.current) {
        setRequests(res.data.requests || []);
      }
    } catch {
      console.error('Failed to load available requests');
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
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
    <AppLayout>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="Pick up surplus food donations and deliver them to nearby charities."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRequests}
              disabled={refreshing}
              className="btn-secondary"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            {hasActiveDelivery && (
              <Link to="/volunteer/active" className="btn-primary animate-pulse">
                <Truck size={16} /> Live mission
              </Link>
            )}
          </div>
        }
      />

      {!user?.profileCompleted && (
        <AlertBanner
          tone="warning"
          title="Complete your volunteer profile"
          actionLabel="Complete profile"
          actionTo="/volunteer/profile"
        >
          Add your vehicle type and operating map location so nearby delivery dispatches can be matched to you.
        </AlertBanner>
      )}

      {/* Active Mission Banner */}
      {hasActiveDelivery && (
        <div className="card p-6 mb-8 bg-gradient-to-br from-ink to-slate-800 text-white border-none shadow-pop">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-forest-light/20 text-forest-muted text-xs font-semibold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Mission in Progress
              </div>
              <h2 className="text-xl font-bold text-white">
                {profile.activeDelivery.donation?.foodName || 'Active Food Delivery'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Status:{' '}
                <span className="font-semibold text-emerald-300 capitalize">
                  {profile.activeDelivery.status?.replace(/_/g, ' ').toLowerCase()}
                </span>
              </p>
            </div>
            <Link to="/volunteer/active" className="btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-md">
              Open Mission Tracker <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={CheckCircle2}
          label="Total completed trips"
          value={profile?.totalDeliveries || 0}
          hint="All delivered donations"
        />
        <StatCard
          icon={Activity}
          label="Dispatch status"
          value={hasActiveDelivery ? 'On Mission' : profile?.isAvailable ? 'Available' : 'Paused'}
          hint={hasActiveDelivery ? 'Delivery in progress' : 'Ready for dispatches'}
          accent={hasActiveDelivery ? 'text-indigo-600' : profile?.isAvailable ? 'text-forest' : 'text-muted'}
        />
        <StatCard
          icon={Bike}
          label="Registered vehicle"
          value={profile?.vehicleType ? profile.vehicleType.charAt(0).toUpperCase() + profile.vehicleType.slice(1) : 'Not set'}
          hint="Calculates speed & ETA"
          accent="text-ink"
        />
      </div>

      {/* Available Requests Section */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Available delivery requests {requests.length > 0 && `(${requests.length})`}
          </h2>
          <p className="text-xs text-muted">Nearby donations needing transport to NGO drop-off points</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No open delivery requests near you"
          description="When an NGO requests volunteer transport for surplus food, it will appear here in real time."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req._id}
              className="card p-5 sm:p-6 hover:border-forest/40 transition flex flex-col justify-between"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base text-ink">{req.foodName}</h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-light text-forest-dark border border-forest-muted capitalize">
                      {req.foodType?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Quantity: <span className="font-medium text-ink">{req.quantity} {req.quantityUnit}</span>
                  </p>
                </div>
                {req.distanceToPickupKm !== null && (
                  <span className="self-start inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-body border border-line">
                    <MapPin size={13} className="text-forest" />
                    {req.distanceToPickupKm} km to pickup
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-canvas p-4 rounded-control my-4 text-xs">
                <div>
                  <p className="font-semibold text-muted uppercase tracking-wider text-[10px]">Pickup point (Donor)</p>
                  <p className="font-semibold text-ink mt-1 text-sm">{req.donorName}</p>
                  <p className="text-muted mt-0.5 leading-relaxed">{req.pickupAddress}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted uppercase tracking-wider text-[10px]">Delivery destination (NGO)</p>
                  <p className="font-semibold text-ink mt-1 text-sm">{req.ngoName}</p>
                  <p className="text-muted mt-0.5 leading-relaxed">{req.deliveryAddress}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-line mt-1">
                <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> Trip: ~{req.deliveryTripKm} km
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> Est. travel: ~{req.estimatedMinutes} mins
                  </span>
                  <span>•</span>
                  <span>Expires: {new Date(req.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAccept(req._id)}
                  disabled={acceptingId === req._id || hasActiveDelivery}
                  className="btn-primary shrink-0 self-end sm:self-auto"
                >
                  {acceptingId === req._id ? 'Accepting…' : hasActiveDelivery ? 'Busy with Active Mission' : 'Accept Delivery Request →'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default VolunteerDashboard;