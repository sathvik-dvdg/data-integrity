import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatsCards from '../components/StatsCards';
import VerifyPanel from '../components/VerifyPanel';
import LogsTable from '../components/LogsTable';
import { getLogs, verifyBlock, getStats, getLatestBlock } from '../services/api';
import usePolling from '../hooks/usePolling';

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorToast, setErrorToast] = useState(null);

  const fetchDashboardData = useCallback(async (showRefreshIndicator = false, signal = null) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const [logsRes, statsRes, latestRes] = await Promise.all([
        getLogs(signal),
        getStats(signal),
        getLatestBlock(signal)
      ]);
      
      if (logsRes?.data) setLogs(logsRes.data);
      if (statsRes?.data) setStats(statsRes.data);
      if (latestRes) setIsConnected(true);
    } catch (error) {
      if (error.name === 'CanceledError' || error.name === 'AbortError') return;
      console.error("Dashboard fetch error:", error);
      setIsConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(true, controller.signal);
    return () => controller.abort();
  }, [fetchDashboardData]);

  // Auto-refresh every 5 seconds
  usePolling((signal) => {
    fetchDashboardData(false, signal);
  }, 5000);

  const handleVerify = async (blockNumber) => {
    setIsVerifying(true);
    setErrorToast(null);
    try {
      const { data: newLog } = await verifyBlock(blockNumber);
      
      // 🚀 Optimistic/Local State Update
      setLogs(prev => {
        // Prevent duplicates if by some chance it was already loaded
        const filtered = prev.filter(l => l.blockNumber !== newLog.blockNumber);
        return [newLog, ...filtered].slice(0, 100); 
      });

      setStats(prev => {
        if (!prev) return null;
        return {
          ...prev,
          total: prev.total + 1,
          matchCount: newLog.status === "MATCH" ? prev.matchCount + 1 : prev.matchCount,
          mismatchCount: newLog.status === "MISMATCH" ? prev.mismatchCount + 1 : prev.mismatchCount,
          latestBlock: newLog.blockNumber,
          latestCheckedAt: newLog.checkedAt
        };
      });

    } catch (error) {
      setErrorToast(error.message || "Failed to verify block. Please try again.");
      setTimeout(() => setErrorToast(null), 5000);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#0b1326] to-[#0d162a]">
        <Navbar 
          isConnected={isConnected} 
          onRefresh={() => fetchDashboardData(true)} 
          isRefreshing={isRefreshing} 
        />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {errorToast && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-between shadow-lg">
                <span className="font-semibold">{errorToast}</span>
                <button onClick={() => setErrorToast(null)} className="opacity-70 hover:opacity-100">×</button>
              </div>
            )}
            
            <StatsCards stats={stats} />
            <VerifyPanel onVerify={handleVerify} isVerifying={isVerifying} />
            <LogsTable logs={logs} />
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
