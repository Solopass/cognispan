import React from 'react';
import { Calendar, Layers, BarChart2, Info, Settings } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'sandbox' | 'analytics' | 'about' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Protocol & Lab', icon: <Calendar className="w-4 h-4" /> },
    { id: 'sandbox', label: 'Task Sandbox', icon: <Layers className="w-4 h-4" /> },
    { id: 'analytics', label: 'WMC Analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'about', label: 'Science & Manual', icon: <Info className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <nav className="w-full border-b border-surface-border bg-surface-subtle/50">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
};
