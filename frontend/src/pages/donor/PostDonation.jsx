import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import LocationPicker from '../../components/LocationPicker';
import PageHeader from '../../components/ui/PageHeader';
import { createDonation } from '../../api/donation.api';
import toast from 'react-hot-toast';

const PostDonation = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    foodType: 'cooked_meals',
    foodName: '',
    quantity: '',
    quantityUnit: 'meals',
    description: '',
    expiryTime: '',
    pickupAddress: ''
  });
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!location) {
      toast.error('Please pin the pickup location on the map');
      return;
    }

    setLoading(true);
    try {
      await createDonation({
        ...formData,
        latitude: location.lat,
        longitude: location.lng
      });
      toast.success('Donation posted successfully! Matching with nearby NGOs...');
      navigate('/donor/donations');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post donation');
    } finally {
      setLoading(false);
    }
  };

  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <AppLayout maxWidth="max-w-2xl">
      <PageHeader
        title="Post surplus food"
        description="Share details so nearby NGOs can be matched and notified."
      />

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Food details</h2>
          <div>
            <label className="field-label">Food category</label>
            <select name="foodType" value={formData.foodType} onChange={handleChange} className="field-input">
              <option value="cooked_meals">Cooked Meals</option>
              <option value="raw_vegetables">Raw Vegetables</option>
              <option value="fruits">Fruits</option>
              <option value="bakery">Bakery Items</option>
              <option value="dairy">Dairy Products</option>
              <option value="packaged">Packaged Food</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="field-label">Food title / item name</label>
            <input
              type="text"
              name="foodName"
              required
              value={formData.foodName}
              onChange={handleChange}
              className="field-input"
              placeholder="e.g. Vegetarian Buffet Surplus, Fresh Bread & Rolls"
            />
          </div>

          <div>
            <label className="field-label">Description (optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="field-input"
              placeholder="e.g. Packed in clean steel containers, vegetarian, includes rice and lentils"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Quantity and timing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Quantity</label>
              <input
                type="number"
                name="quantity"
                required
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                className="field-input"
                placeholder="50"
              />
            </div>
            <div>
              <label className="field-label">Unit</label>
              <select name="quantityUnit" value={formData.quantityUnit} onChange={handleChange} className="field-input">
                <option value="meals">Meals</option>
                <option value="kg">Kg</option>
                <option value="litres">Litres</option>
                <option value="pieces">Pieces</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Food expiry timestamp</label>
            <input
              type="datetime-local"
              name="expiryTime"
              required
              min={minDateTime}
              value={formData.expiryTime}
              onChange={handleChange}
              className="field-input"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">Pickup location</h2>
          <div>
            <label className="field-label">Pickup address</label>
            <input
              type="text"
              name="pickupAddress"
              required
              value={formData.pickupAddress}
              onChange={handleChange}
              className="field-input"
              placeholder="e.g. 123 MG Road, Brigade Junction, Bengaluru"
            />
          </div>

          <div>
            <label className="field-label">Pin exact pickup spot</label>
            <LocationPicker onLocationSelect={setLocation} />
          </div>
        </section>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Submitting and matching…' : 'Post donation'}
        </button>
      </form>
    </AppLayout>
  );
};

export default PostDonation;
