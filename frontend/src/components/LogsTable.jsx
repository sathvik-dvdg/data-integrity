import React from 'react';
import StatusBadge from './StatusBadge';
import { ExternalLink, Loader2 } from 'lucide-react';

const formatHash = (hash) => {
  if (!hash) return '';
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString();
};

const LogsTable = ({ logs = [], isLoading = false }) => {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
      <div className="p-6 border-b border-[var(--color-surface-container-high)] flex justify-between items-center">
        <h3 className="text-xl font-bold font-[Manrope] text-white">Verification Logs</h3>
        <span className="text-sm font-mono text-[var(--color-text-secondary)]">
          {isLoading ? 'Loading...' : `${logs.length} Records`}
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-container-high)]/30 text-[var(--color-text-secondary)] text-sm uppercase tracking-widest font-semibold border-b border-[var(--color-surface-container-high)]">
              <th className="px-6 py-4">Block #</th>
              <th className="px-6 py-4">Hash ID</th>
              <th className="px-6 py-4">Integrity Status</th>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-surface-container-high)]">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
                  <div className="inline-flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading verification history...
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
                  No verification records found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr 
                  key={log._id || log.blockNumber} 
                  className="hover:bg-[var(--color-surface-container-high)]/40 transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-white">
                    {log.blockNumber}
                  </td>
                  <td className="px-6 py-4 font-mono text-[var(--color-text-secondary)] group cursor-pointer">
                    <div className="flex items-center gap-2">
                      {formatHash(log.blockHash)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={log.status} isMock={log.isMock} />
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] font-mono">
                    {formatTime(log.checkedAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)] transition-colors p-2 hover:bg-white/5 rounded-lg">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsTable;
