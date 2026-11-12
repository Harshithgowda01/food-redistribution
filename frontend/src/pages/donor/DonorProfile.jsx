import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import LocationPicker from '../../components/LocationPicker';
import PageHeader from '../../components/ui/PageHeader';
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
      <AppLayout maxWidth="max-w-2xl">
        <p className="text-center text-muted py-16 text-sm">Loading profile…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="max-w-2xl">
      <PageHeader
        title="Donor profile"
        description="Your address and map pin help match the nearest NGOs and volunteers."
      />

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Organization</h2>
          <div>
            <label className="field-label">Donor classification</label>
            <select name="donorType" value={formData.donorType} onChange={handleChange} className="field-input">
              <option value="individual">Individual Donor</option>
              <option value="restaurant">Restaurant / Eatery</option>
              <option value="hotel">Hotel / Hospitality</option>
              <option value="event_organizer">Event / Wedding Organizer</option>
              <option value="other">Other Food Enterprise</option>
            </select>
          </div>

          <div>
            <label className="field-label">Organization / establishment name</label>
            <input
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              className="field-input"
              placeholder="e.g. Green Leaf Kitchen"
            />
          </div>

          <div>
            <label className="field-label">Contact phone number</label>
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
          <h2 className="text-sm font-semibold text-ink">Location</h2>
          <div>
            <label className="field-label">Registered address</label>
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
            <label className="field-label">Default location pin</label>
            <LocationPicker onLocationSelect={setLocation} initialPosition={location} />
          </div>
        </section>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving profile…' : 'Save donor profile'}
        </button>
      </form>
    </AppLayout>
  );
};

export default DonorProfile;
