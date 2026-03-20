import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  BookOpen,
  Package,
  Settings,
  LogOut,
  ShoppingBag,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface SidebarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

// Adjusting nav items to add badges and specific icons matching the mockup structural feel
const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/generate-bills', icon: FilePlus, label: 'Generate Bills' },
  { to: '/bill-library', icon: BookOpen, label: 'Bill Library' },
  {
    to: '/purchase-order',
    icon: ShoppingBag,
    label: 'Purchase Orders',
    subItems: [
      { to: '/purchase-order', label: 'PO Library', exact: true },
      { to: '/purchase-order/new', label: 'Create PO' }
    ]
  },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/template-setup', icon: Settings, label: 'Template Setup' },
];

const Sidebar: React.FC<SidebarProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Auto-expand menus based on current route
  useEffect(() => {
    const activeParent = navItems.find(item => item.subItems && location.pathname.startsWith(item.to));
    if (activeParent) {
      setExpandedMenu(activeParent.to);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMenu = (to: string) => {
    setExpandedMenu(prev => prev === to ? null : to);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen?.(false)}
        />
      )}
      
      <div 
        className={`w-64 flex-shrink-0 bg-[#F3F6FA] border-r border-[#E2E8F0] shadow-[2px_0_6px_rgba(0,0,0,0.04)] flex flex-col h-full font-sans fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-transparent">
        <div className="flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="VMEW Logo" className="h-8 w-auto max-w-[140px] object-contain" />
        </div>
        {/* Keep the VMEW text as a fallback or beside the icon depending on the logo's built-in text */}
        <div>
          <p className="text-lg font-bold text-slate-800 tracking-tight leading-tight">VMEW</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-1 overflow-y-auto custom-scrollbar px-3">
        {navItems.map((item) => {
          if (item.subItems) {
            const isParentActive = location.pathname.startsWith(item.to);
            const isExpanded = expandedMenu === item.to;

            return (
              <div key={item.to} className="flex flex-col mb-1">
                <button
                  onClick={() => toggleMenu(item.to)}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors ${isParentActive ? 'bg-[#E6EEF9] text-[#2563EB]' : 'text-[#334155] hover:bg-[#EDF3FB]'
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <item.icon size={20} strokeWidth={isParentActive ? 2.5 : 2} className={isParentActive ? 'text-[#2563EB]' : 'text-[#334155]'} />
                    <span className={`text-[15px] ${isParentActive ? 'font-bold' : 'font-semibold'}`}>
                      {item.label}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} strokeWidth={2.5} className={isParentActive ? 'text-[#2563EB]' : 'text-[#334155]'} />
                  ) : (
                    <ChevronDown size={16} strokeWidth={2.5} className={isParentActive ? 'text-[#2563EB]' : 'text-[#334155]'} />
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-5 mt-1 relative flex flex-col">
                    {item.subItems.map((sub, idx) => {
                      const isLast = idx === item.subItems.length - 1;
                      return (
                        <div key={sub.to} className="relative pl-[18px] py-0.5">
                          {/* Vertical trunk line (continuous line on the left) */}
                          {!isLast && <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-[#E2E8F0]" />}
                          {/* For the last item, the trunk only goes halfway down to meet the curve */}
                          {isLast && <div className="absolute left-0 top-0 h-1/2 w-[1.5px] bg-[#E2E8F0]" />}

                          {/* The branch curve (border-b and border-l to make a curved corner) */}
                          <div className="absolute left-0 top-0 w-[14px] h-1/2 border-l-[1.5px] border-b-[1.5px] border-[#E2E8F0] rounded-bl-[10px]" />

                          <NavLink
                            to={sub.to}
                            end={sub.exact}
                            className={({ isActive }) =>
                              `relative flex items-center justify-between px-4 py-2 text-[14px] rounded-xl transition-all duration-200 ${isActive
                                ? 'bg-[#E6EEF9] text-[#2563EB] font-bold'
                                : 'text-[#334155] font-semibold hover:bg-[#EDF3FB]'
                              }`
                            }
                          >
                            <span>{sub.label}</span>
                          </NavLink>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Normal link
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors mb-1 ${isActive ? 'bg-[#E6EEF9] text-[#2563EB]' : 'text-[#334155] hover:bg-[#EDF3FB]'
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-center gap-3.5">
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? 'text-[#2563EB]' : 'text-[#334155]'}
                  />
                  <span className={`text-[15px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="px-6 py-6 border-t border-transparent mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full text-left text-[#334155] hover:bg-[#EDF3FB] hover:text-[#2563EB] transition-colors group px-3 py-2.5 rounded-xl"
        >
          <LogOut size={20} strokeWidth={2} className="text-[#334155] group-hover:text-[#2563EB] transition-colors" />
          <span className="text-[15px] font-semibold">Logout</span>
        </button>
      </div>
    </div>
    </>
  );
};

export default Sidebar;