import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Package, Activity, CheckCircle2, AlertTriangle, Inbox, Clock, MapPin, User, Phone, Truck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import LocationPicker from '../../components/LocationPicker';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import {
  getIncomingDonations,
  getMyNGODonations,
  getNGOProfile,
  acceptDonation,
  rejectDonation,
  chooseCollectionMethod,
  confirmNGOReceipt,
  retryVolunteerSearch,
  volunteerTimeoutAction
} from '../../api/ngo.api';
import { cancelDonation } from '../../api/donation.api';
import toast from 'react-hot-toast';

const NGODashboard = () => {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [decisionDonation, setDecisionDonation] = useState(null);
  const [cancelTargetDonation, setCancelTargetDonation] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [timeoutCancelTarget, setTimeoutCancelTarget] = useState(null);
  const [collectionMethod, setCollectionMethod] = useState('self_collect');
  const [deliveryOption, setDeliveryOption] = useState('registered');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [registeredLocation, setRegisteredLocation] = useState(null);
  const isMountedRef = useRef(true);

  const fetchIncoming = async () => {
    try {
      const res = await getIncomingDonations();
      if (isMountedRef.current) {
        setIncoming(res.data.donations || []);
      }
    } catch {
      console.error('Failed to load incoming donations');
    }
  };

  const fetchMyDonations = async () => {
    try {
      const res = await getMyNGODonations();
      if (isMountedRef.current) {
        setMyDonations(res.data.donations || []);
      }
    } catch {
      console.error('Failed to load my donations');
    }
  };

  const reloadAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchIncoming(), fetchMyDonations()]);
      toast.success('Dashboard updated');
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
        const [incomingRes, myRes] = await Promise.all([
          getIncomingDonations(),
          getMyNGODonations()
        ]);
        if (isMountedRef.current) {
          setIncoming(incomingRes.data.donations || []);
          setMyDonations(myRes.data.donations || []);
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
    const interval = setInterval(fetchIncoming, 15000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      await acceptDonation(id);
      toast.success('Donation accepted!');
      fetchIncoming();
      fetchMyDonations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept');
      fetchIncoming();
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await rejectDonation(id);
      toast.success('Donation rejected');
      fetchIncoming();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
      fetchIncoming();
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const handleConfirmReceipt = async (id) => {
    setActionLoading(id);
    try {
      await confirmNGOReceipt(id);
      toast.success('Food receipt confirmed! Donation marked as completed.');
      fetchMyDonations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm receipt');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const handleSwitchSelfCollect = async (id) => {
    setActionLoading(id);
    try {
      await volunteerTimeoutAction(id, 'COLLECT_MYSELF');
      toast.success('Switched to self-collection mode! Your team can now pick up the food.');
      fetchMyDonations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to switch to self-collect');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const handleTimeoutCancelSubmit = async (donationId, reason) => {
    setActionLoading(donationId);
    try {
      const res = await volunteerTimeoutAction(donationId, 'CANCEL_DONATION', reason);
      if (res.data?.status === 'EXPIRED') {
        toast.error('Donation has expired and could not be rematched.');
      } else {
        toast.success('Donation is being rematched to the next eligible NGO.');
      }
      setTimeoutCancelTarget(null);
      fetchMyDonations();
      fetchIncoming();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel and rematch donation');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const handleRetryVolunteer = async (id) => {
    setActionLoading(id);
    try {
      await retryVolunteerSearch(id);
      toast.success('Volunteer search restarted. Nearby volunteers re-notified!');
      fetchMyDonations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to retry volunteer search');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelTargetDonation) return;

    setActionLoading(cancelTargetDonation._id);
    try {
      await cancelDonation(cancelTargetDonation._id, cancelReason);
      toast.success('Donation cancelled successfully.');
      setCancelTargetDonation(null);
      setCancelReason('');
      fetchMyDonations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel donation');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const openCollectionDecision = async (donation) => {
    try {
      const res = await getNGOProfile();
      const ngo = res.data.ngo;
      const coordinates = ngo.location?.coordinates;

      if (!ngo.address || !coordinates || coordinates[0] === 0) {
        toast.error('Please complete your NGO profile and registered map location first');
        return;
      }

      setDecisionDonation(donation);
      setCollectionMethod('self_collect');
      setDeliveryOption('registered');
      const profileLocation = { lat: coordinates[1], lng: coordinates[0] };
      setRegisteredAddress(ngo.address);
      setRegisteredLocation(profileLocation);
      setDeliveryAddress(ngo.address);
      setDeliveryLocation(profileLocation);
    } catch {
      toast.error('Could not load your NGO profile');
    }
  };

  const submitCollectionDecision = async (e) => {
    e.preventDefault();

    if (!deliveryLocation) {
      toast.error('Please select the final delivery location');
      return;
    }

    const finalAddress = deliveryOption === 'map_pin' && !deliveryAddress.trim()
      ? 'Pinned delivery location'
      : deliveryAddress.trim();

    if (!finalAddress) {
      toast.error('Please provide the final delivery address');
      return;
    }

    setActionLoading(decisionDonation._id);
    try {
      await chooseCollectionMethod(decisionDonation._id, {
        collectionMethod,
        deliveryAddress: finalAddress,
        deliveryAddressType: deliveryOption,
        latitude: deliveryLocation.lat,
        longitude: deliveryLocation.lng
      });
      toast.success(collectionMethod === 'self_collect'
        ? 'Collection details saved'
        : 'Volunteer request created. Nearby volunteers are being notified.');
      setDecisionDonation(null);
      fetchMyDonations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the collection choice');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null);
      }
    }
  };

  const stats = {
    total: myDonations.length,
    active: myDonations.filter(d => !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(d.status)).length,
    completed: myDonations.filter(d => d.status === 'COMPLETED').length,
  };

  const pendingCollectionAction = myDonations.filter(d => d.status === 'NGO_ACCEPTED');
  const timedOutVolunteerDonations = myDonations.filter(d => d.status === 'VOLUNTEER_REQUESTED' && d.volunteerSearchTimedOut);

  return (
    <AppLayout maxWidth="max-w-6xl">
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${user?.name || 'Partner'} 👋`}
          description="Manage incoming food requests, coordinate volunteer pickup, and track assigned deliveries."
          actions={
            <button
              type="button"
              onClick={reloadAll}
              disabled={refreshing}
              className="btn-secondary"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          }
        />

        {!user?.profileCompleted && (
          <AlertBanner
            tone="warning"
            title="NGO Profile Incomplete"
            action={
              <Link to="/ngo/profile" className="btn-secondary text-xs">
                Complete Profile
              </Link>
            }
          >
            Please complete your NGO operating hours, intake capacity, and registered map location to receive matched donations.
          </AlertBanner>
        )}

        {/* Primary Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Package}
            label="Total Assigned"
            value={stats.total}
            hint="All matched donations"
          />
          <StatCard
            icon={Activity}
            label="Active Operations"
            value={stats.active}
            hint="In-progress collections & delivery"
            accent="text-amber-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed Meals"
            value={stats.completed}
            hint="Successfully received by NGO"
            accent="text-forest"
          />
        </div>

        {/* Section 1: Incoming Donation Requests */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              Incoming Donation Requests
              {incoming.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {incoming.length} new
                </span>
              )}
            </h2>
            <span className="text-xs text-muted">Auto-refreshes every 15s</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          ) : incoming.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No incoming donation requests"
              description="When nearby donors post surplus food that matches your location and capacity, matched requests will appear here for your review."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incoming.map((donation) => (
                <div key={donation._id} className="card p-5 border-l-4 border-l-forest hover:shadow-card transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold text-ink text-base">{donation.foodName}</h3>
                        <p className="text-xs text-muted capitalize">{donation.foodType?.replace(/_/g, ' ')}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        Needs Action
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-body my-3">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-muted shrink-0" />
                        <span><strong>Quantity:</strong> {donation.quantity} {donation.quantityUnit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-muted shrink-0" />
                        <span><strong>Expires:</strong> {new Date(donation.expiryTime).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted shrink-0" />
                        <span className="truncate"><strong>Pickup:</strong> {donation.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-muted shrink-0" />
                        <span><strong>Donor:</strong> {donation.donor?.name || 'Anonymous'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-line mt-2">
                    <button
                      type="button"
                      onClick={() => handleAccept(donation._id)}
                      disabled={actionLoading === donation._id}
                      className="btn-primary flex-1 text-xs py-2"
                    >
                      {actionLoading === donation._id ? 'Accepting...' : 'Accept Request'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(donation._id)}
                      disabled={actionLoading === donation._id}
                      className="btn-secondary text-rose-700 hover:bg-rose-50 border-rose-200 flex-1 text-xs py-2"
                    >
                      {actionLoading === donation._id ? 'Rejecting...' : 'Decline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Action Needed: Choose Collection Method */}
        {pendingCollectionAction.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Truck size={18} className="text-indigo-600" />
              Action Required: Choose Collection Method
            </h2>
            <div className="space-y-3">
              {pendingCollectionAction.map((donation) => (
                <div key={donation._id} className="card p-5 bg-indigo-50/40 border-indigo-200 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm">{donation.foodName}</span>
                      <StatusBadge status={donation.status} />
                    </div>
                    <p className="text-xs text-muted">
                      Accepted by your NGO. Set delivery destination and choose whether your team will collect or request a volunteer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCollectionDecision(donation)}
                    className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-xs py-2 px-4 shadow-sm"
                  >
                    Set Collection Plan →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: No-Volunteer Fallback Alert Section */}
        {timedOutVolunteerDonations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              Volunteer Search Timed Out (Action Required)
            </h2>
            <div className="space-y-3">
              {timedOutVolunteerDonations.map((donation) => (
                <div key={donation._id} className="card p-5 bg-amber-50/60 border-amber-300 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-amber-950 text-sm">{donation.foodName}</h3>
                      <p className="text-xs text-amber-800 mt-0.5">
                        No volunteer accepted this delivery request within 3 minutes. Please choose how to proceed:
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
                      No Volunteer Available
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap pt-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchSelfCollect(donation._id)}
                      disabled={actionLoading === donation._id}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      🛵 Collect Myself
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeoutCancelTarget(donation)}
                      disabled={actionLoading === donation._id}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      ❌ Cancel & Rematch NGO
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRetryVolunteer(donation._id)}
                      disabled={actionLoading === donation._id}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      🔄 Retry Volunteer Search
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: All Assigned & Active Donations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">All Assigned Donations</h2>
            <span className="text-xs text-muted">{myDonations.length} total records</span>
          </div>

          {myDonations.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No assigned donations yet"
              description="Accepted donations will be listed here with tracking and receipt confirmation actions."
            />
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {myDonations.map((donation) => {
                const isAwaitingReceipt =
                  ['DELIVERED', 'FOOD_COLLECTED', 'NGO_COLLECTING', 'OUT_FOR_DELIVERY'].includes(donation.status) &&
                  !donation.ngoConfirmedReceipt;

                const isCancellable = ['NGO_ACCEPTED', 'NGO_COLLECTING', 'VOLUNTEER_REQUESTED', 'VOLUNTEER_ASSIGNED'].includes(donation.status);

                return (
                  <div key={donation._id} className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap hover:bg-slate-50/50 transition">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-ink text-sm">{donation.foodName}</p>
                        <StatusBadge status={donation.status} />
                      </div>
                      <p className="text-xs text-muted flex items-center gap-2 flex-wrap">
                        <span>{donation.quantity} {donation.quantityUnit}</span>
                        <span>•</span>
                        <span>Donor: {donation.donor?.name || 'Donor'} ({donation.donor?.phone || 'No phone'})</span>
                      </p>
                      {donation.assignedVolunteer && (
                        <p className="text-xs text-indigo-700 font-medium flex items-center gap-1.5">
                          <Truck size={14} />
                          Volunteer: {donation.assignedVolunteer.name} ({donation.assignedVolunteer.phone || 'No phone'})
                        </p>
                      )}
                      {donation.status === 'CANCELLED' && donation.cancellationReason && (
                        <p className="text-xs text-rose-600">Cancellation reason: {donation.cancellationReason}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAwaitingReceipt && (
                        <button
                          type="button"
                          onClick={() => handleConfirmReceipt(donation._id)}
                          disabled={actionLoading === donation._id}
                          className="btn-primary text-xs py-1.5 px-3 shadow-sm"
                        >
                          {actionLoading === donation._id ? 'Confirming...' : '✓ Confirm Food Received'}
                        </button>
                      )}

                      {isCancellable && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelTargetDonation(donation);
                            setCancelReason('');
                          }}
                          className="btn-ghost text-xs text-rose-600 hover:bg-rose-50"
                        >
                          Cancel
                        </button>
                      )}

                      {donation.status === 'COMPLETED' && (
                        <span className="text-xs font-medium text-forest bg-forest-light px-3 py-1 rounded-full border border-forest/20">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Collection Decision */}
      <Modal
        open={!!decisionDonation}
        onClose={() => setDecisionDonation(null)}
        title={decisionDonation ? `Collection Plan: ${decisionDonation.foodName}` : ''}
        wide
      >
        {decisionDonation && (
          <form onSubmit={submitCollectionDecision} className="space-y-5">
            <p className="text-xs text-muted">
              Choose the delivery destination for this food donation, then decide whether your NGO team will pick it up or request a nearby volunteer.
            </p>

            <div className="space-y-2">
              <label className="field-label">Final Delivery Destination</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['registered', 'Registered Address'],
                  ['custom', 'Custom Address'],
                  ['map_pin', 'Pin on Map']
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => {
                      setDeliveryOption(value);
                      if (value === 'registered') {
                        setDeliveryAddress(registeredAddress);
                        setDeliveryLocation(registeredLocation);
                      } else {
                        setDeliveryAddress(value === 'map_pin' ? 'Pinned delivery location' : '');
                        setDeliveryLocation(null);
                      }
                    }}
                    className={`border rounded-control px-3 py-2 text-xs font-medium transition ${
                      deliveryOption === value
                        ? 'border-forest bg-forest-light text-forest font-semibold'
                        : 'border-line text-body hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {deliveryOption !== 'registered' && (
              <div className="space-y-1">
                <label className="field-label">
                  {deliveryOption === 'custom' ? 'Custom Address' : 'Map Pin Reference'}
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="field-input text-xs"
                  placeholder={deliveryOption === 'custom' ? 'Street, area, city' : 'Pinned location reference'}
                />
              </div>
            )}

            {deliveryOption === 'registered' ? (
              <div className="card p-3.5 bg-slate-50 text-xs text-body border-line">
                <p className="font-medium text-ink mb-0.5">NGO Registered Facility:</p>
                <p className="text-muted">{deliveryAddress}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="field-label">Pin destination location on map</label>
                <LocationPicker onLocationSelect={setDeliveryLocation} initialPosition={deliveryLocation} />
              </div>
            )}

            <div className="space-y-2">
              <label className="field-label">Collection Method</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCollectionMethod('self_collect')}
                  className={`border rounded-card p-3.5 text-left transition ${
                    collectionMethod === 'self_collect'
                      ? 'border-forest bg-forest-light ring-1 ring-forest'
                      : 'border-line hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold text-ink text-xs flex items-center gap-1.5">
                    🛵 Collect Myself
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    Your NGO team/staff will pick up the food directly from the donor location.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionMethod('volunteer')}
                  className={`border rounded-card p-3.5 text-left transition ${
                    collectionMethod === 'volunteer'
                      ? 'border-forest bg-forest-light ring-1 ring-forest'
                      : 'border-line hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold text-ink text-xs flex items-center gap-1.5">
                    🤝 Need Volunteer
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    The platform automatically notifies the 5 nearest active volunteers to handle transport.
                  </p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setDecisionDonation(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === decisionDonation._id}
                className="btn-primary text-xs"
              >
                {actionLoading === decisionDonation._id ? 'Saving Plan...' : 'Confirm Collection Plan'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 2: Timeout Cancellation & Rematch */}
      <Modal
        open={!!timeoutCancelTarget}
        onClose={() => setTimeoutCancelTarget(null)}
        title="Cancel & Rematch Donation"
      >
        {timeoutCancelTarget && (
          <div className="space-y-4">
            <div className="card p-3 bg-amber-50 text-xs text-amber-900 border-amber-200 space-y-1">
              <p className="font-semibold">Donation: {timeoutCancelTarget.foodName}</p>
              <p>
                Cancelling this donation due to volunteer unavailability will trigger automated rematching to the next highest-ranked eligible NGO.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTimeoutCancelTarget(null)}
                className="btn-secondary text-xs"
              >
                Back
              </button>
              <button
                type="button"
                disabled={actionLoading === timeoutCancelTarget._id}
                onClick={() => handleTimeoutCancelSubmit(timeoutCancelTarget._id, 'No volunteer accepted within timeout')}
                className="btn-danger text-xs"
              >
                {actionLoading === timeoutCancelTarget._id ? 'Rematching...' : 'Confirm & Rematch'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 3: Cancellation Reason Modal */}
      <Modal
        open={!!cancelTargetDonation}
        onClose={() => setCancelTargetDonation(null)}
        title={cancelTargetDonation ? `Cancel Donation: ${cancelTargetDonation.foodName}` : ''}
      >
        {cancelTargetDonation && (
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <p className="text-xs text-muted">
              Please provide a reason for cancelling this donation. The donor will be notified.
            </p>
            <div className="space-y-1">
              <label className="field-label">Reason for Cancellation</label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Storage capacity reached, emergency closure, etc."
                className="field-input text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTargetDonation(null)}
                className="btn-secondary text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={actionLoading === cancelTargetDonation._id}
                className="btn-danger text-xs"
              >
                {actionLoading === cancelTargetDonation._id ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AppLayout>
  );
};

export default NGODashboard;
