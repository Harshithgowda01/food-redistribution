import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VolunteerNavbar from '../../components/VolunteerNavbar';
import LocationPicker from '../../components/LocationPicker';
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
      <div className="min-h-screen bg-slate-50">
        <VolunteerNavbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center text-slate-400 font-medium text-sm">
          Loading volunteer profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <VolunteerNavbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Volunteer Hero Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            Set your vehicle type and map location so our matching system can dispatch pickup requests near you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Contact Phone Number
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Base / Home Address
            </label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, locality, area, city"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Vehicle Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VEHICLE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setFormData({ ...formData, vehicleType: opt.value })}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                    formData.vehicleType === opt.value
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="isAvailable"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="isAvailable" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Currently Available & Active to Accept Deliveries
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Pin Base Location on Map
            </label>
            <div className="rounded-xl overflow-hidden border border-slate-300">
              <LocationPicker onLocationSelect={setLocation} initialPosition={location} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/20 transition disabled:opacity-50 mt-4"
          >
            {loading ? 'Saving Profile...' : 'Save Volunteer Profile →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VolunteerProfile;
