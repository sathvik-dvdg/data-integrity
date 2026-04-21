import React from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

const Navbar = ({ isConnected, onRefresh, isRefreshing }) => {
  return (
    <nav className="h-16 border-b border-[var(--color-surface-container-high)] bg-[var(--color-background-dim)]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-[var(--color-primary-blue)]" />
        <h1 className="text-xl font-bold tracking-tight text-white font-[Manrope]">
          Integrity Checker
        </h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-[var(--color-surface-container-low)] px-3 py-1.5 rounded-full border border-white/5">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'} animate-pulse`}></div>
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="w-[1px] h-6 bg-[var(--color-surface-container-high)]"></div>
        
        <button 
          onClick={onRefresh}
          className="text-[var(--color-text-secondary)] hover:text-white transition-colors p-2 hover:bg-[var(--color-surface-container-low)] rounded-full group"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-[var(--color-primary-blue)]' : ''}`} />
        </button>
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-primary-blue-dim)] to-[var(--color-primary-blue)] flex items-center justify-center text-xs font-bold text-white shadow-lg border border-white/10">
          AD
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
