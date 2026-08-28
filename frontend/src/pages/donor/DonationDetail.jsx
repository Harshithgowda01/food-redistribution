import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import DonorNavbar from '../../components/DonorNavbar';
import { getDonationById, cancelDonation } from '../../api/donation.api';
import { confirmDonorPickup } from '../../api/donor.api';
import toast from 'react-hot-toast';

const statusColors = {
  POSTED: 'bg-gray-100 text-gray-700',
  MATCHING: 'bg-blue-100 text-blue-700',
  WAITING_FOR_NGO: 'bg-yellow-100 text-yellow-700',
  NGO_ACCEPTED: 'bg-indigo-100 text-indigo-700',
  NGO_COLLECTING: 'bg-indigo-100 text-indigo-700',
  VOLUNTEER_REQUESTED: 'bg-purple-100 text-purple-700',
  VOLUNTEER_ASSIGNED: 'bg-purple-100 text-purple-700',
  FOOD_COLLECTED: 'bg-teal-100 text-teal-700',
  OUT_FOR_DELIVERY: 'bg-teal-100 text-teal-700',
  DELIVERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-red-100 text-red-700',
  UNMATCHED: 'bg-red-100 text-red-700',
};

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
      <div className="min-h-screen bg-gray-50">
        <DonorNavbar />
        <p className="text-center text-gray-500 mt-10">Loading...</p>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DonorNavbar />
        <p className="text-center text-gray-500 mt-10">Donation not found</p>
      </div>
    );
  }

  const isTerminal = ['CANCELLED', 'EXPIRED', 'UNMATCHED'].includes(donation.status);
  const currentStepIndex = statusSteps.indexOf(donation.status);
  const canConfirmHandover =
    !donation.donorConfirmedCollection &&
    ['VOLUNTEER_ASSIGNED', 'NGO_COLLECTING', 'FOOD_COLLECTED', 'OUT_FOR_DELIVERY'].includes(donation.status);

  const canCancel = ['POSTED', 'MATCHING', 'WAITING_FOR_NGO', 'NGO_ACCEPTED', 'NGO_COLLECTING', 'VOLUNTEER_REQUESTED', 'VOLUNTEER_ASSIGNED'].includes(donation.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <DonorNavbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-4">
          <Link to="/donor/donations" className="text-sm text-gray-500 hover:underline">
            ← Back to My Donations
          </Link>
          {canCancel && (
            <button
              onClick={() => {
                setCancelReason('');
                setShowCancelModal(true);
              }}
              className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Cancel Donation
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{donation.foodName}</h1>
              <p className="text-gray-500 text-sm">
                Posted on {new Date(donation.createdAt).toLocaleString()}
              </p>
            </div>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${statusColors[donation.status] || 'bg-gray-100'}`}>
              {donation.status.replace(/_/g, ' ')}
            </span>
          </div>

          {!isTerminal && (
            <div className="flex items-center mb-6 overflow-x-auto pb-2">
              {statusSteps.map((step, idx) => (
                <div key={step} className="flex items-center flex-shrink-0">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      idx <= currentStepIndex ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  />
                  {idx < statusSteps.length - 1 && (
                    <div className={`w-8 h-0.5 ${idx < currentStepIndex ? 'bg-green-600' : 'bg-gray-300'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {donation.status === 'EXPIRED' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              <p className="font-semibold">⚠️ Food Donation Expired</p>
              <p className="text-xs mt-1">This food reached its expiry timestamp before pickup was completed and has been closed.</p>
            </div>
          )}

          {donation.status === 'CANCELLED' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              <p className="font-semibold">❌ Donation Cancelled</p>
              {donation.cancellationReason && (
                <p className="text-xs mt-1">Reason: {donation.cancellationReason}</p>
              )}
            </div>
          )}

          {canConfirmHandover && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-5 flex justify-between items-center flex-wrap gap-3">
              <div>
                <p className="font-semibold text-green-900">Have you handed over the food?</p>
                <p className="text-xs text-green-700">Confirm once the NGO or volunteer has picked up the packages from your location.</p>
              </div>
              <button
                onClick={handleDonorConfirm}
                disabled={confirming}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                {confirming ? 'Confirming...' : '✓ Confirm Food Handover'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500">Food Type</p>
              <p className="font-medium text-gray-800 capitalize">{donation.foodType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500">Quantity</p>
              <p className="font-medium text-gray-800">{donation.quantity} {donation.quantityUnit}</p>
            </div>
            <div>
              <p className="text-gray-500">Expires At</p>
              <p className="font-medium text-gray-800">{new Date(donation.expiryTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Pickup Address</p>
              <p className="font-medium text-gray-800">{donation.pickupAddress}</p>
            </div>
          </div>

          {donation.description && (
            <div className="mb-4">
              <p className="text-gray-500 text-sm">Description</p>
              <p className="text-gray-800 text-sm">{donation.description}</p>
            </div>
          )}

          <hr className="my-4" />

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Matched NGO</span>
              <span className="font-medium text-gray-800">
                {donation.matchedNGO ? `${donation.matchedNGO.name} (${donation.matchedNGO.phone || 'No phone'})` : 'Not matched yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Assigned Volunteer</span>
              <span className="font-medium text-gray-800">
                {donation.assignedVolunteer ? `${donation.assignedVolunteer.name} (${donation.assignedVolunteer.phone || 'No phone'})` : 'Not assigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Collection Method</span>
              <span className="font-medium text-gray-800 capitalize">
                {donation.collectionMethod?.replace(/_/g, ' ') || 'Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Donor Confirmed Handover</span>
              <span className="font-medium text-gray-800">
                {donation.donorConfirmedCollection ? 'Yes ✅' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">NGO Confirmed Receipt</span>
              <span className="font-medium text-gray-800">
                {donation.ngoConfirmedReceipt ? 'Yes ✅' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleCancelSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Cancel Food Donation</h2>
              <p className="text-xs text-gray-500">
                Are you sure you want to cancel this donation? Please provide a brief reason.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Cancellation</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Food spoiled, wrong quantity entered, donor unavailable"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
                >
                  Keep Donation
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationDetail;