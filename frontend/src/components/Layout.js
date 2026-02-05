import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, FileText, DollarSign, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Layout = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/services', icon: Briefcase, label: 'Services' },
    { path: '/invoices', icon: FileText, label: 'Invoices' },
    { path: '/expenses', icon: DollarSign, label: 'Expenses' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 border-r border-gray-200 bg-white">
        <div className="p-6 border-b border-gray-200">
          <img 
            src="/imagicity-logo.png" 
            alt="IMAGICITY" 
            className="h-8 w-auto"
          />
          <p className="text-xs text-gray-500 mt-2 font-medium">Invoice Manager</p>
        </div>
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-body text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t border-gray-200">
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="outline"
            className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 font-body"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
