import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  FileSpreadsheet,
  User,
  Clock,
  Activity
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel } from '../utils/export';
import { AuditLog } from '../types';

export const AuditLogsView: React.FC = () => {
  const { t, formatDate } = useLanguage();
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.data || []);
        setLogs(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.warn('Notice: Audit logs fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeLogs = Array.isArray(logs) ? logs : [];

  const filteredLogs = safeLogs.filter(log => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchUser = (log.userName || '').toLowerCase().includes(q);
      const matchEntity = (log.entityType || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      if (!matchAction && !matchUser && !matchEntity && !matchDetails) return false;
    }
    return true;
  });

  const handleExportExcel = () => {
    const data = filteredLogs.map(l => ({
      'Timestamp': l.timestamp,
      'User': l.userName,
      'Action': l.action,
      'Target Entity': l.entityType,
      'Entity ID': l.entityId || '—',
      'IP Address': l.ipAddress,
      'Details': l.details
    }));
    exportToExcel(data, 'Saudi_Fleet_Security_Audit_Trail', 'Audit Trail');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-800" />
            <span>{t.auditLogs} ({logs.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic Security Trail of all System Logins, Modals, Document Access & Database Mutations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
            <span>{t.exportExcel}</span>
          </button>

          <button
            type="button"
            onClick={fetchLogs}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-800' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by action, user, entity or details..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 font-medium"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading audit trail records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="font-bold text-slate-700">No audit records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono">
                      {formatDate(log.timestamp)} <span className="text-[10px] text-slate-400">{log.timestamp?.slice(11, 19)}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                      {log.userName}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                      {log.entityType}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {log.ipAddress}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
