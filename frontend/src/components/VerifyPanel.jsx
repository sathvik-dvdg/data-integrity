import React, { useState } from 'react';
import { Loader2, MessageSquareQuote } from 'lucide-react';

const MESSAGE_HINT_SANITIZER = /[^A-Za-z0-9@.'_,:/()\- ]+/g;

const sanitizeMessageHint = (value) => value
  .replace(MESSAGE_HINT_SANITIZER, ' ')
  .replace(/\s+/g, ' ')
  .trimStart();

const VerifyPanel = ({ onRequestVerification, isSubmitting, activePendingBlock }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();

    if (trimmedMessage) {
      Promise.resolve(onRequestVerification(trimmedMessage))
        .then(() => setMessage(''))
        .catch(() => {});
    }
  };

  return (
    <div className="glass-panel p-8 rounded-3xl mb-8 relative border-t border-l border-[var(--color-primary-blue)]/10 shadow-2xl">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-[Manrope] font-semibold text-white mb-6">
          Queue a Verification Request
        </h2>

        <form onSubmit={handleSubmit} className="relative flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-grow w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-[var(--color-text-secondary)]">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <input
              type="text"
              className="w-full terminal-input pl-12 pr-4 h-14 text-lg"
              placeholder="Add a short message for the next verification block..."
              value={message}
              maxLength={160}
              onChange={(e) => setMessage(sanitizeMessageHint(e.target.value))}
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className="primary-gradient-btn h-14 px-8 rounded-xl flex items-center justify-center min-w-[220px] w-full md:w-auto"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit for Verification'}
          </button>
        </form>

        <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-white font-medium">Next target block</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                We create a signed pending log for the next block and finalize it once the chain advances.
              </p>
            </div>
            <div className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-mono">
              {activePendingBlock ? `Watching #${activePendingBlock}` : 'No active pending request'}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-text-secondary)] mt-6 font-mono opacity-60">
          Allowed input: letters, numbers, spaces, and basic punctuation like `@ . ' - _ / ( )`.
        </p>
      </div>
    </div>
  );
};

export default VerifyPanel;
