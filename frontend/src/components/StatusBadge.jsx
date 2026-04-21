import React from 'react';

const StatusBadge = ({ status }) => {
  const isMatch = status === "MATCH";
  
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
      isMatch 
        ? "bg-green-500/10 text-green-400 border border-green-500/20" 
        : "bg-red-500/10 text-red-400 border border-red-500/20"
    }`}>
      {status}
    </span>
  );
};

export default StatusBadge;
