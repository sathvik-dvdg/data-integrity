import React from 'react';
import { Activity, CheckCircle, XCircle, Hash } from 'lucide-react';

const StatsCard = ({ title, value, icon, valueColor = "text-white" }) => (
  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
    {/* Subtle gradient glow effect on hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h3 className="text-sm font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
          {title}
        </h3>
        <p className={`text-3xl font-bold font-[Manrope] ${valueColor}`}>
          {value || "0"}
        </p>
      </div>
      <div className="p-3 bg-[var(--color-surface-container-high)] rounded-xl border border-white/5 text-[var(--color-text-secondary)]">
        {icon}
      </div>
    </div>
  </div>
);

const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard 
        title="Total Verifications" 
        value={stats?.total} 
        icon={<Activity className="w-6 h-6" />}
      />
      <StatsCard 
        title="Total Match" 
        value={stats?.matchCount} 
        icon={<CheckCircle className="w-6 h-6" />} 
        valueColor="text-[var(--color-success-green)] text-shadow-sm"
      />
      <StatsCard 
        title="Total Mismatch" 
        value={stats?.mismatchCount} 
        icon={<XCircle className="w-6 h-6" />} 
        valueColor={stats?.mismatchCount > 0 ? "text-[var(--color-error-red)]" : "text-white"}
      />
      <StatsCard 
        title="Latest Verified" 
        value={stats?.latestVerifiedBlock ? `#${stats.latestVerifiedBlock}` : "N/A"} 
        icon={<Hash className="w-6 h-6" />} 
        valueColor="text-[#8ed5ff]"
      />
    </div>
  );
};

export default StatsCards;
