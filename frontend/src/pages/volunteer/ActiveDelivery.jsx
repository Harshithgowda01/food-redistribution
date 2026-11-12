import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Truck, CheckCircle2, MapPin, Phone, Clock, ArrowLeft, PackageCheck, AlertCircle, Sparkles } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import AlertBanner from '../../components/ui/AlertBanner';
import Skeleton from '../../components/ui/Skeleton';
import { getActiveDelivery, confirmVolunteerPickup, confirmVolunteerDelivery } from '../../api/volunteer.api';
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
      <AppLayout maxWidth="max-w-3xl">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40" />
          <Skeleton className="h-56" />
        </div>
      </AppLayout>
    );
  }

  if (!delivery) {
    return (
      <AppLayout maxWidth="max-w-3xl">
        <PageHeader
          title="Live delivery mission"
          description="Track your current active food rescue mission in real time."
        />
        <EmptyState
          icon={Truck}
          title="No active mission right now"
          description="You don't have any delivery assigned. Check your dashboard feed to accept a nearby delivery request."
          actionLabel="Browse delivery requests"
          actionTo="/volunteer/dashboard"
        />
      </AppLayout>
    );
  }

  const donation = delivery.donation || {};
  const isPickedUp = delivery.status === 'IN_TRANSIT' || delivery.status === 'PICKED_UP' || delivery.volunteerConfirmedPickup;
  const isDelivered = delivery.status === 'DELIVERED';
  const isCompleted = delivery.status === 'COMPLETED';

  const steps = [
    { label: 'Assigned', done: true },
    { label: 'In transit', done: isPickedUp || isDelivered || isCompleted },
    { label: 'Delivered', done: isDelivered || isCompleted },
    { label: 'NGO confirmed', done: isCompleted }
  ];

  return (
    <AppLayout maxWidth="max-w-3xl">
      <div className="mb-4">
        <Link to="/volunteer/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </div>

      <PageHeader
        title={donation.foodName || 'Active food delivery'}
        description={`Quantity: ${donation.quantity} ${donation.quantityUnit || 'meals'} • Food type: ${donation.foodType?.replace(/_/g, ' ')}`}
        actions={<StatusBadge status={delivery.status} />}
      />

      {/* Stepper Card */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {steps.map((step, idx) => (
            <div key={step.label} className={step.done ? 'text-forest font-semibold' : 'text-muted'}>
              <div
                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1.5 text-xs font-bold transition ${
                  step.done ? 'bg-forest text-white' : 'bg-canvas text-muted border border-line'
                }`}
              >
                {step.done ? '✓' : idx + 1}
              </div>
              <span className="leading-tight block">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transit ETA Banner */}
      {isPickedUp && !isDelivered && !isCompleted && (
        <AlertBanner
          tone="info"
          title={`Estimated travel time: ~${delivery.estimatedDeliveryMinutes || 15} minutes`}
        >
          {delivery.estimatedDeliveryTime && (
            <span>Target arrival: {new Date(delivery.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • </span>
          )}
          The NGO receives an automated arrival timeline notification so staff are ready to receive the food.
        </AlertBanner>
      )}

      {/* Step 1: Donor Pickup */}
      <div className={`card p-6 mb-6 transition ${!isPickedUp ? 'ring-2 ring-forest/30 border-forest' : ''}`}>
        <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-forest bg-forest-light border border-forest-muted px-2.5 py-1 rounded-control">
              Step 1: Pickup from donor
            </span>
            <h3 className="text-base font-semibold text-ink mt-2">
              {donation.donor?.name || 'Donor'}
            </h3>
          </div>
          {isPickedUp ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-light text-forest-dark border border-forest-muted">
              <CheckCircle2 size={13} /> Food picked up
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Proceed to pickup
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-body bg-canvas p-4 rounded-control">
          <p className="flex items-start gap-2">
            <MapPin size={14} className="text-muted shrink-0 mt-0.5" />
            <span><span className="font-semibold text-ink">Pickup address:</span> {delivery.pickupAddress}</span>
          </p>
          {donation.donor?.phone && (
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-muted shrink-0" />
              <span><span className="font-semibold text-ink">Phone:</span>{' '}
                <a href={`tel:${donation.donor.phone}`} className="text-forest font-semibold hover:underline">
                  {donation.donor.phone}
                </a>
              </span>
            </p>
          )}
        </div>

        {!isPickedUp && (
          <div className="mt-5">
            <button
              type="button"
              onClick={handlePickup}
              disabled={actionLoading}
              className="btn-primary w-full"
            >
              <PackageCheck size={16} />
              {actionLoading ? 'Updating…' : 'Confirm food pickup from donor'}
            </button>
            <p className="text-[11px] text-muted text-center mt-2">
              Calculates live travel ETA and sends automated arrival notification to recipient NGO.
            </p>
          </div>
        )}
      </div>

      {/* Step 2: NGO Delivery */}
      <div className={`card p-6 mb-6 transition ${isPickedUp && !isDelivered ? 'ring-2 ring-forest/30 border-forest' : ''}`}>
        <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-forest bg-forest-light border border-forest-muted px-2.5 py-1 rounded-control">
              Step 2: Drop-off destination
            </span>
            <h3 className="text-base font-semibold text-ink mt-2">
              {donation.matchedNGOProfile?.organizationName || delivery.ngo?.name || 'NGO partner'}
            </h3>
          </div>
          {isDelivered || isCompleted ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-light text-forest-dark border border-forest-muted">
              <CheckCircle2 size={13} /> Dropped off
            </span>
          ) : isPickedUp ? (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
              Deliver to destination
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-muted">
              Pending pickup
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-body bg-canvas p-4 rounded-control">
          <p className="flex items-start gap-2">
            <MapPin size={14} className="text-muted shrink-0 mt-0.5" />
            <span><span className="font-semibold text-ink">Delivery address:</span> {delivery.deliveryAddress}</span>
          </p>
          {(donation.matchedNGOProfile?.phone || delivery.ngo?.phone) && (
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-muted shrink-0" />
              <span><span className="font-semibold text-ink">NGO contact:</span>{' '}
                <a href={`tel:${donation.matchedNGOProfile?.phone || delivery.ngo?.phone}`} className="text-forest font-semibold hover:underline">
                  {donation.matchedNGOProfile?.phone || delivery.ngo?.phone}
                </a>
              </span>
            </p>
          )}
        </div>

        {isPickedUp && !isDelivered && !isCompleted && (
          <div className="mt-5">
            <button
              type="button"
              onClick={handleDeliver}
              disabled={actionLoading}
              className="btn-primary w-full"
            >
              <CheckCircle2 size={16} />
              {actionLoading ? 'Updating…' : 'Confirm food delivered at NGO'}
            </button>
            <p className="text-[11px] text-muted text-center mt-2">
              Click once you have arrived at the NGO center and handed over the food packages.
            </p>
          </div>
        )}
      </div>

      {/* Step 3: Awaiting Confirmation */}
      {isDelivered && !isCompleted && (
        <AlertBanner
          tone="warning"
          title="Awaiting NGO receipt confirmation"
        >
          You have successfully delivered the food! The NGO has been notified to verify receipt in their dashboard. Once verified, this mission will be marked complete.
        </AlertBanner>
      )}

      {/* Completed Success Card */}
      {isCompleted && (
        <div className="card p-6 text-center bg-forest-light border-forest-muted">
          <div className="w-12 h-12 rounded-full bg-forest text-white mx-auto flex items-center justify-center mb-3">
            <Sparkles size={24} />
          </div>
          <h3 className="text-lg font-bold text-ink">Mission completed!</h3>
          <p className="text-xs text-muted mt-1 mb-5">
            Thank you for redistributing surplus food and supporting the community. Your delivery records have been saved.
          </p>
          <Link to="/volunteer/dashboard" className="btn-primary">
            Browse more missions →
          </Link>
        </div>
      )}
    </AppLayout>
  );
};

export default ActiveDelivery;
