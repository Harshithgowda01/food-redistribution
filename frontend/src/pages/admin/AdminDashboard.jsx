import { useState, useEffect, useRef } from 'react';
import AdminNavbar from '../../components/AdminNavbar';
import {
  getAdminStats,
  getAdminAnalytics,
  getAdminUsers,
  toggleUserStatus,
  getAdminDonations,
  getAdminDeliveries,
  getAdminMapData,
  getDemandPrediction
} from '../../api/admin.api';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line, CartesianGrid
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [donations, setDonations] = useState([]);
  const [donationFilter, setDonationFilter] = useState('');
  const [deliveries, setDeliveries] = useState([]);
  const [monitoringTab, setMonitoringTab] = useState('donations');
  const [mapPoints, setMapPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function loadInitialData() {
      try {
        const [statsRes, analyticsRes, predRes] = await Promise.all([
          getAdminStats(),
          getAdminAnalytics(),
          getDemandPrediction()
        ]);
        if (isMountedRef.current) {
          setStats(statsRes.data.stats);
          setAnalytics(analyticsRes.data.analytics);
          setPredictions(predRes.data);
        }
      } catch {
        console.error('Failed to load initial admin data');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch users when tab or filters change
  useEffect(() => {
    if (activeTab === 'users') {
      let isCurrent = true;
      async function loadUsers() {
        try {
          const res = await getAdminUsers({ role: userRoleFilter, search: userSearch });
          if (isCurrent) setUsers(res.data.users || []);
        } catch {
          console.error('Failed to load users');
        }
      }
      loadUsers();
      return () => { isCurrent = false; };
    }
  }, [activeTab, userRoleFilter, userSearch]);

  // Fetch donations & deliveries when tab changes
  useEffect(() => {
    if (activeTab === 'donations') {
      let isCurrent = true;
      async function loadDonationsAndDeliveries() {
        try {
          const [donRes, delRes] = await Promise.all([
            getAdminDonations({ status: donationFilter }),
            getAdminDeliveries()
          ]);
          if (isCurrent) {
            setDonations(donRes.data.donations || []);
            setDeliveries(delRes.data.deliveries || []);
          }
        } catch {
          console.error('Failed to load monitoring data');
        }
      }
      loadDonationsAndDeliveries();
      return () => { isCurrent = false; };
    }
  }, [activeTab, donationFilter]);

  // Fetch map data when map tab is activated
  useEffect(() => {
    if (activeTab === 'map') {
      let isCurrent = true;
      async function loadMap() {
        try {
          const res = await getAdminMapData();
          if (isCurrent) setMapPoints(res.data.points || []);
        } catch {
          console.error('Failed to load map points');
        }
      }
      loadMap();
      return () => { isCurrent = false; };
    }
  }, [activeTab]);

  const handleToggleUser = async (id) => {
    try {
      const res = await toggleUserStatus(id);
      toast.success(res.data.message);
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isActive: res.data.user.isActive } : u))
      );
    } catch {
      toast.error('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center text-gray-500 font-medium">
          Loading Admin Control Center...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Platform Overview & Impact</h1>
                <p className="text-sm text-slate-500">Real-time statistics across all donors, NGOs, and volunteers.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                🟢 Live Database Connected
              </span>
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Meals Rescued</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                      {stats?.totalMealsRescued?.toLocaleString() || 0}
                    </p>
                  </div>
                  <span className="text-3xl">🍲</span>
                </div>
                <p className="text-xs text-slate-500 mt-3">From completed & active donations</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered Users</p>
                    <p className="text-3xl font-extrabold text-blue-600 mt-2">
                      {stats?.users?.total || 0}
                    </p>
                  </div>
                  <span className="text-3xl">👥</span>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  {stats?.users?.donors} Donors • {stats?.users?.ngos} NGOs • {stats?.users?.volunteers} Volunteers
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Food Donations</p>
                    <p className="text-3xl font-extrabold text-indigo-600 mt-2">
                      {stats?.donations?.total || 0}
                    </p>
                  </div>
                  <span className="text-3xl">📦</span>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  {stats?.donations?.completed} Completed • {stats?.donations?.active} Active Missions
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Deliveries</p>
                    <p className="text-3xl font-extrabold text-amber-600 mt-2">
                      {stats?.activeDeliveries || 0}
                    </p>
                  </div>
                  <span className="text-3xl">🛵</span>
                </div>
                <p className="text-xs text-slate-500 mt-3">Currently in-transit with volunteers</p>
              </div>
            </div>

            {/* Quick Summary Split Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 text-lg mb-4">User Community Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3.5 bg-emerald-50 rounded-xl">
                    <span className="text-sm font-semibold text-emerald-900">Food Donors</span>
                    <span className="text-base font-bold text-emerald-700">{stats?.users?.donors || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-blue-50 rounded-xl">
                    <span className="text-sm font-semibold text-blue-900">Partner NGOs</span>
                    <span className="text-base font-bold text-blue-700">{stats?.users?.ngos || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-purple-50 rounded-xl">
                    <span className="text-sm font-semibold text-purple-900">Active Volunteers</span>
                    <span className="text-base font-bold text-purple-700">{stats?.users?.volunteers || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 text-lg mb-4">Donation Outcomes</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3.5 bg-emerald-50 rounded-xl">
                    <span className="text-sm font-semibold text-emerald-900">Successfully Completed</span>
                    <span className="text-base font-bold text-emerald-700">{stats?.donations?.completed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-amber-50 rounded-xl">
                    <span className="text-sm font-semibold text-amber-900">Active in Progress</span>
                    <span className="text-base font-bold text-amber-700">{stats?.donations?.active || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-red-50 rounded-xl">
                    <span className="text-sm font-semibold text-red-900">Cancelled / Expired</span>
                    <span className="text-base font-bold text-red-700">
                      {(stats?.donations?.cancelled || 0) + (stats?.donations?.expired || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANALYTICS & AI DEMAND PREDICTION */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Analytics & AI Demand Forecasting</h1>
              <p className="text-sm text-slate-500">Historical donation trends paired with Scikit-Learn Linear Regression predictions.</p>
            </div>

            {/* AI Demand Prediction Hero Card */}
            {predictions && (
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-7 rounded-2xl shadow-lg border border-indigo-800/40">
                <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🤖</span>
                      <h2 className="text-xl font-bold text-emerald-400">
                        AI Demand & Surplus Forecast (Next 7 Days)
                      </h2>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-mono">
                        {predictions.summary?.modelType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Predicts upcoming daily food volume to help partner NGOs prepare intake capacity and volunteer schedules.
                    </p>
                  </div>

                  <div className="flex gap-4 flex-wrap">
                    <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                      <p className="text-xs text-slate-300">Expected Weekly Volume</p>
                      <p className="text-xl font-bold text-white mt-0.5">{predictions.summary?.totalNextWeekMeals} meals</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                      <p className="text-xs text-slate-300">Peak Surplus Day</p>
                      <p className="text-xl font-bold text-amber-300 mt-0.5">{predictions.summary?.peakDay} (~{predictions.summary?.peakQuantity} meals)</p>
                    </div>
                  </div>
                </div>

                {/* Forecast Chart */}
                <div className="h-64 w-full my-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={predictions.forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="displayDate" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="predictedQuantity"
                        name="Predicted Meals"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#10B981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* AI Recommendations */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl mt-4">
                  <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
                    💡 AI Strategic Recommendations:
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {predictions.recommendations?.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Historical Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Trend */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 text-base mb-1">Recent Daily Redistribution Trend</h3>
                <p className="text-xs text-slate-400 mb-4">Quantity of meals donated per day</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.dailyTrend || []}>
                      <defs>
                        <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="meals" stroke="#10B981" fillOpacity={1} fill="url(#colorMeals)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Food Type Breakdown */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 text-base mb-1">Food Category Distribution</h3>
                <p className="text-xs text-slate-400 mb-4">Breakdown by food type</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.foodTypeStats || []}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {analytics?.foodTypeStats?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donation Status Breakdown */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                <h3 className="font-bold text-slate-800 text-base mb-1">Donation Lifecycle Status Counts</h3>
                <p className="text-xs text-slate-400 mb-4">Total records grouped by current status</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.statusStats || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="status" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                <p className="text-sm text-slate-500">Monitor and manage accounts for Donors, NGOs, and Volunteers.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <div className="flex rounded-xl overflow-hidden border border-slate-300">
                  {['', 'donor', 'ngo', 'volunteer', 'admin'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-3 py-1.5 text-xs font-semibold capitalize ${
                        userRoleFilter === role ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {role || 'All'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Profile Status</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{u.name}</p>
                          <p className="text-slate-400">{u.email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                            u.role === 'donor'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.role === 'ngo'
                              ? 'bg-blue-100 text-blue-800'
                              : u.role === 'volunteer'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">{u.phone || 'No phone'}</td>
                        <td className="p-4">
                          {u.profileCompleted ? (
                            <span className="text-emerald-700 font-medium">✓ Completed</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Pending Setup</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleUser(u._id)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                              u.isActive
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DONATIONS & DELIVERIES MONITORING */}
        {activeTab === 'donations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Donation & Delivery Audit Log</h1>
                <p className="text-sm text-slate-500">Track all ongoing and past redistribution workflows in real time.</p>
              </div>

              {/* Sub tab toggle */}
              <div className="flex items-center gap-3">
                <div className="flex rounded-xl overflow-hidden border border-slate-300">
                  <button
                    onClick={() => setMonitoringTab('donations')}
                    className={`px-4 py-2 text-xs font-semibold ${
                      monitoringTab === 'donations' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Donations ({donations.length})
                  </button>
                  <button
                    onClick={() => setMonitoringTab('deliveries')}
                    className={`px-4 py-2 text-xs font-semibold ${
                      monitoringTab === 'deliveries' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Deliveries ({deliveries.length})
                  </button>
                </div>

                {monitoringTab === 'donations' && (
                  <select
                    value={donationFilter}
                    onChange={(e) => setDonationFilter(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="POSTED">POSTED</option>
                    <option value="WAITING_FOR_NGO">WAITING_FOR_NGO</option>
                    <option value="NGO_ACCEPTED">NGO_ACCEPTED</option>
                    <option value="VOLUNTEER_REQUESTED">VOLUNTEER_REQUESTED</option>
                    <option value="VOLUNTEER_ASSIGNED">VOLUNTEER_ASSIGNED</option>
                    <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                )}
              </div>
            </div>

            {monitoringTab === 'donations' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Food Item</th>
                        <th className="p-4">Quantity</th>
                        <th className="p-4">Donor</th>
                        <th className="p-4">Matched NGO</th>
                        <th className="p-4">Volunteer</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {donations.map((d) => (
                        <tr key={d._id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4">
                            <p className="font-bold text-slate-800">{d.foodName}</p>
                            <p className="text-slate-400 capitalize">{d.foodType?.replace(/_/g, ' ')}</p>
                          </td>
                          <td className="p-4 font-semibold text-slate-700">{d.quantity} {d.quantityUnit}</td>
                          <td className="p-4">{d.donor?.name || 'Unknown'}</td>
                          <td className="p-4">{d.matchedNGO?.name || '—'}</td>
                          <td className="p-4">{d.assignedVolunteer?.name || '—'}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-800">
                              {d.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Food Item</th>
                        <th className="p-4">Volunteer</th>
                        <th className="p-4">Destination NGO</th>
                        <th className="p-4">Distance / ETA</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Assigned At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deliveries.map((del) => (
                        <tr key={del._id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4 font-bold text-slate-800">{del.donation?.foodName || 'Delivery'}</td>
                          <td className="p-4 font-medium text-slate-700">{del.volunteer?.name || 'Volunteer'}</td>
                          <td className="p-4 text-slate-600">{del.ngo?.name || 'NGO'}</td>
                          <td className="p-4 text-slate-600">~{del.distanceKm || 0} km • ~{del.estimatedDeliveryMinutes || 15} mins</td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800">
                              {del.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">{new Date(del.assignedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MAP DISTRIBUTION */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Geographic Redistribution Map</h1>
              <p className="text-sm text-slate-500">Live distribution of pickup spots, partner NGOs, and active volunteers.</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex gap-6 mb-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  Donation Pickup Points
                </span>
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                  NGO Destination Centers
                </span>
                <span className="flex items-center gap-1.5 text-purple-700">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>
                  Volunteer Locations
                </span>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: '550px' }}>
                <MapContainer
                  center={[12.9716, 77.5946]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  {mapPoints.map((pt, i) => (
                    <Marker key={`${pt.id}-${i}`} position={[pt.lat, pt.lng]}>
                      <Popup>
                        <div className="p-1">
                          <p className="font-bold text-sm text-slate-900">{pt.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{pt.subtitle}</p>
                          {pt.address && <p className="text-xs text-slate-400 mt-1">{pt.address}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;