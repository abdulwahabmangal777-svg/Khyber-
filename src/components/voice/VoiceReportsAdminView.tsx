import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  FileText,
  MapPin,
  DollarSign,
  Truck,
  User as UserIcon,
  Languages,
  Calendar,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  Printer,
  History,
  ShieldCheck,
  Volume2,
  ArrowUpRight,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { VoiceReport, ExtractedExpense, TripRecord, DriverExpenseItem } from '../../types';
import { audioService } from '../../services/audioService';
import { WhatsAppVoiceNoteBubble } from './WhatsAppVoiceNoteBubble';

interface VoiceReportsAdminViewProps {
  onOpenDriverModal?: () => void;
}

export const VoiceReportsAdminView: React.FC<VoiceReportsAdminViewProps> = ({ onOpenDriverModal }) => {
  // State
  const [reports, setReports] = useState<VoiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalReports: 0,
    pendingCount: 0,
    approvedCount: 0,
    totalApprovedSAR: 0
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [languageFilter, setLanguageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Report for Details / Action Modal
  const [selectedReport, setSelectedReport] = useState<VoiceReport | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields
  const [editDestination, setEditDestination] = useState('');
  const [editExpenses, setEditExpenses] = useState<ExtractedExpense[]>([]);
  const [editNotes, setEditNotes] = useState('');

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Executive AI Summary
  const [fleetSummary, setFleetSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Audio Playback & Voice TTS
  const [playingReportId, setPlayingReportId] = useState<string | null>(null);
  const [speakingReportId, setSpeakingReportId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Fetch Reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (languageFilter !== 'ALL') params.append('language', languageFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/voice-reports?${params.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching voice reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI Fleet Summary
  const fetchFleetSummary = async () => {
    try {
      setSummaryLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/voice-reports/fleet-summary', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setFleetSummary(data.summary);
      }
    } catch (e) {
      console.warn('Failed to fetch fleet summary:', e);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, languageFilter]);

  useEffect(() => {
    fetchFleetSummary();
  }, []);

  // Handle Audio Playback (Streams stored audio or synthetic radio track)
  const togglePlayAudio = (report: VoiceReport) => {
    if (audioService.isSpeaking()) {
      audioService.stopSpeaking();
      setSpeakingReportId(null);
    }

    if (playingReportId === report.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingReportId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audioUrl = report.audioFileUrl || `/api/voice-reports/${report.id}/audio`;
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;

    setPlayingReportId(report.id);

    audio.play().then(() => {
      audio.onended = () => {
        setPlayingReportId(null);
      };
    }).catch(err => {
      console.warn('Audio playback note, playing voice summary via browser speech engine:', err);
      setPlayingReportId(null);
      toggleSpeakSummary(report);
    });
  };

  // Handle AI Executive Voice Reading Aloud
  const toggleSpeakSummary = (report: VoiceReport) => {
    if (audioPlayerRef.current && playingReportId) {
      audioPlayerRef.current.pause();
      setPlayingReportId(null);
    }

    if (speakingReportId === report.id || audioService.isSpeaking()) {
      audioService.stopSpeaking();
      setSpeakingReportId(null);
      return;
    }

    setSpeakingReportId(report.id);
    audioService.speakReportSummary(
      report,
      report.language === 'en' ? 'en' : 'ar',
      () => setSpeakingReportId(report.id),
      () => setSpeakingReportId(null)
    );
  };

  // Open Details Modal
  const handleOpenDetails = (report: VoiceReport) => {
    setSelectedReport(report);
    setEditDestination(report.aiExtraction.destination?.name || '');
    setEditExpenses(report.aiExtraction.expenses || []);
    setEditNotes('');
    setIsEditing(false);
    setDetailModalOpen(true);
  };

  // Save Admin Edits
  const handleSaveEdits = async () => {
    if (!selectedReport) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/voice-reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          aiExtraction: {
            ...selectedReport.aiExtraction,
            destination: editDestination ? { ...selectedReport.aiExtraction.destination, name: editDestination } : null,
            expenses: editExpenses
          },
          notes: editNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setSelectedReport(data.report);
        setIsEditing(false);
        fetchReports();
      }
    } catch (err) {
      alert('Error updating report');
    }
  };

  // Approve Report
  const handleApproveReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/voice-reports/${reportId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          notes: 'Approved by Fleet Management via Voice Assistant Dashboard'
        })
      });

      const data = await res.json();
      if (data.success) {
        setDetailModalOpen(false);
        fetchReports();
        fetchFleetSummary();
      } else {
        alert(data.error || 'Failed to approve report');
      }
    } catch (err) {
      alert('Error approving report');
    }
  };

  // Reject Report
  const handleRejectReport = async () => {
    if (!selectedReport || !rejectReason.trim()) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/voice-reports/${selectedReport.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      const data = await res.json();
      if (data.success) {
        setRejectModalOpen(false);
        setDetailModalOpen(false);
        setRejectReason('');
        fetchReports();
      }
    } catch (err) {
      alert('Error rejecting report');
    }
  };

  // AI Reprocess
  const handleReprocess = async (reportId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/voice-reports/${reportId}/reprocess`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport(data.report);
        }
        fetchReports();
      }
    } catch (e) {
      alert('Error reprocessing audio');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Report ID', 'Driver Name', 'Vehicle Plate', 'Language', 'Destination', 'Total SAR', 'Fuel SAR', 'Other SAR', 'Confidence', 'Status', 'Date'];
    const rows = reports.map(r => [
      r.id,
      `"${r.driverName}"`,
      r.vehiclePlate,
      r.language.toUpperCase(),
      `"${r.aiExtraction.destination?.name || 'N/A'}"`,
      r.aiExtraction.totalExpense,
      r.aiExtraction.fuelExpense || 0,
      r.aiExtraction.otherExpense || 0,
      `${((r.aiConfidence || 0.9) * 100).toFixed(0)}%`,
      r.reviewStatus,
      (r.createdAt ? String(r.createdAt).split('T')[0] : '')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `voice_reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLanguageBadge = (lang: string) => {
    switch (lang) {
      case 'ar':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">🇸🇦 Arabic</span>;
      case 'ps':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">🇦🇫 Pashto</span>;
      case 'ur':
        return <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">🇵🇰 Urdu</span>;
      case 'en':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">🇬🇧 English</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs font-semibold">{lang}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'EDITED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-xs font-semibold">
            <Edit2 className="w-3 h-3" /> Edited
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-semibold">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                AI Voice Reports & Logs
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Multilingual Gemini Engine
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Driver speech-to-text, destination matching & expense ledger verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchReports}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
          </button>

          {onOpenDriverModal && (
            <button
              onClick={onOpenDriverModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all transform active:scale-95"
            >
              <Mic className="w-4 h-4" /> Driver Voice Assistant (Mobile)
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Voice Reports</span>
            <Mic className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{metrics.totalReports}</p>
          <p className="text-[11px] text-slate-400">All driver voice logs recorded</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono">{metrics.pendingCount}</p>
          <p className="text-[11px] text-slate-400">Awaiting administrator approval</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>Approved Reports</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">{metrics.approvedCount}</p>
          <p className="text-[11px] text-slate-400">Converted to official ledger trips</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Approved Expenses</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {metrics.totalApprovedSAR.toLocaleString()} SAR
          </p>
          <p className="text-[11px] text-slate-400">Total validated driver claims</p>
        </div>
      </div>

      {/* Executive AI Operations Summary Digest */}
      {fleetSummary && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse" /> Executive AI Fleet Voice Operations Digest
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Today's Dispatch Activity</span>
          </div>
          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            {fleetSummary}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
            placeholder="Search report ID, driver, vehicle plate, destination, transcription..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'PENDING' ? 'Pending' : st === 'APPROVED' ? 'Approved' : 'Rejected'}
              </button>
            ))}
          </div>

          {/* Language filter */}
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Languages</option>
            <option value="ar">🇸🇦 Arabic</option>
            <option value="ps">🇦🇫 Pashto</option>
            <option value="ur">🇵🇰 Urdu</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
      </div>

      {/* Reports Table / Card List */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Loading voice reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Mic className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No voice reports found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Drivers can record voice messages using the Driver Voice Assistant. Click below to test.
            </p>
            {onOpenDriverModal && (
              <button
                onClick={onOpenDriverModal}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Mic className="w-4 h-4" /> Open Voice Assistant
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Report ID & Audio</th>
                  <th className="py-3 px-4">Driver & Vehicle</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Expenses Breakdown</th>
                  <th className="py-3 px-4">Backend Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Report ID & WhatsApp Voice Note Player */}
                    <td className="py-3 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">{report.id}</span>
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-[#005c4b]/40 text-[#25D366] border border-[#00a884]/40 flex items-center gap-1">
                            <Mic className="w-2.5 h-2.5" />
                            WhatsApp Note
                          </span>
                        </div>

                        {/* Compact WhatsApp Voice Note Bubble */}
                        <WhatsAppVoiceNoteBubble
                          reportId={report.id}
                          audioUrl={report.audioFileUrl || `/api/voice-reports/${report.id}/audio`}
                          driverName={report.driverName}
                          driverEmployeeId={report.driverEmployeeId}
                          language={report.language}
                          durationSeconds={report.audioDurationSeconds || 12}
                          transcription={report.transcription}
                          compact={true}
                        />
                      </div>
                    </td>

                    {/* Driver & Vehicle */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{report.driverName}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Truck className="w-3 h-3 text-amber-400" />
                        <span className="font-mono">{report.vehiclePlate}</span>
                        <span className="text-slate-600">({report.vehicleInternalId})</span>
                      </div>
                    </td>

                    {/* Language & AI Confidence */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {getLanguageBadge(report.language)}
                        <div className="text-[11px] text-slate-400 font-mono">
                          {((report.aiConfidence || 0.95) * 100).toFixed(0)}% AI Conf.
                        </div>
                      </div>
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{report.aiExtraction.destination?.name || 'N/A'}</span>
                      </div>
                      {report.aiExtraction.destination?.matchedLocationName && (
                        <span className="text-[11px] text-amber-400/80 block line-clamp-1">
                          Matched: {report.aiExtraction.destination.matchedLocationName}
                        </span>
                      )}
                    </td>

                    {/* Expenses Breakdown */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {report.aiExtraction.expenses.map((exp, i) => (
                          <div key={i} className="text-xs text-slate-300 flex items-center gap-1">
                            <span className="text-slate-400 font-semibold">{exp.category}:</span>
                            <span className="text-emerald-400 font-mono">{exp.amount} SAR</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Backend Total */}
                    <td className="py-3 px-4">
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {report.aiExtraction.totalExpense.toLocaleString()} SAR
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(report.reviewStatus)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(report)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" /> Review
                        </button>

                        {report.reviewStatus === 'PENDING' && (
                          <button
                            onClick={() => handleApproveReport(report.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Quick Approve"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL & AUDIT MODAL */}
      {detailModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-white">Voice Report #{selectedReport.id}</h2>
                    {getStatusBadge(selectedReport.reviewStatus)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Logged by {selectedReport.driverName} on {(selectedReport.createdAt ? String(selectedReport.createdAt).split('T')[0] : 'N/A')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuditModalOpen(!auditModalOpen)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" /> Audit Trail ({selectedReport.auditHistory?.length || 0})
                </button>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Authentic WhatsApp Voice Note Player */}
              <WhatsAppVoiceNoteBubble
                reportId={selectedReport.id}
                audioUrl={selectedReport.audioFileUrl || `/api/voice-reports/${selectedReport.id}/audio`}
                driverName={selectedReport.driverName}
                driverEmployeeId={selectedReport.driverEmployeeId}
                language={selectedReport.language}
                durationSeconds={selectedReport.audioDurationSeconds || 15}
                transcription={selectedReport.transcription}
                normalizedEnglish={selectedReport.normalizedText}
                timestamp={selectedReport.createdAt}
                vehiclePlate={selectedReport.vehiclePlate}
                vehicleInternalId={selectedReport.vehicleInternalId}
                showTranscription={false}
              />

              {/* Read Aloud AI Voice Summary Option */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSpeakSummary(selectedReport)}
                    className={`h-9 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all shadow ${
                      speakingReportId === selectedReport.id
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 animate-pulse'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                    }`}
                    title="Read AI Executive Voice Report aloud"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${speakingReportId === selectedReport.id ? 'text-white' : 'text-emerald-400'}`} />
                    <span>{speakingReportId === selectedReport.id ? 'Speaking AI Summary...' : 'Play AI Translated Summary'}</span>
                  </button>
                  <span className="text-xs text-slate-400">Read in English for fleet managers & dispatchers</span>
                </div>
                {getLanguageBadge(selectedReport.language)}
              </div>

              {/* Transcription & Translation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Spoken Transcription ({selectedReport.language.toUpperCase()})
                  </span>
                  <p className="text-sm font-medium text-slate-200 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    "{selectedReport.transcription}"
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Normalized English Translation
                  </span>
                  <p className="text-sm font-medium text-slate-300 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    "{selectedReport.normalizedText}"
                  </p>
                </div>
              </div>

              {/* Extraction Details (With inline editing toggle) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Extracted Structured Ledger Values
                  </span>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> {isEditing ? 'Cancel Edit' : 'Edit Values'}
                  </button>
                </div>

                {/* Destination */}
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Destination Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editDestination}
                      onChange={(e) => setEditDestination(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  ) : (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm">
                      <span className="font-semibold text-white">
                        {selectedReport.aiExtraction.destination?.name || 'N/A'}
                      </span>
                      {selectedReport.aiExtraction.destination?.matchedLocationName && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Matched Hub: {selectedReport.aiExtraction.destination.matchedLocationName}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expenses List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 font-medium">Expenses Breakdown</label>
                    {isEditing && (
                      <button
                        onClick={() => setEditExpenses([...editExpenses, { category: 'OTHER', amount: 50, currency: 'SAR', confidence: 1.0 }])}
                        className="text-xs text-emerald-400 flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Expense
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {editExpenses.map((exp, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        {isEditing ? (
                          <>
                            <select
                              value={exp.category}
                              onChange={(e) => {
                                const arr = [...editExpenses];
                                arr[idx].category = e.target.value as any;
                                setEditExpenses(arr);
                              }}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                            >
                              <option value="FUEL">FUEL (ديزل / بنزين)</option>
                              <option value="LOADING">LOADING (تحميل / تنزيل)</option>
                              <option value="PARKING">PARKING (مواقف)</option>
                              <option value="MAINTENANCE">MAINTENANCE (صيانة)</option>
                              <option value="TOLL">TOLL (رسوم طريق)</option>
                              <option value="OTHER">OTHER (أخرى)</option>
                            </select>
                            <input
                              type="number"
                              value={exp.amount}
                              onChange={(e) => {
                                const arr = [...editExpenses];
                                arr[idx].amount = parseFloat(e.target.value) || 0;
                                setEditExpenses(arr);
                              }}
                              className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={exp.description || ''}
                              onChange={(e) => {
                                const arr = [...editExpenses];
                                arr[idx].description = e.target.value;
                                setEditExpenses(arr);
                              }}
                              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                              placeholder="Description"
                            />
                            <button
                              onClick={() => setEditExpenses(editExpenses.filter((_, i) => i !== idx))}
                              className="text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-amber-400 w-28 uppercase">{exp.category}</span>
                            <span className="flex-1 text-slate-300">{exp.description || `${exp.category} expense`}</span>
                            <span className="font-bold text-emerald-400 text-sm font-mono">{exp.amount.toLocaleString()} SAR</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {isEditing && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleSaveEdits}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                      >
                        Save Corrections
                      </button>
                    </div>
                  )}

                  {/* Backend Total */}
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between font-bold">
                    <span className="text-xs text-slate-300">Backend Verified Total Sum:</span>
                    <span className="text-base text-emerald-400 font-mono">
                      {selectedReport.aiExtraction.totalExpense.toLocaleString()} SAR
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Timeline Drawer View */}
              {auditModalOpen && selectedReport.auditHistory && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Comprehensive Audit Trail History
                  </h3>
                  <div className="space-y-2">
                    {selectedReport.auditHistory.map((aud, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-semibold text-white">{aud.action}</span>
                          <span className="text-[11px] font-mono">{new Date(aud.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300">{aud.details}</p>
                        <div className="text-[11px] text-slate-500">
                          Actor: {aud.actorName} ({aud.actorRole})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => handleReprocess(selectedReport.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Reprocess AI
              </button>

              <div className="flex items-center gap-2">
                {selectedReport.reviewStatus !== 'REJECTED' && (
                  <button
                    onClick={() => setRejectModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject Report
                  </button>
                )}

                {selectedReport.reviewStatus !== 'APPROVED' && (
                  <button
                    onClick={() => handleApproveReport(selectedReport.id)}
                    className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all transform active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Register Official Records
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Reject Voice Report #{selectedReport?.id}
            </h3>
            <p className="text-xs text-slate-400">
              Provide a clear reason for the driver explaining why this voice report was rejected.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Fuel receipt voucher missing, or destination not matching daily dispatch schedule."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectReport}
                disabled={!rejectReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
