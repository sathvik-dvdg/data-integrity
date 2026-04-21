import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import LogsTable from '../components/LogsTable';
import { getLogs, getLatestBlock } from '../services/api';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const logsRes = await getLogs();
      const latestRes = await getLatestBlock();
      if (logsRes?.data) setLogs(logsRes.data);
      if (latestRes) setIsConnected(true);
    } catch (error) {
      console.error(error);
      setIsConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#0b1326] to-[#0d162a]">
        <Navbar isConnected={isConnected} onRefresh={fetchLogs} isRefreshing={isRefreshing} />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <LogsTable logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Logs;
