import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import { getDonationById, cancelDonation } from '../../api/donation.api';
import { confirmDonorPickup } from '../../api/donor.api';
import toast from 'react-hot-toast';

const statusSteps = [
  'POSTED',
  'MATCHING',
  'WAITING_FOR_NGO',
  'NGO_ACCEPTED',
  'VOLUNTEER_ASSIGNED',
  'FOOD_COLLECTED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED'
];

const DonationDetail = () => {
  const { id } = useParams();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const isMountedRef = useRef(true);

  const fetchDonation = async () => {
    try {
      const res = await getDonationById(id);
      if (isMountedRef.current) {
        setDonation(res.data.donation);
      }
    } catch {
      if (isMountedRef.current) {
        toast.error('Failed to load donation details');
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    async function loadInitial() {
      try {
        const res = await getDonationById(id);
        if (isMountedRef.current) {
          setDonation(res.data.donation);
        }
      } catch {
        if (isMountedRef.current) {
          toast.error('Failed to load donation details');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      isMountedRef.current = false;
    };
  }, [id]);

  const handleDonorConfirm = async () => {
    setConfirming(true);
    try {
      await confirmDonorPickup(donation._id);
      toast.success('Food handover confirmed successfully!');
      fetchDonation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm handover');
    } finally {
      if (isMountedRef.current) {
        setConfirming(false);
      }
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setCancelling(true);
    try {
      await cancelDonation(donation._id, cancelReason);
      toast.success('Donation cancelled successfully');
      setShowCancelModal(false);
      fetchDonation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel donation');
    } finally {
      if (isMountedRef.current) {
        setCancelling(false);
      }
    }
  };

  if (loading) {
    return (
      <AppLayout maxWidth="max-w-3xl">
        <p className="text-center text-muted mt-10 text-sm">Loading donation…</p>
      </AppLayout>
    );
  }

  if (!donation) {
    return (
      <AppLayout maxWidth="max-w-3xl">
        <p className="text-center text-muted mt-10 text-sm">Donation not found</p>
      </AppLayout>
    );
  }

  const isTerminal = ['CANCELLED', 'EXPIRED', 'UNMATCHED'].includes(donation.status);
  const currentStepIndex = statusSteps.indexOf(donation.status);
  const canConfirmHandover =
    !donation.donorConfirmedCollection &&
    ['VOLUNTEER_ASSIGNED', 'NGO_COLLECTING', 'FOOD_COLLECTED', 'OUT_FOR_DELIVERY'].includes(donation.status);

  const canCancel = ['POSTED', 'MATCHING', 'WAITING_FOR_NGO', 'NGO_ACCEPTED', 'NGO_COLLECTING', 'VOLUNTEER_REQUESTED', 'VOLUNTEER_ASSIGNED'].includes(donation.status);

  return (
    <AppLayout maxWidth="max-w-3xl">
      <div className="flex justify-between items-center mb-4">
        <Link to="/donor/donations" className="btn-ghost text-sm">
          <ArrowLeft size={16} /> Back to donations
        </Link>
        {canCancel && (
          <button
            onClick={() => {
              setCancelReason('');
              setShowCancelModal(true);
            }}
            className="text-xs font-semibold text-rose-700 hover:text-rose-800 border border-rose-200 px-3 py-1.5 rounded-control hover:bg-rose-50"
          >
            Cancel donation
          </button>
        )}
      </div>

      <div className="card p-6">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{donation.foodName}</h1>
            <p className="text-muted text-sm mt-1">
              Posted on {new Date(donation.createdAt).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={donation.status} />
        </div>

        {!isTerminal && (
          <div className="flex items-center mb-6 overflow-x-auto pb-2">
            {statusSteps.map((step, idx) => (
              <div key={step} className="flex items-center flex-shrink-0" title={step.replace(/_/g, ' ')}>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    idx <= currentStepIndex ? 'bg-forest' : 'bg-slate-300'
                  }`}
                />
                {idx < statusSteps.length - 1 && (
                  <div className={`w-8 h-0.5 ${idx < currentStepIndex ? 'bg-forest' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {donation.status === 'EXPIRED' && (
          <AlertBanner tone="danger" title="Food donation expired">
            This food reached its expiry timestamp before pickup was completed and has been closed.
          </AlertBanner>
        )}

        {donation.status === 'CANCELLED' && (
          <AlertBanner tone="danger" title="Donation cancelled">
            {donation.cancellationReason && <>Reason: {donation.cancellationReason}</>}
          </AlertBanner>
        )}

        {canConfirmHandover && (
          <AlertBanner
            tone="success"
            title="Have you handed over the food?"
            action={
              <button onClick={handleDonorConfirm} disabled={confirming} className="btn-primary text-xs py-2">
                <CheckCircle2 size={14} />
                {confirming ? 'Confirming…' : 'Confirm food handover'}
              </button>
            }
          >
            Confirm once the NGO or volunteer has picked up the packages from your location.
          </AlertBanner>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted">Food type</p>
            <p className="font-medium text-ink capitalize">{donation.foodType.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-muted">Quantity</p>
            <p className="font-medium text-ink">{donation.quantity} {donation.quantityUnit}</p>
          </div>
          <div>
            <p className="text-muted">Expires at</p>
            <p className="font-medium text-ink">{new Date(donation.expiryTime).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted">Pickup address</p>
            <p className="font-medium text-ink">{donation.pickupAddress}</p>
          </div>
        </div>

        {donation.description && (
          <div className="mb-4">
            <p className="text-muted text-sm">Description</p>
            <p className="text-ink text-sm">{donation.description}</p>
          </div>
        )}

        <hr className="my-4 border-line" />

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Matched NGO</span>
            <span className="font-medium text-ink text-right">
              {donation.matchedNGO ? `${donation.matchedNGO.name} (${donation.matchedNGO.phone || 'No phone'})` : 'Not matched yet'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Assigned volunteer</span>
            <span className="font-medium text-ink text-right">
              {donation.assignedVolunteer ? `${donation.assignedVolunteer.name} (${donation.assignedVolunteer.phone || 'No phone'})` : 'Not assigned'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Collection method</span>
            <span className="font-medium text-ink capitalize">
              {donation.collectionMethod?.replace(/_/g, ' ') || 'Pending'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Donor confirmed handover</span>
            <span className="font-medium text-ink">
              {donation.donorConfirmedCollection ? 'Yes' : 'Pending'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">NGO confirmed receipt</span>
            <span className="font-medium text-ink">
              {donation.ngoConfirmedReceipt ? 'Yes' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel food donation"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <p className="text-sm text-muted">
            Are you sure you want to cancel this donation? Please provide a brief reason.
          </p>
          <div>
            <label className="field-label">Reason for cancellation</label>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Food spoiled, wrong quantity entered, donor unavailable"
              className="field-input"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCancelModal(false)} className="btn-secondary flex-1">
              Keep donation
            </button>
            <button type="submit" disabled={cancelling} className="btn-danger flex-1">
              {cancelling ? 'Cancelling…' : 'Confirm cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
};

export default DonationDetail;
