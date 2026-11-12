import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo.png';
import toast from 'react-hot-toast';
import { Store, Building2, Bike } from 'lucide-react';

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
    { id: 'donor', title: 'Food donor', icon: Store, desc: 'Restaurants & individuals' },
    { id: 'ngo', title: 'NGO / charity', icon: Building2, desc: 'Shelters & food banks' },
    { id: 'volunteer', title: 'Volunteer', icon: Bike, desc: 'Pickup & delivery' }
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-12">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" />
          <span className="text-lg font-semibold">FoodShare</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight leading-snug">
            Join the food rescue network.
          </h1>
          <p className="text-slate-300 mt-4 max-w-md text-sm leading-relaxed">
            Create an account as a donor, NGO, or volunteer. Matching, dispatch, and delivery tracking stay in one place.
          </p>
        </div>
        <p className="text-xs text-slate-500">Trusted coordination for surplus food</p>
      </div>

      <div className="flex flex-col justify-center py-12 px-4 sm:px-8">
        <div className="w-full max-w-lg mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={logoImg} alt="FoodShare" className="w-10 h-10 rounded-lg object-contain bg-forest-light p-1" />
            <span className="text-lg font-semibold text-ink">FoodShare</span>
          </div>

          <h2 className="text-2xl font-semibold text-ink tracking-tight">Create your account</h2>
          <p className="text-sm text-muted mt-1 mb-8">Choose how you participate, then add your details.</p>

          <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-4">
            <div>
              <label className="field-label">I am registering as</label>
              <div className="grid grid-cols-3 gap-2.5">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const selected = formData.role === r.id;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setFormData({ ...formData, role: r.id })}
                      className={`p-3 rounded-card border text-left transition ${
                        selected
                          ? 'border-forest bg-forest-light text-forest-dark ring-2 ring-forest/15'
                          : 'border-line bg-white hover:bg-slate-50 text-body'
                      }`}
                    >
                      <Icon size={18} className="mb-2" />
                      <span className="text-xs font-semibold leading-tight block">{r.title}</span>
                      <span className="text-[11px] text-muted mt-0.5 hidden sm:block">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="field-label">Full name / organization</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="field-input"
                placeholder="e.g. Green Valley Kitchen"
              />
            </div>

            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="field-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="field-label">Phone number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="field-input"
                placeholder="9876543210"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="field-input"
                placeholder="At least 6 characters"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-body text-center mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-forest font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
