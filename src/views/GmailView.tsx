import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  Trash2,
  Inbox,
  AlertCircle,
  FileText,
  Clock,
  User,
  LogOut,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useGoogleWorkspace } from '../context/GoogleWorkspaceContext';
import { GoogleSignInButton } from '../components/workspace/GoogleSignInButton';
import {
  listGmailMessages,
  getGmailMessageDetail,
  sendGmailMessage,
  trashGmailMessage,
  GmailMessageSummary,
  GmailMessageDetail
} from '../services/gmailApi';
import { WorkspaceConfirmDialog } from '../components/workspace/WorkspaceConfirmDialog';

interface FleetTemplate {
  name: string;
  subject: string;
  body: string;
}

const FLEET_TEMPLATES: FleetTemplate[] = [
  {
    name: 'Iqama Renewal Reminder (Saudi HR)',
    subject: 'Urgent: Iqama Renewal Notice - Saudi Compliance Deadline',
    body: `Dear Team Member,\n\nThis is an official notice regarding your Saudi Resident Identity (Iqama). Our fleet compliance records show that your Iqama document is approaching expiration.\n\nPlease provide your updated digital renewal confirmation or visit the HR Operations Department within 3 business days to finalize government processing via Qiwa and Muqeem platforms.\n\nBest regards,\nFleet & Workforce HR Operations\nKingdom of Saudi Arabia`
  },
  {
    name: 'Periodic Vehicle Inspection (MVPI) Due',
    subject: 'Action Required: Periodic Vehicle Inspection (Fahas/MVPI) Scheduled',
    body: `Dear Driver,\n\nYour assigned vehicle is due for mandatory periodic vehicle inspection (MVPI / الفحص الدوري).\n\nPlease report to the authorized inspection center this week. Retain the receipt and inspection slip for upload into the Fleet Management System.\n\nThank you for ensuring road safety and ZATCA/TGA compliance.\n\nFleet Maintenance & Operations`
  },
  {
    name: 'Logistics Dispatch & Waybill Dispatch',
    subject: 'Logistics Dispatch Briefing: Cargo Waybill & Designated Corridor',
    body: `Driver Dispatch Team,\n\nYour inter-city logistics route has been scheduled on the designated transport corridor. Ensure your digital Bayan (بيان) waybill is verified prior to departure.\n\nDrive within regulated speed limits and ensure pre-trip safety checklist is completed.\n\nCentral Fleet Dispatch`
  }
];

