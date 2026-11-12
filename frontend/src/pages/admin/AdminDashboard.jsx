import { useState, useEffect, useRef } from 'react';
import {
  Package,
  Users as UsersIcon,
  TrendingUp,
  Truck,
  Sparkles,
  Map as MapIcon,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Activity,
  Filter,
  Layers
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
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

const createMapMarkerIcon = (type) => {
  let bg = '#10B981';
  let emoji = '🍲';
  let border = '#059669';

  if (type === 'ngo_location') {
    bg = '#0284C7';
    emoji = '🏢';
    border = '#0369A1';
  } else if (type === 'volunteer_location') {
    bg = '#7C3AED';
    emoji = '🛵';
    border = '#6D28D9';
  }

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div style="
        background-color: ${bg};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 2.5px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
        outline: 2px solid ${border};
      ">
        ${emoji}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [0, 0]
  });
};

const CHART_COLORS = ['#2D6A4F', '#0284C7', '#D97706', '#7C3AED', '#DB2777', '#4F46E5', '#0D9488'];

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
  const [mapFilter, setMapFilter] = useState('all'); // 'all' | 'donation_pickup' | 'ngo_location' | 'volunteer_location'
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

  const donationPointsCount = mapPoints.filter(p => p.type === 'donation_pickup').length;
  const ngoPointsCount = mapPoints.filter(p => p.type === 'ngo_location').length;
  const volunteerPointsCount = mapPoints.filter(p => p.type === 'volunteer_location').length;

  const filteredMapPoints = mapFilter === 'all'
    ? mapPoints
    : mapPoints.filter(p => p.type === mapFilter);

  if (loading) {
    return (
      <AppLayout adminTabs={{ activeTab, setActiveTab }} maxWidth="max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout adminTabs={{ activeTab, setActiveTab }} maxWidth="max-w-7xl">
      <div className="space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PageHeader
              title="Platform Overview & Impact"
              description="Real-time redistribution metrics across all registered donors, partner NGOs, and volunteer teams."
              actions={
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-forest-light text-forest border border-forest/20">
                  <span className="w-2 h-2 rounded-full bg-forest animate-pulse"></span>
                  Live Network Active
                </span>
              }
            />

            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={TrendingUp}
                label="Total Meals Rescued"
                value={stats?.totalMealsRescued?.toLocaleString() || 0}
                hint="From completed food rescues"
                accent="text-forest"
              />
              <StatCard
                icon={UsersIcon}
                label="Registered Community"
                value={stats?.users?.total || 0}
                hint={`${stats?.users?.donors || 0} Donors • ${stats?.users?.ngos || 0} NGOs • ${stats?.users?.volunteers || 0} Volunteers`}
                accent="text-sky-700"
              />
              <StatCard
                icon={Package}
                label="Total Donations Posted"
                value={stats?.donations?.total || 0}
                hint={`${stats?.donations?.completed || 0} Completed • ${stats?.donations?.active || 0} Active`}
                accent="text-indigo-700"
              />
              <StatCard
                icon={Truck}
                label="Active In-Transit"
                value={stats?.activeDeliveries || 0}
                hint="Live volunteer deliveries"
                accent="text-amber-600"
              />
            </div>

            {/* Quick Summary Split Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-6 space-y-4">
                <h3 className="font-semibold text-ink text-base">Community Member Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3.5 bg-forest-light/60 rounded-control border border-forest/10">
                    <span className="text-xs font-medium text-forest-dark flex items-center gap-2">
                      <UsersIcon size={16} /> Food Donors
                    </span>
                    <span className="text-sm font-bold text-forest">{stats?.users?.donors || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-sky-50 rounded-control border border-sky-100">
                    <span className="text-xs font-medium text-sky-900 flex items-center gap-2">
                      <Building2 size={16} /> Partner NGOs
                    </span>
                    <span className="text-sm font-bold text-sky-700">{stats?.users?.ngos || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-purple-50 rounded-control border border-purple-100">
                    <span className="text-xs font-medium text-purple-900 flex items-center gap-2">
                      <Truck size={16} /> Active Volunteers
                    </span>
                    <span className="text-sm font-bold text-purple-700">{stats?.users?.volunteers || 0}</span>
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h3 className="font-semibold text-ink text-base">Redistribution Outcomes</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3.5 bg-forest-light/60 rounded-control border border-forest/10">
                    <span className="text-xs font-medium text-forest-dark flex items-center gap-2">
                      <CheckCircle2 size={16} /> Successfully Completed
                    </span>
                    <span className="text-sm font-bold text-forest">{stats?.donations?.completed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-amber-50 rounded-control border border-amber-100">
                    <span className="text-xs font-medium text-amber-900 flex items-center gap-2">
                      <Activity size={16} /> Active In Progress
                    </span>
                    <span className="text-sm font-bold text-amber-700">{stats?.donations?.active || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-rose-50 rounded-control border border-rose-100">
                    <span className="text-xs font-medium text-rose-900 flex items-center gap-2">
                      <AlertTriangle size={16} /> Cancelled / Expired
                    </span>
                    <span className="text-sm font-bold text-rose-700">
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
          <div className="space-y-6">
            <PageHeader
              title="Analytics & AI Demand Forecasting"
              description="Historical donation trends paired with Scikit-Learn linear regression intelligence."
            />

            {/* AI Demand Prediction Hero Card */}
            {predictions && (
              <div className="card p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border-slate-700 shadow-pop">
                <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-forest/20 text-emerald-400 flex items-center justify-center border border-forest/40">
                        <Sparkles size={18} />
                      </span>
                      <h2 className="text-lg font-bold text-white">
                        AI Demand & Surplus Forecast (Next 7 Days)
                      </h2>
                      <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono border border-emerald-500/30">
                        {predictions.summary?.modelType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 max-w-2xl">
                      Machine learning algorithm analyzing previous redistribution volumes to forecast incoming surplus and help NGOs optimize volunteer schedules.
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <div className="bg-white/10 px-4 py-2 rounded-control backdrop-blur-sm border border-white/10">
                      <p className="text-[11px] text-slate-300">Expected Weekly Volume</p>
                      <p className="text-lg font-bold text-white mt-0.5">{predictions.summary?.totalNextWeekMeals} meals</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-control backdrop-blur-sm border border-white/10">
                      <p className="text-[11px] text-slate-300">Peak Surplus Day</p>
                      <p className="text-lg font-bold text-amber-300 mt-0.5">{predictions.summary?.peakDay} (~{predictions.summary?.peakQuantity} meals)</p>
                    </div>
                  </div>
                </div>

                {/* Forecast Chart */}
                <div className="h-64 w-full my-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={predictions.forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="displayDate" stroke="#94A3B8" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="predictedQuantity"
                        name="Predicted Meals"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* AI Recommendations */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-control mt-4">
                  <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles size={14} /> AI Strategic Recommendations:
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
              <div className="card p-6 space-y-3">
                <div>
                  <h3 className="font-semibold text-ink text-base">Recent Daily Redistribution Trend</h3>
                  <p className="text-xs text-muted">Quantity of meals rescued and distributed per day</p>
                </div>
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.dailyTrend || []}>
                      <defs>
                        <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="meals" stroke="#2D6A4F" strokeWidth={2} fillOpacity={1} fill="url(#colorMeals)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Food Type Breakdown */}
              <div className="card p-6 space-y-3">
                <div>
                  <h3 className="font-semibold text-ink text-base">Food Category Distribution</h3>
                  <p className="text-xs text-muted">Breakdown of surplus food donations by category</p>
                </div>
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.foodTypeStats || []}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={30}
                        paddingAngle={4}
                        label
                      >
                        {analytics?.foodTypeStats?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donation Status Breakdown */}
              <div className="card p-6 space-y-3 lg:col-span-2">
                <div>
                  <h3 className="font-semibold text-ink text-base">Donation Lifecycle Status Breakdown</h3>
                  <p className="text-xs text-muted">Total records grouped by current operational status</p>
                </div>
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.statusStats || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="status" stroke="#94A3B8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2D6A4F" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <PageHeader
                title="User Management"
                description="Manage and monitor accounts for Donors, NGOs, and Volunteers."
              />

              {/* Filters */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search name, email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="field-input pl-8 py-1.5 text-xs w-52"
                  />
                </div>

                <div className="flex rounded-control overflow-hidden border border-line bg-white">
                  {['', 'donor', 'ngo', 'volunteer', 'admin'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        userRoleFilter === role
                          ? 'bg-forest text-white'
                          : 'bg-white text-muted hover:bg-slate-50 hover:text-ink'
                      }`}
                    >
                      {role || 'All'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-body">
                  <thead className="bg-slate-50 text-ink font-semibold border-b border-line uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Profile Status</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted">
                          No users found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/60 transition">
                          <td className="p-4">
                            <p className="font-semibold text-ink">{u.name}</p>
                            <p className="text-muted text-[11px]">{u.email}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              u.role === 'donor'
                                ? 'bg-forest-light text-forest'
                                : u.role === 'ngo'
                                ? 'bg-sky-100 text-sky-800'
                                : u.role === 'volunteer'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-body">{u.phone || '—'}</td>
                          <td className="p-4">
                            {u.profileCompleted ? (
                              <span className="text-forest font-medium flex items-center gap-1">
                                <CheckCircle2 size={13} /> Complete
                              </span>
                            ) : (
                              <span className="text-amber-700 font-medium">Pending Setup</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleUser(u._id)}
                              className={`px-3 py-1 rounded-control text-xs font-semibold transition ${
                                u.isActive
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-forest hover:bg-emerald-100'
                              }`}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DONATIONS & DELIVERIES MONITORING */}
        {activeTab === 'donations' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <PageHeader
                title="Donation & Delivery Audit Log"
                description="Monitor all ongoing and historical food redistribution missions across the city."
              />

              {/* Sub tab toggle */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex rounded-control overflow-hidden border border-line bg-white">
                  <button
                    type="button"
                    onClick={() => setMonitoringTab('donations')}
                    className={`px-3.5 py-1.5 text-xs font-semibold transition ${
                      monitoringTab === 'donations' ? 'bg-forest text-white' : 'bg-white text-muted hover:bg-slate-50'
                    }`}
                  >
                    Donations ({donations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitoringTab('deliveries')}
                    className={`px-3.5 py-1.5 text-xs font-semibold transition ${
                      monitoringTab === 'deliveries' ? 'bg-forest text-white' : 'bg-white text-muted hover:bg-slate-50'
                    }`}
                  >
                    Deliveries ({deliveries.length})
                  </button>
                </div>

                {monitoringTab === 'donations' && (
                  <select
                    value={donationFilter}
                    onChange={(e) => setDonationFilter(e.target.value)}
                    className="field-input py-1.5 text-xs"
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
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-body">
                    <thead className="bg-slate-50 text-ink font-semibold border-b border-line uppercase tracking-wider text-[10px]">
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
                    <tbody className="divide-y divide-line">
                      {donations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted">
                            No donations found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        donations.map((d) => (
                          <tr key={d._id} className="hover:bg-slate-50/60 transition">
                            <td className="p-4">
                              <p className="font-semibold text-ink">{d.foodName}</p>
                              <p className="text-muted text-[11px] capitalize">{d.foodType?.replace(/_/g, ' ')}</p>
                            </td>
                            <td className="p-4 font-medium text-ink">{d.quantity} {d.quantityUnit}</td>
                            <td className="p-4 text-body">{d.donor?.name || 'Unknown'}</td>
                            <td className="p-4 text-body">{d.matchedNGO?.name || '—'}</td>
                            <td className="p-4 text-body">{d.assignedVolunteer?.name || '—'}</td>
                            <td className="p-4">
                              <StatusBadge status={d.status} />
                            </td>
                            <td className="p-4 text-muted">{new Date(d.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-body">
                    <thead className="bg-slate-50 text-ink font-semibold border-b border-line uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">Food Item</th>
                        <th className="p-4">Volunteer</th>
                        <th className="p-4">Destination NGO</th>
                        <th className="p-4">Distance / ETA</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Assigned At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {deliveries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted">
                            No active or historical deliveries recorded yet.
                          </td>
                        </tr>
                      ) : (
                        deliveries.map((del) => (
                          <tr key={del._id} className="hover:bg-slate-50/60 transition">
                            <td className="p-4 font-semibold text-ink">{del.donation?.foodName || 'Delivery'}</td>
                            <td className="p-4 text-body">{del.volunteer?.name || 'Volunteer'}</td>
                            <td className="p-4 text-body">{del.ngo?.name || 'NGO'}</td>
                            <td className="p-4 text-muted">~{del.distanceKm || 0} km • ~{del.estimatedDeliveryMinutes || 15} mins</td>
                            <td className="p-4">
                              <StatusBadge status={del.status} />
                            </td>
                            <td className="p-4 text-muted">{new Date(del.assignedAt).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MAP DISTRIBUTION */}
        {activeTab === 'map' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <PageHeader
                title="Geographic Redistribution Map"
                description="Live spatial distribution of surplus food pickup spots, partner NGO distribution hubs, and volunteer locations."
              />

              <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Showing {filteredMapPoints.length} of {mapPoints.length} locations
              </div>
            </div>

            <div className="card p-5 space-y-4">
              {/* Interactive Layer / Category Filter Buttons */}
              <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-line">
                <span className="text-xs font-semibold text-muted flex items-center gap-1.5 mr-1">
                  <Layers size={14} /> Filter Layer:
                </span>

                <button
                  type="button"
                  onClick={() => setMapFilter('all')}
                  className={`px-3.5 py-1.5 rounded-control text-xs font-semibold transition flex items-center gap-1.5 ${
                    mapFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-line text-body hover:bg-slate-50'
                  }`}
                >
                  <span>All Locations</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mapFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {mapPoints.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapFilter('donation_pickup')}
                  className={`px-3.5 py-1.5 rounded-control text-xs font-semibold transition flex items-center gap-1.5 ${
                    mapFilter === 'donation_pickup'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50/60 border border-emerald-200 text-emerald-800 hover:bg-emerald-100/60'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white"></span>
                  <span>Donation Pickup Points</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mapFilter === 'donation_pickup' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {donationPointsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapFilter('ngo_location')}
                  className={`px-3.5 py-1.5 rounded-control text-xs font-semibold transition flex items-center gap-1.5 ${
                    mapFilter === 'ngo_location'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-sky-50/60 border border-sky-200 text-sky-800 hover:bg-sky-100/60'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block border border-white"></span>
                  <span>NGO Destination Centers</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mapFilter === 'ngo_location' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'}`}>
                    {ngoPointsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapFilter('volunteer_location')}
                  className={`px-3.5 py-1.5 rounded-control text-xs font-semibold transition flex items-center gap-1.5 ${
                    mapFilter === 'volunteer_location'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-50/60 border border-purple-200 text-purple-800 hover:bg-purple-100/60'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block border border-white"></span>
                  <span>Volunteer Locations</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mapFilter === 'volunteer_location' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'}`}>
                    {volunteerPointsCount}
                  </span>
                </button>
              </div>

              {/* Map Container */}
              <div className="rounded-control overflow-hidden border border-line" style={{ height: '550px' }}>
                <MapContainer
                  center={[12.9716, 77.5946]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  {filteredMapPoints.map((pt, i) => (
                    <Marker
                      key={`${pt.id}-${pt.type}-${i}`}
                      position={[pt.lat, pt.lng]}
                      icon={createMapMarkerIcon(pt.type)}
                    >
                      <Popup>
                        <div className="p-1.5 space-y-1 max-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">
                              {pt.type === 'donation_pickup' ? '🍲' : pt.type === 'ngo_location' ? '🏢' : '🛵'}
                            </span>
                            <p className="font-bold text-xs text-ink">{pt.title}</p>
                          </div>
                          <p className="text-[11px] text-muted">{pt.subtitle}</p>
                          {pt.address && <p className="text-[10px] text-body">{pt.address}</p>}
                          {pt.status && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {pt.status.replace(/_/g, ' ')}
                            </span>
                          )}
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
    </AppLayout>
  );
};

export default AdminDashboard;