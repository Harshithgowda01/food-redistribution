import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Bell,
  User,
  Truck,
  History,
  Building2,
  BarChart3,
  Users,
  Map,
} from 'lucide-react';

export const ROLE_LABELS = {
  donor: 'Donor portal',
  ngo: 'NGO partner',
  volunteer: 'Volunteer',
  admin: 'Administrator',
};

export const DONOR_NAV = [
  { to: '/donor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/donor/donate', label: 'Post donation', icon: PlusCircle },
  { to: '/donor/donations', label: 'My donations', icon: Package },
  { to: '/donor/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/donor/profile', label: 'Profile', icon: User },
];

export const NGO_NAV = [
  { to: '/ngo/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ngo/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/ngo/profile', label: 'NGO profile', icon: Building2 },
];

export const VOLUNTEER_NAV = [
  { to: '/volunteer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/volunteer/active', label: 'Live mission', icon: Truck, match: ['/volunteer/active', '/volunteer/active-delivery'] },
  { to: '/volunteer/history', label: 'History', icon: History },
  { to: '/volunteer/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/volunteer/profile', label: 'Profile', icon: User },
];

export const ADMIN_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'donations', label: 'Donations', icon: Package },
  { id: 'map', label: 'Map', icon: Map },
];

export function getNavItems(role) {
  if (role === 'ngo') return NGO_NAV;
  if (role === 'volunteer') return VOLUNTEER_NAV;
  if (role === 'admin') return [];
  return DONOR_NAV;
}
