import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, ChevronRight } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { getMyDonations } from '../../api/donation.api';
import toast from 'react-hot-toast';

const MyDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    async function loadDonations() {
      try {
        const res = await getMyDonations();
        if (isMounted) setDonations(res.data.donations || []);
      } catch {
        toast.error('Failed to load donations');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDonations();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDonations = donations.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['COMPLETED', 'CANCELLED', 'EXPIRED', 'UNMATCHED'].includes(d.status);
    if (filter === 'completed') return d.status === 'COMPLETED';
    if (filter === 'cancelled') return ['CANCELLED', 'EXPIRED', 'UNMATCHED'].includes(d.status);
    return true;
  });

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <AppLayout maxWidth="max-w-4xl">
      <PageHeader
        title="My food donations"
        description="Track real-time delivery status of your donations"
        actions={
          <Link to="/donor/donate" className="btn-primary">
            <Plus size={16} /> Post donation
          </Link>
        }
      />

      <div className="flex gap-1 mb-6 p-1 bg-white border border-line rounded-control w-fit flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === f.id ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : filteredDonations.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No donations found"
          description="There are no food donations matching this status filter."
        />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {filteredDonations.map((donation) => (
            <Link
              key={donation._id}
              to={`/donor/donation/${donation._id}`}
              className="flex justify-between items-center p-4 sm:p-5 hover:bg-slate-50 transition gap-3"
            >
              <div>
                <p className="font-semibold text-ink text-sm">{donation.foodName}</p>
                <p className="text-xs text-muted mt-0.5">
                  {donation.quantity} {donation.quantityUnit} · {donation.foodType?.replace(/_/g, ' ')} · Posted {new Date(donation.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={donation.status} />
                <ChevronRight size={16} className="text-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default MyDonations;
