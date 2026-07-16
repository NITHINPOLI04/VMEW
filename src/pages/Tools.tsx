import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Wrench, ArrowRight } from 'lucide-react';

interface ToolCard {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  path: string;
  tag?: string;
  tagColor?: string;
  gradient: string;
  borderHover: string;
  shadowHover: string;
}

const TOOLS: ToolCard[] = [
  {
    id: 'hsn-calculator',
    label: 'HSN Summary Calculator',
    description: 'Generate GSTR-1 Table 12 HSN summary. Aggregate invoices by HSN/SAC code for any period.',
    icon: Calculator,
    iconBg: 'bg-white/70',
    iconColor: 'text-blue-600',
    path: '/tools/hsn-calculator',
    tag: 'GST Filing',
    tagColor: 'bg-white/50 text-blue-700 border-blue-200/60',
    gradient: 'bg-gradient-to-br from-blue-50 via-indigo-50/50 to-sky-50',
    borderHover: 'hover:border-blue-300',
    shadowHover: 'hover:shadow-[0_8px_30px_rgba(37,99,235,0.12)]',
  },
  // Future tools — just add a new entry with a unique gradient:
  // {
  //   id: 'e-way-bill',
  //   label: 'E-Way Bill Generator',
  //   description: 'Generate and manage e-way bills for goods transport.',
  //   icon: Truck,
  //   iconBg: 'bg-white/70',
  //   iconColor: 'text-emerald-600',
  //   path: '/tools/e-way-bill',
  //   tag: 'Transport',
  //   tagColor: 'bg-white/50 text-emerald-700 border-emerald-200/60',
  //   gradient: 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50',
  //   borderHover: 'hover:border-emerald-300',
  //   shadowHover: 'hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)]',
  // },
];

const Tools: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-10 -mx-6 -mt-4 px-6 pt-6 min-h-screen rounded-t-3xl relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #f8f7ff 0%, #f3f0ff 15%, #faf0f6 40%, #fef5f0 65%, #fafafa 100%)',
      }}
    >
      {/* Decorative radial glow blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-pink-100/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-50/30 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Hero Section ── */}
      <div className="text-center pt-4 pb-2 relative z-10">
        <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-200/50">
          <Wrench size={26} className="text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tools</h1>
        <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
          Productivity tools for GST filing, reporting, and business operations.
          <br />
          Select a tool below to get started.
        </p>
      </div>

      {/* ── Divider with label ── */}
      <div className="flex items-center gap-3 px-1 relative z-10">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Available Tools
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* ── Tool Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => navigate(tool.path)}
            className={`group rounded-2xl border border-slate-200/80 p-5 text-left ${tool.gradient} ${tool.borderHover} ${tool.shadowHover} transition-all duration-300 cursor-pointer relative overflow-hidden`}
          >
            {/* Subtle decorative glow circle */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/30 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

            <div className="relative flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tool.iconBg} backdrop-blur-sm shadow-sm border border-white/60 transition-transform duration-200 group-hover:scale-110`}>
                <tool.icon size={20} className={tool.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                    {tool.label}
                  </h3>
                  <ArrowRight size={14} className="text-slate-300 flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
                {tool.tag && (
                  <span className={`inline-block mt-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tool.tagColor}`}>
                    {tool.tag}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}

        {/* ── Coming Soon placeholder ── */}
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 flex items-center justify-center min-h-[120px] bg-gradient-to-br from-slate-50/50 to-white">
          <div className="text-center">
            <div className="w-8 h-8 bg-slate-100/80 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Wrench size={14} className="text-slate-300" />
            </div>
            <p className="text-xs font-semibold text-slate-300">More tools coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tools;
