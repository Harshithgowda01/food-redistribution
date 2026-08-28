import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorNavbar from '../../components/DonorNavbar';
import LocationPicker from '../../components/LocationPicker';
import { getDonorProfile, updateDonorProfile } from '../../api/donor.api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DonorProfile = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    organizationName: '',
    donorType: 'individual',
    address: '',
    phone: ''
  });
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const res = await getDonorProfile();
        if (!isMounted) return;
        const donor = res.data.donor;
        setFormData({
          organizationName: donor.organizationName || '',
          donorType: donor.donorType || 'individual',
          address: donor.address || '',
          phone: donor.user?.phone || ''
        });
        if (donor.location?.coordinates && donor.location.coordinates[0] !== 0) {
          setLocation({ lat: donor.location.coordinates[1], lng: donor.location.coordinates[0] });
        }
      } catch {
        if (isMounted) toast.error('Failed to load profile');
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!location) {
      toast.error('Please pin your registered location on the map');
      return;
    }

    setLoading(true);
    try {
      await updateDonorProfile({
        ...formData,
        latitude: location.lat,
        longitude: location.lng
      });
      setUser((prev) => ({ ...prev, profileCompleted: true }));
      toast.success('Profile updated successfully!');
      navigate('/donor/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DonorNavbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center text-slate-400 font-medium text-sm">
          Loading profile details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DonorNavbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Donor Profile & Location</h1>
          <p className="text-xs text-slate-500 mt-1">
            Setting your address and default location coordinates helps find the nearest NGOs and volunteers faster.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Donor Classification
            </label>
            <select
              name="donorType"
              value={formData.donorType}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            >
              <option value="individual">Individual Donor</option>
              <option value="restaurant">Restaurant / Eatery</option>
              <option value="hotel">Hotel / Hospitality</option>
              <option value="event_organizer">Event / Wedding Organizer</option>
              <option value="other">Other Food Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Organization / Establishment Name
            </label>
            <input
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="e.g. Green Leaf Kitchen"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Contact Phone Number
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
              Registered Address
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
              Default Location Pin on Map
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
            {loading ? 'Saving Profile...' : 'Save Donor Profile →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DonorProfile;