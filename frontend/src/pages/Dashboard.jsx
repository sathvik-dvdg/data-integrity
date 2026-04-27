import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatsCards from '../components/StatsCards';
import VerifyPanel from '../components/VerifyPanel';
import LogsTable from '../components/LogsTable';
import usePolling from '../hooks/usePolling';
import { getDashboardSummary, requestVerification } from '../services/api';

const getTrackedBlockStatus = (summary, trackedBlockNumber) => {
  if (!trackedBlockNumber || !summary) {
    return null;
  }

  const recentLog = summary.recentLogs?.find((log) => log.blockNumber === trackedBlockNumber);
  if (recentLog?.status) {
    return recentLog.status;
  }

  if (summary.pendingBlocks?.includes(trackedBlockNumber)) {
    return 'PENDING';
  }

  return null;
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [trackedPendingBlock, setTrackedPendingBlock] = useState(null);
  const [trackedPendingStatus, setTrackedPendingStatus] = useState(null);
  const [toast, setToast] = useState(null);

  const loadDashboardData = async ({ showSpinner = false } = {}) => {
    if (showSpinner) {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const data = await getDashboardSummary();
      setSummary(data);
      setIsConnected(Boolean(data?.latestBlockchainBlock));
      setError(null);

      if (trackedPendingBlock) {
        const nextStatus = getTrackedBlockStatus(data, trackedPendingBlock);

        if (trackedPendingStatus === 'PENDING' && nextStatus === 'MATCH') {
          setToast({
            type: 'success',
            message: `Block #${trackedPendingBlock} finished verification successfully.`
          });
          setTrackedPendingBlock(null);
          setTrackedPendingStatus('MATCH');
          return;
        }

        if (trackedPendingStatus === 'PENDING' && nextStatus === 'MISMATCH') {
          setToast({
            type: 'error',
            message: `Block #${trackedPendingBlock} completed with an integrity mismatch.`
          });
          setTrackedPendingBlock(null);
          setTrackedPendingStatus('MISMATCH');
          return;
        }

        if (nextStatus) {
          setTrackedPendingStatus(nextStatus);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Unable to connect to the backend monitoring service.");
      setIsConnected(false);
    } finally {
      if (showSpinner) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadDashboardData();
    }, 0);

    return () => {
      window.clearTimeout(initialLoadId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollingDelay = trackedPendingBlock || summary?.stats?.pendingCount > 0 ? 3000 : 10000;

  usePolling(() => loadDashboardData(), pollingDelay);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const handleVerificationRequest = async (message) => {
    setIsSubmittingRequest(true);

    try {
      const response = await requestVerification(message);
      const pendingBlockNumber = response?.data?.blockNumber || null;
      const nextStatus = response?.data?.status || 'PENDING';

      setTrackedPendingBlock(nextStatus === 'PENDING' ? pendingBlockNumber : null);
      setTrackedPendingStatus(nextStatus);

      if (nextStatus === 'MATCH') {
        setToast({
          type: 'success',
          message: `Block #${pendingBlockNumber} was already verified successfully.`
        });
      } else if (nextStatus === 'MISMATCH') {
        setToast({
          type: 'error',
          message: `Block #${pendingBlockNumber} already exists with an integrity mismatch.`
        });
      }

      await loadDashboardData();
    } catch (err) {
      const messageText = err.response?.data?.message || "Unable to submit verification request.";
      setToast({ type: 'error', message: messageText });
      throw err;
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const activePendingBlock = trackedPendingBlock || summary?.pendingBlocks?.[0] || null;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-primary)]">
      <Sidebar activePage="dashboard" />
      <div className="flex-1 flex flex-col">
        <Navbar
          title="Data Integrity Dashboard"
          isConnected={isConnected}
          isRefreshing={isRefreshing}
          onRefresh={() => loadDashboardData({ showSpinner: true })}
        />

        <main className="p-8 space-y-8 overflow-y-auto">
          {toast && (
            <div
              className={`fixed top-6 right-6 z-50 min-w-[280px] max-w-sm px-5 py-4 rounded-2xl shadow-2xl border text-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                  : 'bg-red-500/15 border-red-400/30 text-red-200'
              }`}
            >
              {toast.message}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <StatsCards stats={summary?.stats} />

          <VerifyPanel
            onRequestVerification={handleVerificationRequest}
            isSubmitting={isSubmittingRequest}
            activePendingBlock={activePendingBlock}
          />

          <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-semibold text-white">Recent Live Verifications</h3>
              {activePendingBlock && (
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-amber-300">
                  Watching block #{activePendingBlock}
                </span>
              )}
            </div>
            <LogsTable logs={summary?.recentLogs || []} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
