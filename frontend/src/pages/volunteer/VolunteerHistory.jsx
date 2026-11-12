import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { History, CheckCircle2, MapPin, ArrowRight, Package } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { getVolunteerHistory } from '../../api/volunteer.api';

const VolunteerHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function loadHistory() {
      try {
        const res = await getVolunteerHistory();
        if (isMountedRef.current) {
          setHistory(res.data.history || []);
        }
      } catch {
        console.error('Failed to load delivery history');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <AppLayout maxWidth="max-w-4xl">
      <PageHeader
        title="Delivery history"
        description="Permanent record of all food packages rescued and delivered by you."
        actions={
          <Link to="/volunteer/dashboard" className="btn-secondary">
            Browse missions
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          icon={History}
          title="No completed deliveries yet"
          description="Deliveries you complete will be permanently listed here with full route metrics."
          actionLabel="Browse open delivery missions"
          actionTo="/volunteer/dashboard"
        />
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item._id} className="card p-5 sm:p-6 space-y-3">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold text-ink text-base">
                    {item.donation?.foodName || 'Food Delivery'}
                  </h3>
                  <p className="text-xs text-muted capitalize mt-0.5">
                    {item.donation?.foodType?.replace(/_/g, ' ')} • {item.donation?.quantity} {item.donation?.quantityUnit}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-forest-light text-forest-dark border border-forest-muted rounded-full">
                  <CheckCircle2 size={13} /> Completed & Received
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-body bg-canvas p-3.5 rounded-control">
                <p className="flex items-start gap-1.5">
                  <MapPin size={13} className="text-muted shrink-0 mt-0.5" />
                  <span><span className="font-semibold text-ink">From:</span> {item.pickupAddress}</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <MapPin size={13} className="text-muted shrink-0 mt-0.5" />
                  <span><span className="font-semibold text-ink">To:</span> {item.deliveryAddress}</span>
                </p>
                <p className="text-muted">
                  <span className="font-semibold text-ink">NGO recipient:</span> {item.ngo?.name || 'NGO'}
                </p>
                <p className="text-muted">
                  <span className="font-semibold text-ink">Distance:</span> ~{item.distanceKm || 0} km
                </p>
              </div>

              <div className="text-[11px] text-muted pt-1">
                Delivered on: {item.completedAt ? new Date(item.completedAt).toLocaleString() : new Date(item.updatedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default VolunteerHistory;
