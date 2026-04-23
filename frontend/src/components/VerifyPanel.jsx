import React, { useState } from 'react';
import { Search, Loader2, Zap } from 'lucide-react';

const VerifyPanel = ({ onVerify, isVerifying }) => {
  const [blockInput, setBlockInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (blockInput.trim()) {
      onVerify(blockInput.trim());
    }
  };

  const handleVerifyLatest = () => {
    onVerify('latest');
  };

  return (
    <div className="glass-panel p-8 rounded-3xl mb-8 relative border-t border-l border-[var(--color-primary-blue)]/10 shadow-2xl">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-[Manrope] font-semibold text-white mb-6">
          Forensic Block Insight
        </h2>

        <form onSubmit={handleSubmit} className="relative flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-grow w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-[var(--color-text-secondary)]">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              className="w-full terminal-input pl-12 pr-4 h-14 text-lg"
              placeholder="Enter Block Number..."
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
              disabled={isVerifying}
            />
          </div>
          <button
            type="submit"
            disabled={!blockInput.trim() || isVerifying}
            className="primary-gradient-btn h-14 px-8 rounded-xl flex items-center justify-center min-w-[120px] w-full md:w-auto"
          >
            {isVerifying ? <Loader2 className="animate-spin" /> : 'Verify'}
          </button>
        </form>

        <div className="flex flex-col items-center mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-12 bg-white/10"></div>
            <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">Or</span>
            <div className="h-px w-12 bg-white/10"></div>
          </div>
          <button
            onClick={handleVerifyLatest}
            disabled={isVerifying}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-[var(--color-primary-blue)]/20 transition-all text-sm text-white"
          >
            <Zap className="w-4 h-4 text-[var(--color-primary-blue)]" />
            Verify Latest Block
          </button>
        </div>

        <p className="text-center text-xs text-[var(--color-text-secondary)] mt-6 font-mono opacity-60">
          Continuous cryptographic monitoring active
        </p>
      </div>
    </div>
  );
};

export default VerifyPanel;