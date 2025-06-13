import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, FileText, BookOpen, Package, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">VMEW</h1>
      </div>
      <nav className="flex-1 py-4">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 ${
              isActive ? 'bg-blue-900 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`
          }
        >
          <Home className="mr-3 h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/generate-invoice"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 ${
              isActive ? 'bg-blue-900 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`
          }
        >
          <FileText className="mr-3 h-5 w-5" />
          <span>Generate Invoice</span>
        </NavLink>
        <NavLink
          to="/invoice-library"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 ${
              isActive ? 'bg-blue-900 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`
          }
        >
          <BookOpen className="mr-3 h-5 w-5" />
          <span>Invoice Library</span>
        </NavLink>
        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 ${
              isActive ? 'bg-blue-900 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`
          }
        >
          <Package className="mr-3 h-5 w-5" />
          <span>Inventory</span>
        </NavLink>
        <NavLink
          to="/template-setup"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 ${
              isActive ? 'bg-blue-900 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`
          }
        >
          <Settings className="mr-3 h-5 w-5" />
          <span>Template Setup</span>
        </NavLink>
      </nav>
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 text-slate-300 hover:bg-slate-700 w-full rounded"
        >
          <LogOut className="mr-3 h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;