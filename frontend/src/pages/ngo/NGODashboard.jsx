import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NGONavbar from '../../components/NGONavbar';
import LocationPicker from '../../components/LocationPicker';
import {
  getIncomingDonations,
  getMyNGODonations,
  getNGOProfile,
  acceptDonation,
  rejectDonation,
  chooseCollectionMethod,
  confirmNGOReceipt,
  switchSelfCollect,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <NGONavbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome, {user?.name} 👋</h1>
        <p className="text-gray-500 mb-6">Manage incoming donations, dispatch volunteers, and track deliveries</p>

        {!user?.profileCompleted && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex justify-between items-center flex-wrap gap-2">
            <span>Please complete your NGO profile to start receiving donations.</span>
            <Link to="/ngo/profile" className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-600">
              Complete Profile
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-gray-500 text-sm">Total Received</p>
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-gray-500 text-sm">Active Missions</p>
            <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-gray-500 text-sm">Completed</p>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>
        </div>

        {/* Incoming requests */}
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Incoming Donation Requests {incoming.length > 0 && `(${incoming.length})`}
        </h2>

        {loading ? (
          <p className="text-gray-500 mb-8">Loading incoming donations...</p>
        ) : incoming.length === 0 ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border text-center mb-8">
            <p className="text-gray-500">No new donation requests right now.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {incoming.map((donation) => (
              <div key={donation._id} className="bg-white p-5 rounded-xl shadow-sm border-2 border-green-200">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{donation.foodName}</p>
                    <p className="text-sm text-gray-500 capitalize">{donation.foodType.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    Awaiting Your Response
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <p><span className="text-gray-500">Quantity:</span> {donation.quantity} {donation.quantityUnit}</p>
                  <p><span className="text-gray-500">Expires:</span> {new Date(donation.expiryTime).toLocaleString()}</p>
                  <p className="col-span-2"><span className="text-gray-500">Pickup:</span> {donation.pickupAddress}</p>
                  <p className="col-span-2"><span className="text-gray-500">Donor:</span> {donation.donor?.name}</p>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleAccept(donation._id)}
                    disabled={actionLoading === donation._id}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {actionLoading === donation._id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleReject(donation._id)}
                    disabled={actionLoading === donation._id}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition"
                  >
                    {actionLoading === donation._id ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accepted donations needing collection plan */}
        {myDonations.some(donation => donation.status === 'NGO_ACCEPTED') && (
          <div className="space-y-3 mb-8">
            <h2 className="text-lg font-semibold text-gray-800">Action Needed: Choose Collection Method</h2>
            {myDonations.filter(donation => donation.status === 'NGO_ACCEPTED').map((donation) => (
              <div key={donation._id} className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex justify-between items-center gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-800">{donation.foodName}</p>
                  <p className="text-sm text-gray-600">Choose whether your NGO will collect it or request a nearby volunteer.</p>
                </div>
                <button
                  onClick={() => openCollectionDecision(donation)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
                >
                  Choose Method →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No-Volunteer Fallback Alert Section */}
        {myDonations.some(d => d.status === 'VOLUNTEER_REQUESTED' && d.volunteerSearchTimedOut) && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
              <span>⚠️</span> Volunteer Search Timed Out (Action Required)
            </h2>
            {myDonations.filter(d => d.status === 'VOLUNTEER_REQUESTED' && d.volunteerSearchTimedOut).map((donation) => (
              <div key={donation._id} className="bg-amber-50 border-2 border-amber-300 p-5 rounded-xl shadow-sm">
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-amber-900 text-base">{donation.foodName}</h3>
                    <p className="text-xs text-amber-800 mt-1">
                      No volunteer accepted this request within 3 minutes. Please choose how you want to proceed:
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 bg-amber-200 text-amber-900 rounded-full">
                    No Volunteer Available
                  </span>
                </div>

                <div className="flex gap-3 flex-wrap mt-4">
                  <button
                    onClick={() => handleSwitchSelfCollect(donation._id)}
                    disabled={actionLoading === donation._id}
                    className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-green-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>🛵</span> Collect Myself
                  </button>
                  <button
                    onClick={() => setTimeoutCancelTarget(donation)}
                    disabled={actionLoading === donation._id}
                    className="bg-red-600 text-white px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-red-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>❌</span> Cancel Donation (Rematch)
                  </button>
                  <button
                    onClick={() => handleRetryVolunteer(donation._id)}
                    disabled={actionLoading === donation._id}
                    className="bg-gray-100 text-gray-700 border border-gray-300 px-3.5 py-2.5 rounded-lg text-xs font-medium hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    🔄 Retry Search
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeout Cancellation Modal (Rematch Confirmation) */}
        {timeoutCancelTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-gray-800">
                  Cancel Donation & Rematch
                </h2>
                <button
                  onClick={() => setTimeoutCancelTarget(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Food Item: {timeoutCancelTarget.foodName}</p>
                <p>By cancelling, this donation will be automatically rematched to the next highest-ranked eligible NGO.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTimeoutCancelTarget(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={actionLoading === timeoutCancelTarget._id}
                  onClick={() => handleTimeoutCancelSubmit(timeoutCancelTarget._id, 'No volunteer accepted within timeout')}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 shadow transition flex justify-center items-center gap-2"
                >
                  {actionLoading === timeoutCancelTarget._id ? (
                    <span>Rematching...</span>
                  ) : (
                    <span>Confirm & Rematch</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collection modal */}
        {decisionDonation && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <form onSubmit={submitCollectionDecision} className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-5 my-8">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Plan Collection for {decisionDonation.foodName}</h2>
                  <p className="text-sm text-gray-500 mt-1">Set the final delivery address, then choose how the food will be collected.</p>
                </div>
                <button type="button" onClick={() => setDecisionDonation(null)} className="text-gray-500 hover:text-gray-800 text-xl font-bold">✕</button>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Final delivery destination</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['registered', 'Registered address'],
                    ['custom', 'Custom address'],
                    ['map_pin', 'Map pin']
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
                      className={`border rounded-lg px-3 py-2 text-sm ${deliveryOption === value ? 'border-green-600 bg-green-50 text-green-700 font-semibold' : 'border-gray-300 text-gray-600'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {deliveryOption !== 'registered' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {deliveryOption === 'custom' ? 'Custom address' : 'Map-pin label'}
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={deliveryOption === 'custom' ? 'Street, area, city' : 'Pinned delivery location'}
                  />
                </div>
              )}

              {deliveryOption === 'registered' ? (
                <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-700">
                  Using your registered address: {deliveryAddress}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pin final delivery location</label>
                  <LocationPicker onLocationSelect={setDeliveryLocation} initialPosition={deliveryLocation} />
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">How will this food be collected?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCollectionMethod('self_collect')}
                    className={`border rounded-lg p-3 text-left transition ${collectionMethod === 'self_collect' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}
                  >
                    <p className="font-semibold text-gray-800">Collect Myself</p>
                    <p className="text-xs text-gray-500 mt-1">Your NGO members will pick up the food from the donor.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionMethod('volunteer')}
                    className={`border rounded-lg p-3 text-left transition ${collectionMethod === 'volunteer' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}
                  >
                    <p className="font-semibold text-gray-800">Need Volunteer</p>
                    <p className="text-xs text-gray-500 mt-1">The system will dispatch and notify the 5 nearest available volunteers.</p>
                  </button>
                </div>
              </div>

              <button
                disabled={actionLoading === decisionDonation._id}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 shadow-md transition"
              >
                {actionLoading === decisionDonation._id ? 'Saving...' : 'Confirm Collection Plan'}
              </button>
            </form>
          </div>
        )}

        {/* Cancellation Reason Modal */}
        {cancelTargetDonation && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleCancelSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">
                Cancel Donation: {cancelTargetDonation.foodName}
              </h2>
              <p className="text-xs text-gray-500">
                Please provide a reason for cancellation. The donor will be notified.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Cancellation</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Unable to arrange transport, facility full, etc."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCancelTargetDonation(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === cancelTargetDonation._id}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === cancelTargetDonation._id ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Assigned and In-Progress Donations */}
        <h2 className="text-lg font-semibold text-gray-800 mb-3">All Assigned Donations</h2>

        {myDonations.length === 0 ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
            <p className="text-gray-500">No donations assigned yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border divide-y divide-gray-100">
            {myDonations.map((donation) => {
              const isAwaitingReceipt =
                ['DELIVERED', 'FOOD_COLLECTED', 'NGO_COLLECTING', 'OUT_FOR_DELIVERY'].includes(donation.status) &&
                !donation.ngoConfirmedReceipt;

              const isCancellable = ['NGO_ACCEPTED', 'NGO_COLLECTING', 'VOLUNTEER_REQUESTED', 'VOLUNTEER_ASSIGNED'].includes(donation.status);

              return (
                <div key={donation._id} className="p-5 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800">{donation.foodName}</p>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        donation.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : donation.status === 'CANCELLED' || donation.status === 'EXPIRED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {donation.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {donation.quantity} {donation.quantityUnit} • Donor: {donation.donor?.name} ({donation.donor?.phone || 'No phone'})
                    </p>
                    {donation.assignedVolunteer && (
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">
                        🛵 Volunteer: {donation.assignedVolunteer.name} ({donation.assignedVolunteer.phone || 'No phone'})
                      </p>
                    )}
                    {donation.status === 'CANCELLED' && donation.cancellationReason && (
                      <p className="text-xs text-red-600 mt-0.5">Reason: {donation.cancellationReason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isAwaitingReceipt && (
                      <button
                        onClick={() => handleConfirmReceipt(donation._id)}
                        disabled={actionLoading === donation._id}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 shadow-sm transition disabled:opacity-50"
                      >
                        {actionLoading === donation._id ? 'Confirming...' : '✓ Confirm Food Received'}
                      </button>
                    )}

                    {isCancellable && (
                      <button
                        onClick={() => {
                          setCancelTargetDonation(donation);
                          setCancelReason('');
                        }}
                        className="text-gray-400 hover:text-red-600 text-xs px-2 py-1"
                      >
                        Cancel
                      </button>
                    )}

                    {donation.status === 'COMPLETED' && (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
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
  );
};

export default NGODashboard;
