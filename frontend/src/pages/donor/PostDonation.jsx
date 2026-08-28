import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorNavbar from '../../components/DonorNavbar';
import LocationPicker from '../../components/LocationPicker';
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
    <div className="min-h-screen bg-slate-50">
      <DonorNavbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Post Surplus Food</h1>
          <p className="text-xs text-slate-500 mt-1">
            Provide details so our AI system can immediately match and notify the closest NGOs with capacity.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Food Category
            </label>
            <select
              name="foodType"
              value={formData.foodType}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            >
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Food Title / Item Name
            </label>
            <input
              type="text"
              name="foodName"
              required
              value={formData.foodName}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="e.g. Vegetarian Buffet Surplus, Fresh Bread & Rolls"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                required
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                placeholder="50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Unit
              </label>
              <select
                name="quantityUnit"
                value={formData.quantityUnit}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              >
                <option value="meals">Meals</option>
                <option value="kg">Kg</option>
                <option value="litres">Litres</option>
                <option value="pieces">Pieces</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="e.g. Packed in clean steel containers, vegetarian, includes rice and lentils"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Food Expiry Timestamp
            </label>
            <input
              type="datetime-local"
              name="expiryTime"
              required
              min={minDateTime}
              value={formData.expiryTime}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Pickup Address
            </label>
            <input
              type="text"
              name="pickupAddress"
              required
              value={formData.pickupAddress}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="e.g. 123 MG Road, Brigade Junction, Bengaluru"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Pin Exact Pickup Spot on Map
            </label>
            <div className="rounded-xl overflow-hidden border border-slate-300">
              <LocationPicker onLocationSelect={setLocation} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/20 transition disabled:opacity-50 mt-4"
          >
            {loading ? 'Submitting & Matching...' : 'Post Donation & Launch Matching →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostDonation;