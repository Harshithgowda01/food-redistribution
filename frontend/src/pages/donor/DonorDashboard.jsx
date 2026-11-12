import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Activity, CheckCircle2, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import AlertBanner from '../../components/ui/AlertBanner';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { getMyDonations } from '../../api/donation.api';
import toast from 'react-hot-toast';

const DonorDashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const res = await getMyDonations();
        if (isMounted) setDonations(res.data.donations || []);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = {
    total: donations.length,
    active: donations.filter(d => !['COMPLETED', 'CANCELLED', 'EXPIRED', 'UNMATCHED'].includes(d.status)).length,
    completed: donations.filter(d => d.status === 'COMPLETED').length,
    mealsRescued: donations.filter(d => d.status === 'COMPLETED').reduce((sum, d) => sum + (d.quantity || 0), 0)
  };

  return (
    <AppLayout>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="Track and manage your surplus food donations"
        actions={
          <Link to="/donor/donate" className="btn-primary">
            <Plus size={16} /> Post donation
          </Link>
        }
      />

      {!user?.profileCompleted && (
        <AlertBanner
          tone="warning"
          title="Complete your profile"
          actionLabel="Complete profile"
          actionTo="/donor/profile"
        >
          Add your organization details and map pin so matching can find nearby NGOs.
        </AlertBanner>
      )}

      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Package} label="Total donations" value={stats.total} hint="All posted listings" accent="text-ink" />
            <StatCard icon={Activity} label="Active missions" value={stats.active} hint="Matching and in transit" accent="text-sky-700" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} hint="Delivered to NGOs" />
            <StatCard icon={UtensilsCrossed} label="Meals rescued" value={stats.mealsRescued} hint="From completed donations" accent="text-indigo-700" />
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-ink">Recent activity</h2>
            {donations.length > 0 && (
              <Link to="/donor/donations" className="text-sm font-semibold text-forest hover:underline">
                View all ({donations.length})
              </Link>
            )}
          </div>

          {donations.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No donations posted yet"
              description="Post surplus food to begin automatic matching with nearby charities."
              actionLabel="Post food donation"
              actionTo="/donor/donate"
            />
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {donations.slice(0, 5).map((donation) => (
                <Link
                  key={donation._id}
                  to={`/donor/donation/${donation._id}`}
                  className="flex justify-between items-center p-4 hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="font-semibold text-ink text-sm">{donation.foodName}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {donation.quantity} {donation.quantityUnit} · Posted {new Date(donation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={donation.status} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default DonorDashboard;
