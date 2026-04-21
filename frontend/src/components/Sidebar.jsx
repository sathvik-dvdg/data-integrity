import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, Bell, Settings } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
    { path: '/logs', icon: <List className="w-5 h-5" />, label: 'Logs' },
    { path: '/alerts', icon: <Bell className="w-5 h-5" />, label: 'Alerts' },
    { path: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  return (
    <aside className="w-64 border-r border-[var(--color-surface-container-high)] bg-[var(--color-background-dim)] min-h-[calc(100vh-4rem)] p-4 flex flex-col hidden md:flex">
      <div className="space-y-2 mt-4 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
              ${isActive 
                ? 'bg-[var(--color-surface-container-high)]/80 text-[var(--color-primary-blue)] border border-[var(--color-primary-blue)]/20 shadow-[0_0_15px_rgba(56,189,248,0.05)]' 
                : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-container-low)]'
              }
            `}
          >
            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
              {item.icon}
            </div>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
      
      <div className="mb-4 mt-auto">
        <div className="glass-panel rounded-xl p-4 flex flex-col items-start gap-2 border-[var(--color-primary-blue)]/20">
          <div className="w-2 h-2 rounded-full bg-[var(--color-success-green)] animate-pulse shadow-[0_0_8px_var(--color-success-green)]"></div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-mono">
            System running<br/>
            v1.0.4-forensic
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
