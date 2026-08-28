import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NGONavbar from '../../components/NGONavbar';
import LocationPicker from '../../components/LocationPicker';
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
      <div className="min-h-screen bg-slate-50">
        <NGONavbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center text-slate-400 font-medium text-sm">
          Loading NGO profile details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NGONavbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">NGO Organization Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure your intake capacity, accepted food categories, and center map pin for automated matching.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Organization Name
            </label>
            <input
              type="text"
              name="organizationName"
              required
              value={formData.organizationName}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="e.g. Hope Food Shelter"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Govt / Trust Registration Number (Optional)
            </label>
            <input
              type="text"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="e.g. REG-2024-8891"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Helpline / Coordinator Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Distribution Center Address
            </label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="Street, Landmark, City"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Intake Capacity (Max Meals/Packages at once)
            </label>
            <input
              type="number"
              name="capacity"
              required
              min="1"
              value={formData.capacity}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Food Categories Accepted
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FOOD_OPTIONS.map((opt) => {
                const isSelected = formData.foodPreferences.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 text-xs font-medium rounded-xl p-3 border cursor-pointer transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePreference(opt.value)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Operating / Intake Hours
            </label>
            <input
              type="text"
              name="availabilitySchedule"
              value={formData.availabilitySchedule}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="e.g. Mon-Sun 8:00 AM - 10:00 PM"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="isAvailable"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <label htmlFor="isAvailable" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Currently Available & Active to Accept Incoming Donations
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Pin Center Location on Map
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
            {loading ? 'Saving Profile...' : 'Save NGO Profile →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NGOProfile;