export const GmailView: React.FC = () => {
  const { user, accessToken, isAuthenticated, isLoading: authLoading, signIn, signOut } = useGoogleWorkspace();

  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Selected message for detail view
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messageDetail, setMessageDetail] = useState<GmailMessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeCc, setComposeCc] = useState('');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'SEND_EMAIL' | 'TRASH_EMAIL';
    title: string;
    description: string;
    details?: { label: string; value: string | React.ReactNode }[];
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    type: 'SEND_EMAIL',
    title: '',
    description: '',
    onConfirm: () => {}
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Load Messages
  const loadMessages = useCallback(async (query: string = '') => {
    if (!accessToken) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await listGmailMessages(accessToken, query, 20);
      setMessages(data);
    } catch (err: any) {
      console.error('Error fetching Gmail messages:', err);
      setError(err.message || 'Failed to fetch messages from Gmail');
    } finally {
      setLoadingMessages(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadMessages();
    }
  }, [isAuthenticated, accessToken, loadMessages]);

  // Load Message Detail
  const handleOpenMessage = async (id: string) => {
    if (!accessToken) return;
    setSelectedMessageId(id);
    setLoadingDetail(true);
    try {
      const detail = await getGmailMessageDetail(accessToken, id);
      setMessageDetail(detail);
      // Mark as read locally in summary
      setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
    } catch (err: any) {
      console.error('Error loading message detail:', err);
      setError(err.message || 'Failed to read email details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Compose Form Template Select
  const handleSelectTemplate = (template: FleetTemplate) => {
    setComposeSubject(template.subject);
    setComposeBody(template.body);
  };

  // Submit Send (prompts mandatory confirmation dialog)
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setError('Please provide recipient email, subject, and body.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'SEND_EMAIL',
      title: 'Confirm Send Email via Gmail',
      description: 'You are about to send an email on your behalf using your connected Gmail account.',
      isDestructive: false,
      details: [
        { label: 'Recipient', value: composeTo },
        { label: 'Subject', value: composeSubject },
        ...(composeCc ? [{ label: 'CC', value: composeCc }] : []),
        { label: 'Message Preview', value: composeBody.slice(0, 140) + (composeBody.length > 140 ? '...' : '') }
      ],
      onConfirm: async () => {
        if (!accessToken) return;
        setActionLoading(true);
        try {
          await sendGmailMessage(accessToken, {
            to: composeTo.trim(),
            subject: composeSubject.trim(),
            body: composeBody.trim(),
            cc: composeCc.trim() || undefined
          });
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          setIsComposeOpen(false);
          setComposeTo('');
          setComposeSubject('');
          setComposeBody('');
          setComposeCc('');
          loadMessages(searchQuery);
        } catch (err: any) {
          setError(err.message || 'Failed to send email');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Trash Message (prompts mandatory confirmation dialog)
  const handleInitiateTrash = (msg: GmailMessageSummary | GmailMessageDetail) => {
    setConfirmDialog({
      isOpen: true,
      type: 'TRASH_EMAIL',
      title: 'Move Email to Trash',
      description: 'Are you sure you want to move this email to your Gmail Trash folder?',
      isDestructive: true,
      details: [
        { label: 'Subject', value: msg.subject },
        { label: 'Sender', value: msg.from },
        { label: 'Date', value: msg.date }
      ],
      onConfirm: async () => {
        if (!accessToken) return;
        setActionLoading(true);
        try {
          await trashGmailMessage(accessToken, msg.id);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          if (selectedMessageId === msg.id) {
            setSelectedMessageId(null);
            setMessageDetail(null);
          }
          setMessages(prev => prev.filter(m => m.id !== msg.id));
        } catch (err: any) {
          setError(err.message || 'Failed to move email to trash');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Not Connected State
  if (!isAuthenticated) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Connect Gmail to Fleet & Workforce Operations
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
            Link your official Google Workspace account to read dispatch communications, send Iqama renewal alerts to drivers, and dispatch vehicle maintenance orders directly from this platform with authenticated user permissions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GoogleSignInButton
              onClick={signIn}
              loading={authLoading}
              text="Connect Gmail Account"
            />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 max-w-lg mx-auto text-left">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Included Google Workspace Capabilities:
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Read dispatch and vendor emails with encrypted in-memory tokens</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Compose and dispatch fleet notices with explicit confirmation dialogs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Search mailbox for vehicle plates, supplier invoices, or driver Iqama numbers</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Gmail Dispatch & Operations
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Connected as <span className="font-semibold text-slate-700">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs shadow-blue-600/20 flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose Email</span>
          </button>

          <button
            type="button"
            onClick={() => loadMessages(searchQuery)}
            disabled={loadingMessages}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs transition-colors"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={signOut}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Disconnect Google Account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </div>

      {/* Error Message Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Mail Grid: Left Inbox List, Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Messages List Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[650px]">
          {/* Search Header */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70">
            <form
              onSubmit={e => {
                e.preventDefault();
                loadMessages(searchQuery);
              }}
              className="relative"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search emails (e.g. Iqama, inspection, from:...)"
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    loadMessages('');
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingMessages && messages.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Loading messages from Gmail...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">No emails found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try adjusting your search query or refreshing.
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isSelected = selectedMessageId === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleOpenMessage(msg.id)}
                    className={`p-3.5 cursor-pointer transition-colors text-left flex items-start gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-1">
                      {msg.unread ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-xs truncate ${msg.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {msg.from || 'Unknown Sender'}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {msg.date ? new Date(msg.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                      <div className={`text-xs truncate mb-1 ${msg.unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {msg.subject}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {msg.snippet}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message Preview Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs h-[650px] flex flex-col overflow-hidden">
          {selectedMessageId && messageDetail ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Detail Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {messageDetail.subject}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInitiateTrash(messageDetail)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Move to Trash (Requires Confirmation)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMessageId(null);
                        setMessageDetail(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400 w-12">From:</span>
                    <span className="text-slate-800 font-medium">{messageDetail.from}</span>
                  </div>
                  {messageDetail.to && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-400 w-12">To:</span>
                      <span>{messageDetail.to}</span>
                    </div>
                  )}
                  {messageDetail.date && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-400 w-12">Date:</span>
                      <span>{messageDetail.date}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Body */}
              <div className="flex-1 p-6 overflow-y-auto bg-white text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                {messageDetail.bodyText}
              </div>

              {/* Reply / Quick Action Footer */}
              <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  ID: {messageDetail.id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Pre-fill compose
                    const replyTo = messageDetail.from.match(/<([^>]+)>/)?.[1] || messageDetail.from;
                    setComposeTo(replyTo);
                    setComposeSubject(`Re: ${messageDetail.subject.replace(/^Re:\s*/i, '')}`);
                    setComposeBody(`\n\n--- On ${messageDetail.date}, ${messageDetail.from} wrote ---\n> ${messageDetail.bodyText.slice(0, 300)}...`);
                    setIsComposeOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Reading email content...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
              <div>
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-slate-600">Select an email to view</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Click on any message from the left inbox column to inspect full details or reply.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Compose Dispatch Email
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selector Bar */}
            <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Fleet Templates:
              </span>
              {FLEET_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-medium transition-colors shadow-2xs"
                >
                  {tmpl.name}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleInitiateSend} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  To (Recipient Email) *
                </label>
                <input
                  type="email"
                  required
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  placeholder="driver@company.com or vendor@workshop.sa"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CC (Optional)
                </label>
                <input
                  type="text"
                  value={composeCc}
                  onChange={e => setComposeCc(e.target.value)}
                  placeholder="manager@company.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  placeholder="e.g. Periodic Maintenance Inspection or Iqama Renewal"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Body *
                </label>
                <textarea
                  required
                  rows={8}
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  placeholder="Write message details..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs shadow-blue-600/20 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Review & Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog */}
      <WorkspaceConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
        description={confirmDialog.description}
        details={confirmDialog.details}
        isDestructive={confirmDialog.isDestructive}
        isLoading={actionLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
