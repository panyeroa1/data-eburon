
import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen }) => {
  const menuItems = [
    { id: 'docs', icon: 'fa-box-archive', label: 'Case Files' },
    { id: 'chat', icon: 'fa-magnifying-glass-location', label: 'Gov Search' },
    { id: 'purge', icon: 'fa-shield-halved', label: 'Compliance Purge' },
    { id: 'audit', icon: 'fa-stamp', label: 'Administrative Audit' },
    { id: 'settings', icon: 'fa-building-columns', label: 'FPS Settings' },
  ];

  return (
    <div className={`
      fixed left-0 top-0 h-screen bg-slate-900 text-white z-50
      transition-transform duration-300 ease-in-out w-64
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
    `}>
      <div className="p-6 flex flex-col gap-1 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-700 w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border border-white/20">
             <div className="flex gap-0.5">
                <div className="w-1.5 h-3 bg-black"></div>
                <div className="w-1.5 h-3 bg-yellow-400"></div>
                <div className="w-1.5 h-3 bg-red-600"></div>
             </div>
             <i className="fa-solid fa-crown text-[10px] text-yellow-400 mt-1"></i>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block leading-none">EBURON</span>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">BE-Gov Compliance</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 mt-6 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTab === item.id 
                ? 'bg-blue-700 text-white shadow-lg shadow-blue-900/40 border-l-4 border-yellow-400' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg ${activeTab === item.id ? 'scale-110' : ''}`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-xs font-bold border border-blue-700">
            OFF
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold truncate">Administrative Officer</p>
            <p className="text-[10px] text-slate-500 truncate">FPS BOSA | Level 2 Auth</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
