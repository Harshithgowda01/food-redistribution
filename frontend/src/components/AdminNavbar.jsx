import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminNavbar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navTabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'analytics', label: '📈 Analytics & AI Forecast' },
    { id: 'users', label: '👥 User Management' },
    { id: 'donations', label: '🍲 Donations & Deliveries' },
    { id: 'map', label: '🗺️ Map Distribution' }
  ];

  return (
    <nav className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-lg font-bold text-emerald-400 leading-tight">FoodShare Admin</h1>
            <p className="text-xs text-slate-400">Master Control & Monitoring Center</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md">
            {user?.name || 'Admin'}
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

export default AdminNavbar;
