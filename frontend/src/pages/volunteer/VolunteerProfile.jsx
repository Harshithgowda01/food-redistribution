import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import LocationPicker from '../../components/LocationPicker';
import PageHeader from '../../components/ui/PageHeader';
import { getVolunteerProfile, updateVolunteerProfile } from '../../api/volunteer.api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const VEHICLE_OPTIONS = [
  { value: 'bicycle', label: '🚲 Bicycle' },
  { value: 'motorcycle', label: '🛵 Scooter / Bike' },
  { value: 'car', label: '🚗 Car' },
  { value: 'van', label: '🚐 Van / Mini-truck' },
  { value: 'walking', label: '🚶 Foot / Walking' },
  { value: 'other', label: '📦 Other' }
];

const VolunteerProfile = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    vehicleType: 'motorcycle',
    isAvailable: true
  });
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const res = await getVolunteerProfile();
        if (!isMounted) return;
        const volunteer = res.data.volunteer;
        setFormData({
          address: volunteer.address || '',
          phone: volunteer.user?.phone || '',
          vehicleType: volunteer.vehicleType || 'motorcycle',
          isAvailable: volunteer.isAvailable !== undefined ? volunteer.isAvailable : true
        });

        if (volunteer.location?.coordinates && volunteer.location.coordinates[0] !== 0) {
          setLocation({
            lat: volunteer.location.coordinates[1],
            lng: volunteer.location.coordinates[0]
          });
        }
      } catch {
        if (isMounted) {
          toast.error('Failed to load volunteer profile');
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!location) {
      toast.error('Please select your location on the map so we can assign nearby deliveries');
      return;
    }

    setLoading(true);
    try {
      await updateVolunteerProfile({
        ...formData,
        latitude: location.lat,
        longitude: location.lng
      });
      setUser((prev) => ({ ...prev, profileCompleted: true }));
      toast.success('Volunteer profile updated successfully!');
      navigate('/volunteer/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <AppLayout maxWidth="max-w-2xl">
        <p className="text-center text-muted py-16 text-sm">Loading volunteer profile…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="max-w-2xl">
      <PageHeader
        title="Volunteer profile"
        description="Configure your vehicle mode and operating base location for delivery dispatches."
      />

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Personal contact</h2>
          <div>
            <label className="field-label">Contact phone number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Home / base address</label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, locality, area, city"
              className="field-input"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Vehicle and availability</h2>
          <div>
            <label className="field-label">Transport vehicle mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {VEHICLE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setFormData({ ...formData, vehicleType: opt.value })}
                  className={`p-3 rounded-control border text-xs font-semibold text-left transition ${
                    formData.vehicleType === opt.value
                      ? 'border-forest bg-forest-light text-forest-dark ring-2 ring-forest/20'
                      : 'border-line bg-white text-body hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3.5 bg-canvas rounded-control border border-line">
            <input
              type="checkbox"
              id="isAvailable"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
              className="w-4 h-4 text-forest rounded focus:ring-forest cursor-pointer"
            />
            <label htmlFor="isAvailable" className="text-sm font-medium text-ink cursor-pointer">
              Currently available and ready to accept delivery dispatches
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Operating location</h2>
          <div>
            <label className="field-label">Pin base location on map</label>
            <div className="rounded-control overflow-hidden border border-line">
              <LocationPicker onLocationSelect={setLocation} initialPosition={location} />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Saving profile…' : 'Save volunteer profile'}
        </button>
      </form>
    </AppLayout>
  );
};

export default VolunteerProfile;
