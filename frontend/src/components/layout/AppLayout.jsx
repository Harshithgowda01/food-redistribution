import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getNavItems, ROLE_LABELS, ADMIN_TABS } from '../../config/nav';
import logoImg from '../../assets/logo.png';

const AppLayout = ({ children, maxWidth = 'max-w-6xl', adminTabs }) => {
  const { user, logout } = useAuth();
  const { unreadCount, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = adminTabs ? [] : getNavItems(user?.role);
  const roleLabel = ROLE_LABELS[user?.role] || 'Portal';

  const isNavActive = (item) => {
    const paths = item.match || [item.to];
    return paths.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
  };

  const linkClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-control text-sm font-medium transition ${
      active ? 'bg-forest-light text-forest' : 'text-body hover:bg-slate-50 hover:text-ink'
    }`;

  const sidebarBody = (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-line">
        <img src={logoImg} alt="FoodShare" className="w-9 h-9 rounded-lg object-contain bg-forest-light p-1" />
        <div className="min-w-0">
          <p className="font-semibold text-ink text-sm leading-tight">FoodShare</p>
          <p className="text-xs text-muted truncate">{roleLabel}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {adminTabs &&
          ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = adminTabs.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  adminTabs.setActiveTab(tab.id);
                  setOpen(false);
                }}
                className={`w-full ${linkClass(active)}`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                setOpen(false);
                if (item.badge && markAllAsRead) {
                  markAllAsRead();
                }
              }}
              className={linkClass(active)}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-line">
        <p className="text-sm font-medium text-ink truncate">{user?.name || 'Account'}</p>
        <p className="text-xs text-muted truncate mb-3">{user?.email}</p>
        <button type="button" onClick={handleLogout} className="btn-ghost w-full justify-start text-rose-700 hover:bg-rose-50 hover:text-rose-800">
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-line sticky top-0 h-screen">
        {sidebarBody}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="" className="w-8 h-8 rounded-lg object-contain bg-forest-light p-0.5" />
            <span className="font-semibold text-ink text-sm">FoodShare</span>
          </div>
          <button type="button" className="btn-ghost p-2" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </header>

        {open && (
          <div className="lg:hidden fixed inset-0 z-40">
            <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-pop flex flex-col">
              <div className="flex justify-end p-2">
                <button type="button" className="btn-ghost p-2" onClick={() => setOpen(false)} aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              {sidebarBody}
            </aside>
          </div>
        )}

        <main className={`${maxWidth} mx-auto px-4 sm:px-6 py-6 sm:py-8`}>{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
