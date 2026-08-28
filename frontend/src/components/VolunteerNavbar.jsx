import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const VolunteerNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/volunteer/dashboard', label: '📊 Dashboard' },
    { to: '/volunteer/active', label: '🛵 Live Mission' },
    { to: '/volunteer/history', label: '📜 Delivery History' },
    { to: '/volunteer/notifications', label: '🔔 Notifications' },
    { to: '/volunteer/profile', label: '👤 Profile' }
  ];

  return (
    <nav className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center flex-wrap gap-4">
        <Link to="/volunteer/dashboard" className="flex items-center gap-3 group">
          <span className="text-2xl group-hover:scale-110 transition">🍲</span>
          <div>
            <h1 className="text-lg font-bold text-emerald-400 leading-tight">FoodShare</h1>
            <p className="text-xs text-slate-400">Volunteer Portal</p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 flex-wrap">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-md border border-slate-700 font-medium">
            {user?.name || 'Volunteer'}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default VolunteerNavbar;
