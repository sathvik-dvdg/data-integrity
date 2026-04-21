import React from 'react';

const StatusBadge = ({ status, isMock }) => {
  const isMatch = status === "MATCH";
  
  return (
    <div className="flex items-center gap-2">
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
        isMatch 
          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
          : "bg-red-500/10 text-red-400 border border-red-500/20"
      }`}>
        {status}
      </span>
      {isMock && (
        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-tighter bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded">
          Simulated
        </span>
      )}
    </div>
  );
};

export default StatusBadge;
