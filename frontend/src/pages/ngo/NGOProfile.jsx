import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import LocationPicker from '../../components/LocationPicker';
import PageHeader from '../../components/ui/PageHeader';
import { getNGOProfile, updateNGOProfile } from '../../api/ngo.api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const FOOD_OPTIONS = [
  { value: 'any', label: 'Any Food Type' },
  { value: 'cooked_meals', label: 'Cooked Meals' },
  { value: 'raw_vegetables', label: 'Raw Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'bakery', label: 'Bakery Items' },
  { value: 'dairy', label: 'Dairy Products' },
  { value: 'packaged', label: 'Packaged Food' },
];

const NGOProfile = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    organizationName: '',
    registrationNumber: '',
    address: '',
    capacity: 100,
    foodPreferences: ['any'],
    isAvailable: true,
    availabilitySchedule: 'Always available',
    description: '',
    phone: ''
  });
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const res = await getNGOProfile();
        if (!isMounted) return;
        const ngo = res.data.ngo;
        setFormData({
          organizationName: ngo.organizationName || '',
          registrationNumber: ngo.registrationNumber || '',
          address: ngo.address || '',
          capacity: ngo.capacity || 100,
          foodPreferences: ngo.foodPreferences?.length ? ngo.foodPreferences : ['any'],
          isAvailable: ngo.isAvailable,
          availabilitySchedule: ngo.availabilitySchedule || 'Always available',
          description: ngo.description || '',
          phone: ngo.user?.phone || ''
        });
        if (ngo.location?.coordinates && ngo.location.coordinates[0] !== 0) {
          setLocation({ lat: ngo.location.coordinates[1], lng: ngo.location.coordinates[0] });
        }
      } catch {
        if (isMounted) toast.error('Failed to load NGO profile');
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const togglePreference = (value) => {
    setFormData((prev) => {
      let updated;
      if (value === 'any') {
        updated = prev.foodPreferences.includes('any') ? [] : ['any'];
      } else {
        let current = prev.foodPreferences.filter(p => p !== 'any');
        if (current.includes(value)) {
          updated = current.filter(p => p !== value);
        } else {
          updated = [...current, value];
        }
      }
      return { ...prev, foodPreferences: updated.length ? updated : ['any'] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      toast.error('Please select your registered location on the map');
      return;
    }
    setLoading(true);
    try {
      await updateNGOProfile({
        ...formData,
        capacity: parseInt(formData.capacity),
        latitude: location.lat,
        longitude: location.lng
      });
      setUser((prev) => ({ ...prev, profileCompleted: true }));
      toast.success('NGO Profile updated successfully!');
      navigate('/ngo/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <AppLayout maxWidth="max-w-2xl">
        <p className="text-center text-muted py-16 text-sm">Loading NGO profile…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="max-w-2xl">
      <PageHeader
        title="NGO organization profile"
        description="Configure intake capacity, food categories, and your center map pin."
      />

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Organization</h2>
          <div>
            <label className="field-label">Organization name</label>
            <input
              type="text"
              name="organizationName"
              required
              value={formData.organizationName}
              onChange={handleChange}
              className="field-input"
              placeholder="e.g. Hope Food Shelter"
            />
          </div>

          <div>
            <label className="field-label">Govt / trust registration number (optional)</label>
            <input
              type="text"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              className="field-input"
              placeholder="e.g. REG-2024-8891"
            />
          </div>

          <div>
            <label className="field-label">Helpline / coordinator phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="field-input"
              placeholder="9876543210"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Capacity and intake</h2>
          <div>
            <label className="field-label">Distribution center address</label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="field-input"
              placeholder="Street, Landmark, City"
            />
          </div>

          <div>
            <label className="field-label">Intake capacity (max meals/packages at once)</label>
            <input
              type="number"
              name="capacity"
              required
              min="1"
              value={formData.capacity}
              onChange={handleChange}
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Food categories accepted</label>
            <div className="grid grid-cols-2 gap-2">
              {FOOD_OPTIONS.map((opt) => {
                const isSelected = formData.foodPreferences.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 text-xs font-medium rounded-control p-3 border cursor-pointer transition ${
                      isSelected
                        ? 'border-forest bg-forest-light text-forest-dark font-semibold'
                        : 'border-line bg-white text-body hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePreference(opt.value)}
                      className="rounded text-forest focus:ring-forest"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="field-label">Operating / intake hours</label>
            <input
              type="text"
              name="availabilitySchedule"
              value={formData.availabilitySchedule}
              onChange={handleChange}
              className="field-input"
              placeholder="e.g. Mon-Sun 8:00 AM - 10:00 PM"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-control border border-line">
            <input
              type="checkbox"
              id="isAvailable"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
              className="rounded text-forest focus:ring-forest h-4 w-4"
            />
            <label htmlFor="isAvailable" className="text-sm font-medium text-ink cursor-pointer">
              Currently available to accept incoming donations
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Location</h2>
          <div>
            <label className="field-label">Pin center location</label>
            <LocationPicker onLocationSelect={setLocation} initialPosition={location} />
          </div>
        </section>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving profile…' : 'Save NGO profile'}
        </button>
      </form>
    </AppLayout>
  );
};

export default NGOProfile;
