import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import LogsTable from '../components/LogsTable';
import { downloadAuditReport, getLogs } from '../services/api';
import { ChevronLeft, ChevronRight, Download, RefreshCcw } from 'lucide-react';

const Logs = () => {
  const [logsData, setLogsData] = useState({ data: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = async (page) => {
    setLoading(true);
    try {
      // Calls the paginated endpoint: /api/v1/logs?page=X&limit=50
      const response = await getLogs(page, 15);
      setLogsData(response);
      setIsConnected(true);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const blob = await downloadAuditReport();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'blockchain_audit_report.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export logs:', err);
      alert(err.response?.data?.message || 'Audit export failed');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void fetchHistory(currentPage);
    }, 0);

    return () => {
      window.clearTimeout(initialLoadId);
    };
  }, [currentPage]);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-primary)]">
      <Sidebar activePage="logs" />
      <div className="flex-1 flex flex-col">
        <Navbar
          title="Audit Trail & History"
          isConnected={isConnected}
          isRefreshing={loading}
          onRefresh={() => fetchHistory(currentPage)}
        />

        <main className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Verification History</h2>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Complete forensic record of all blockchain integrity checks.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary-blue)] text-white disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export JSON'}
              </button>
              <button
                onClick={() => fetchHistory(currentPage)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
              >
                <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl">
            <LogsTable logs={logsData.data} isLoading={loading} />

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Showing {logsData.data.length} of {logsData.total} logs
              </p>
              <div className="flex gap-4">
                <button
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={currentPage * 15 >= logsData.total || loading}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary-blue)] text-white disabled:opacity-30"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Logs;
