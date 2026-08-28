import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'donor'
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(formData);
      toast.success(`Account created! Welcome, ${user.name}!`);

      if (user.role === 'donor') navigate('/donor/dashboard');
      else if (user.role === 'ngo') navigate('/ngo/dashboard');
      else if (user.role === 'volunteer') navigate('/volunteer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'donor', title: 'Food Donor', icon: '🍲', desc: 'Restaurants & Individuals' },
    { id: 'ngo', title: 'NGO / Charity', icon: '🏢', desc: 'Shelters & Food Banks' },
    { id: 'volunteer', title: 'Volunteer', icon: '🛵', desc: 'Pickup & Delivery Hero' }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-3xl mb-4">
          <img src="../assests/logo.png" alt="logo" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate tracking-tight">
          Join Food<span className="text-emerald-400">Share</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Connect surplus food with those who need it most
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Create your account</h2>
          <p className="text-xs text-slate-500 mb-6">Select your primary role in the community</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                I am registering as:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {roles.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setFormData({ ...formData, role: r.id })}
                    className={`p-3 rounded-xl border text-left transition flex flex-col items-start ${formData.role === r.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                  >
                    <span className="text-2xl mb-1">{r.icon}</span>
                    <span className="text-xs font-bold leading-tight">{r.title}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Full Name / Organization
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                placeholder="e.g. Green Valley Kitchen"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Phone Number
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
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/20 transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'Complete Registration →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Already registered?{' '}
              <Link to="/login" className="text-emerald-600 font-bold hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;