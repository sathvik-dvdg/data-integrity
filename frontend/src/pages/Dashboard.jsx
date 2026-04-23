import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatsCards from '../components/StatsCards';
import VerifyPanel from '../components/VerifyPanel';
import LogsTable from '../components/LogsTable';
import { getDashboardSummary, verifyBlock } from '../services/api';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  // 🔄 Fetch initial data and set up polling
  const loadDashboardData = async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Unable to connect to the backend monitoring service.");
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Poll every 10 seconds to catch updates from the 30-second auto-job
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualVerify = async (blockTag) => {
    setIsVerifying(true);
    try {
      await verifyBlock(blockTag);
      // Refresh data immediately after a manual check
      await loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-primary)]">
      <Sidebar activePage="dashboard" />
      <div className="flex-1 flex flex-col">
        <Navbar title="Data Integrity Dashboard" />

        <main className="p-8 space-y-8 overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Core UI Components */}
          <StatsCards stats={summary?.stats} />

          <VerifyPanel
            onVerify={handleManualVerify}
            isVerifying={isVerifying}
          />

          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-xl font-semibold text-white mb-6">Recent Live Verifications</h3>
            <LogsTable logs={summary?.recentLogs || []} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;