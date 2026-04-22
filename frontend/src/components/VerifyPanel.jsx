import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const VerifyPanel = ({ onVerify, isVerifying }) => {
  const [blockInput, setBlockInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (blockInput.trim()) {
      onVerify(blockInput.trim());
    }
  };

  return (
    <div className="glass-panel p-8 rounded-3xl mb-8 relative border-t border-l border-[var(--color-primary-blue)]/10 shadow-2xl">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-[Manrope] font-semibold text-white mb-6 text-center">
          Forensic Block Insight
        </h2>
        
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-4 z-10 text-[var(--color-text-secondary)]">
            <Search className="w-5 h-5" />
          </div>
          
          <input
            type="text"
            className="w-full terminal-input pl-12 pr-36 h-14 text-lg"
            placeholder="Enter Block Number or 'latest'"
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
            disabled={isVerifying}
          />
          
          <button
            type="submit"
            disabled={!blockInput.trim() || isVerifying}
            className="absolute right-2 primary-gradient-btn h-10 px-8 rounded-md flex items-center justify-center min-w-[120px]"
          >
            {isVerifying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Verify'
            )}
          </button>
        </form>
        
        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-4 font-mono">
          Initiating cryptographic validation against immutable ledger
        </p>
      </div>
    </div>
  );
};

export default VerifyPanel;
