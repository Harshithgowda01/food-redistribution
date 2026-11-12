import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo.png';
import toast from 'react-hot-toast';
import { Handshake, MapPinned, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === 'donor') navigate('/donor/dashboard');
      else if (user.role === 'ngo') navigate('/ngo/dashboard');
      else if (user.role === 'volunteer') navigate('/volunteer/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-12">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" />
          <span className="text-lg font-semibold">FoodShare</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight leading-snug">
            Rescue surplus food and get it to people who need it.
          </h1>
          <p className="text-slate-300 mt-4 max-w-md text-sm leading-relaxed">
            A coordination platform for restaurants, NGOs, volunteers, and operators — built for trust, timing, and reliable handoffs.
          </p>
          <ul className="mt-10 space-y-4 text-sm">
            {[
              { icon: Handshake, text: 'Match surplus donations with nearby NGO partners' },
              { icon: MapPinned, text: 'Coordinate pickup, delivery, and live mission status' },
              { icon: ShieldCheck, text: 'A professional workflow NGOs and businesses can trust' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-slate-200">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">Food rescue · Community impact · Real-time logistics</p>
      </div>

      <div className="flex flex-col justify-center py-12 px-4 sm:px-8">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={logoImg} alt="FoodShare" className="w-10 h-10 rounded-lg object-contain bg-forest-light p-1" />
            <span className="text-lg font-semibold text-ink">FoodShare</span>
          </div>

          <h2 className="text-2xl font-semibold text-ink tracking-tight">Sign in</h2>
          <p className="text-sm text-muted mt-1 mb-8">Use your account credentials to continue.</p>

          <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-4">
            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-body text-center mt-6">
            New to FoodShare?{' '}
            <Link to="/register" className="text-forest font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
