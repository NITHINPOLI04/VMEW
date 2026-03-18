import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-[#F3F6FA] px-4 py-3 border-b border-[#E2E8F0] shadow-sm z-20 absolute top-0 w-full">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="VMEW Logo" className="h-6 w-auto object-contain" />
          <p className="text-base font-bold text-slate-800 tracking-tight leading-tight">VMEW</p>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-[52px] md:pt-0 h-full">
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;