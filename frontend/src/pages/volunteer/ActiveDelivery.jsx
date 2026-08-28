import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import VolunteerNavbar from '../../components/VolunteerNavbar';
import {
  getActiveDelivery,
  confirmVolunteerPickup,
  confirmVolunteerDelivery
} from '../../api/volunteer.api';
import toast from 'react-hot-toast';

const ActiveDelivery = () => {
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const isMountedRef = useRef(true);

  const fetchActive = async () => {
    try {
      const res = await getActiveDelivery();
      if (isMountedRef.current) {
        setDelivery(res.data.delivery);
      }
    } catch {
      console.error('Failed to load active delivery');
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    async function initialLoad() {
      try {
        const res = await getActiveDelivery();
        if (isMountedRef.current) {
          setDelivery(res.data.delivery);
        }
      } catch {
        console.error('Failed to load active delivery');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    initialLoad();
    const interval = setInterval(fetchActive, 10000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const handlePickup = async () => {
    if (!delivery) return;
    setActionLoading(true);
    try {
      const res = await confirmVolunteerPickup(delivery._id);
      toast.success(res.data.message || 'Pickup confirmed! NGO has been notified of your estimated arrival time.');
      fetchActive();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm pickup');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  const handleDeliver = async () => {
    if (!delivery) return;
    setActionLoading(true);
    try {
      const res = await confirmVolunteerDelivery(delivery._id);
      toast.success(res.data.message || 'Delivery marked as dropped off! Awaiting NGO confirmation.');
      fetchActive();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm delivery');
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <VolunteerNavbar />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center text-slate-400 font-medium text-sm">
          Loading live mission data...
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-slate-50">
        <VolunteerNavbar />
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <div className="text-5xl mb-4">🛵</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Active Mission in Progress</h2>
          <p className="text-slate-500 text-xs mb-6">
            You do not have any active delivery assigned at the moment. Browse available requests on your dashboard to accept a new delivery mission.
          </p>
          <Link
            to="/volunteer/dashboard"
            className="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-xs hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/20 transition"
          >
            Browse Available Requests →
          </Link>
        </div>
      </div>
    );
  }

  const donation = delivery.donation || {};
  const isPickedUp = delivery.status === 'IN_TRANSIT' || delivery.status === 'PICKED_UP' || delivery.volunteerConfirmedPickup;
  const isDelivered = delivery.status === 'DELIVERED';
  const isCompleted = delivery.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-slate-50">
      <VolunteerNavbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">Live Delivery Mission</h1>
              <span className="text-xs px-3 py-1 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                {delivery.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Food: <span className="font-semibold text-slate-700">{donation.foodName}</span> ({donation.quantity} {donation.quantityUnit})
            </p>
          </div>
          <Link
            to="/volunteer/dashboard"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 transition"
          >
            ← Back to Feed
          </Link>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 mb-6">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            <div className="text-emerald-600">
              <div className="w-8 h-8 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-1 text-emerald-700 font-bold">✓</div>
              Assigned
            </div>
            <div className={isPickedUp || isDelivered || isCompleted ? 'text-emerald-600' : 'text-slate-400'}>
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${isPickedUp || isDelivered || isCompleted ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                {isPickedUp || isDelivered || isCompleted ? '✓' : '2'}
              </div>
              Picked Up (In Transit)
            </div>
            <div className={isDelivered || isCompleted ? 'text-emerald-600' : 'text-slate-400'}>
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${isDelivered || isCompleted ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                {isDelivered || isCompleted ? '✓' : '3'}
              </div>
              Delivered
            </div>
            <div className={isCompleted ? 'text-emerald-600' : 'text-slate-400'}>
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${isCompleted ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                {isCompleted ? '✓' : '4'}
              </div>
              NGO Confirmed
            </div>
          </div>
        </div>

        {/* ETA Alert Banner (When In Transit) */}
        {isPickedUp && !isDelivered && !isCompleted && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md mb-6 flex justify-between items-center flex-wrap gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-100">Live Delivery In Transit</p>
              <h2 className="text-xl font-bold mt-0.5">
                Estimated Travel Time: ~{delivery.estimatedDeliveryMinutes || 15} minutes
              </h2>
              {delivery.estimatedDeliveryTime && (
                <p className="text-xs text-emerald-100 mt-1">
                  Target Arrival: {new Date(delivery.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="text-xs bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/20">
              🔔 NGO receives automatic ~2 min arrival alert
            </div>
          </div>
        )}

        {/* Step 1: Donor Pickup Card */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border mb-6 transition ${!isPickedUp ? 'border-2 border-blue-500' : 'border-slate-200/80'}`}>
          <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                Step 1: Pickup Location
              </span>
              <h3 className="text-lg font-bold text-slate-800 mt-2">
                {donation.donor?.name || 'Donor'}
              </h3>
            </div>
            {isPickedUp ? (
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                ✓ Food Collected
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full animate-pulse">
                Proceed to Pickup
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl">
            <p><span className="font-semibold text-slate-500">Address:</span> {delivery.pickupAddress}</p>
            {donation.donor?.phone && (
              <p>
                <span className="font-semibold text-slate-500">Phone:</span>{' '}
                <a href={`tel:${donation.donor.phone}`} className="text-blue-600 font-semibold underline">
                  {donation.donor.phone}
                </a>
              </p>
            )}
          </div>

          {!isPickedUp && (
            <div className="mt-5">
              <button
                onClick={handlePickup}
                disabled={actionLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 transition disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : '📦 Confirm Food Pickup from Donor'}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Calculates live ETA and sends automated arrival timeline notification to the recipient NGO.
              </p>
            </div>
          )}
        </div>

        {/* Step 2: NGO Delivery Card */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border mb-6 transition ${isPickedUp && !isDelivered ? 'border-2 border-emerald-500' : 'border-slate-200/80'}`}>
          <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                Step 2: Drop-Off Destination
              </span>
              <h3 className="text-lg font-bold text-slate-800 mt-2">
                {donation.matchedNGOProfile?.organizationName || delivery.ngo?.name || 'NGO'}
              </h3>
            </div>
            {isDelivered || isCompleted ? (
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                ✓ Dropped Off
              </span>
            ) : isPickedUp ? (
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full animate-pulse">
                Deliver to Destination
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                Pending Pickup
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl">
            <p><span className="font-semibold text-slate-500">Address:</span> {delivery.deliveryAddress}</p>
            {(donation.matchedNGOProfile?.phone || delivery.ngo?.phone) && (
              <p>
                <span className="font-semibold text-slate-500">Contact:</span>{' '}
                <a href={`tel:${donation.matchedNGOProfile?.phone || delivery.ngo?.phone}`} className="text-blue-600 font-semibold underline">
                  {donation.matchedNGOProfile?.phone || delivery.ngo?.phone}
                </a>
              </p>
            )}
          </div>

          {isPickedUp && !isDelivered && !isCompleted && (
            <div className="mt-5">
              <button
                onClick={handleDeliver}
                disabled={actionLoading}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : '🏁 Confirm Food Delivered at NGO'}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Click once you have arrived at the NGO destination and handed over the food packages.
              </p>
            </div>
          )}
        </div>

        {/* Step 3: Awaiting NGO Confirmation */}
        {isDelivered && !isCompleted && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center">
            <div className="text-3xl mb-2">⏳</div>
            <h3 className="text-lg font-bold text-amber-900">Awaiting NGO Receipt Confirmation</h3>
            <p className="text-xs text-amber-800 mt-1 max-w-lg mx-auto">
              You have successfully delivered the food! The NGO has been notified to confirm receipt. Once confirmed, this mission will be marked complete and added to your delivery history.
            </p>
          </div>
        )}

        {/* Completed Mission Banner */}
        {isCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-bold text-emerald-900">Mission Completed!</h3>
            <p className="text-xs text-emerald-800 mt-1 mb-4">
              Thank you for redistributing food and helping the community. Your delivery stats have been updated.
            </p>
            <Link
              to="/volunteer/dashboard"
              className="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-xs hover:bg-emerald-700 shadow-sm transition"
            >
              Back to Dashboard for New Missions →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveDelivery;
