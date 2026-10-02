import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  AlertCircle,
  Users,
  ShieldCheck,
  LogOut,
  X,
  Sparkles,
  Bot,
  User,
  Clock,
  Radio,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { useGoogleWorkspace } from '../context/GoogleWorkspaceContext';
import { GoogleSignInButton } from '../components/workspace/GoogleSignInButton';
import {
  fetchChatSpaces,
  createChatSpace,
  fetchChatMessages,
  sendChatMessage,
  ChatSpace,
  ChatMessage
} from '../services/chatApi';
import { WorkspaceConfirmDialog } from '../components/workspace/WorkspaceConfirmDialog';

interface DispatchBroadcast {
  label: string;
  text: string;
}

const DISPATCH_BROADCASTS: DispatchBroadcast[] = [
  {
    label: 'Sandstorm & Low Visibility Advisory',
    text: '[FLEET DISPATCH ADVISORY]: Extreme weather / sandstorm warning across Central Province corridors. All drivers are instructed to reduce speeds, turn on fog lights, and pull over at nearest SASCO service station if visibility drops below 200m.'
  },
  {
    label: 'Riyadh Ring Road Heavy Congestion',
    text: '[TRAFFIC NOTICE]: Major construction delay on Northern Ring Road exit 6. Dispatchers advise rerouting through King Salman Road or Eastern Ring Road for scheduled freight drop-offs.'
  },
  {
    label: 'Bayan Waybill Regulatory Inspection Reminder',
    text: '[COMPLIANCE DISPATCH]: Transport General Authority (TGA) checkpoint inspections active along Highway 40. Verify your digital Bayan (بيان) manifest and vehicle MVPI certificate are accessible on your device.'
  }
];

export const GoogleChatView: React.FC = () => {
  const { user, accessToken, isAuthenticated, isLoading: authLoading, signIn, signOut } = useGoogleWorkspace();

  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message compose input
  const [messageText, setMessageText] = useState('');

  // New Space Modal
  const [isNewSpaceOpen, setIsNewSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'SEND_CHAT' | 'CREATE_SPACE';
    title: string;
    description: string;
    details?: { label: string; value: string | React.ReactNode }[];
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    type: 'SEND_CHAT',
    title: '',
    description: '',
    onConfirm: () => {}
  });
  const [actionLoading, setActionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load Spaces
  const loadSpaces = useCallback(async () => {
    if (!accessToken) return;
    setLoadingSpaces(true);
    setError(null);
    try {
      const data = await fetchChatSpaces(accessToken);
      setSpaces(data);
      if (data.length > 0 && !selectedSpace) {
        setSelectedSpace(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching Google Chat spaces:', err);
      setError(err.message || 'Failed to load Google Chat spaces');
    } finally {
      setLoadingSpaces(false);
    }
  }, [accessToken, selectedSpace]);

  // Load Messages for selected space
  const loadMessagesForSpace = useCallback(async (spaceName: string) => {
    if (!accessToken || !spaceName) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const msgs = await fetchChatMessages(accessToken, spaceName);
      setMessages(msgs);
    } catch (err: any) {
      console.error('Error fetching messages for space:', err);
      setError(err.message || 'Failed to load chat messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadSpaces();
    }
  }, [isAuthenticated, accessToken, loadSpaces]);

  useEffect(() => {
    if (selectedSpace && accessToken) {
      loadMessagesForSpace(selectedSpace.name);
    }
  }, [selectedSpace, accessToken, loadMessagesForSpace]);

  // Initiate send message (prompts mandatory confirmation dialog)
  const handleInitiateSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !selectedSpace) return;

    const spaceTitle = selectedSpace.displayName || selectedSpace.name;

    setConfirmDialog({
      isOpen: true,
      type: 'SEND_CHAT',
      title: 'Confirm Send Google Chat Message',
      description: `You are about to post a message into Google Chat Space "${spaceTitle}".`,
      isDestructive: false,
      details: [
        { label: 'Space', value: spaceTitle },
        { label: 'Message', value: messageText.trim() }
      ],
      onConfirm: async () => {
        if (!accessToken || !selectedSpace) return;
        setActionLoading(true);
        try {
          await sendChatMessage(accessToken, selectedSpace.name, messageText.trim());
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          setMessageText('');
          loadMessagesForSpace(selectedSpace.name);
        } catch (err: any) {
          setError(err.message || 'Failed to send chat message');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Create New Space
  const handleInitiateCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;

    setConfirmDialog({
      isOpen: true,
      type: 'CREATE_SPACE',
      title: 'Create New Google Chat Space',
      description: 'You are creating a new collaborative space in your Google Workspace domain.',
      details: [
        { label: 'Space Name', value: newSpaceName.trim() }
      ],
      onConfirm: async () => {
        if (!accessToken) return;
        setActionLoading(true);
        try {
          const created = await createChatSpace(accessToken, newSpaceName.trim());
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          setIsNewSpaceOpen(false);
          setNewSpaceName('');
          setSpaces(prev => [created, ...prev]);
          setSelectedSpace(created);
        } catch (err: any) {
          setError(err.message || 'Failed to create Chat space');
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
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Google Chat Fleet Spaces & Instant Dispatch
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
            Connect your official Google Workspace to broadcast route warnings, sandstorm advisories, and inter-city dispatch notices directly to Google Chat spaces and driver teams with enterprise auditability.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GoogleSignInButton
              onClick={signIn}
              loading={authLoading}
              text="Connect Google Chat"
            />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 max-w-lg mx-auto text-left">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Google Chat Features:
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Browse and join team chat spaces in real-time</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>One-click fleet emergency broadcasts (weather, accidents, checkpoints)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Audited client-side tokens ensuring secure Google Workspace communications</span>
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
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Google Chat Spaces
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Operating as <span className="font-semibold text-slate-700">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewSpaceOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold transition-all shadow-xs shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Space</span>
          </button>

          <button
            type="button"
            onClick={() => {
              loadSpaces();
              if (selectedSpace) loadMessagesForSpace(selectedSpace.name);
            }}
            disabled={loadingSpaces || loadingMessages}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs transition-colors"
            title="Refresh Chat"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSpaces || loadingMessages ? 'animate-spin' : ''}`} />
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

      {/* Error Message */}
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

      {/* Main Chat Layout: Left Spaces List, Right Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Spaces Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs h-[650px] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chat Spaces ({spaces.length})
            </span>
            <button
              type="button"
              onClick={() => setIsNewSpaceOpen(true)}
              className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Create new Space"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingSpaces && spaces.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Loading Google Chat spaces...</p>
              </div>
            ) : spaces.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">No Chat spaces found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click "Create Space" above to start your first fleet operations channel.
                </p>
              </div>
            ) : (
              spaces.map(space => {
                const isSelected = selectedSpace?.name === space.name;
                const displayName = space.displayName || space.name.replace('spaces/', 'Space #');
                return (
                  <div
                    key={space.name}
                    onClick={() => setSelectedSpace(space)}
                    className={`p-3.5 cursor-pointer transition-colors text-left flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {displayName}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {space.spaceType || 'SPACE'} • {(space.name && typeof space.name === 'string' ? space.name.split('/')[1] : '') || ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Conversation Thread */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs h-[650px] flex flex-col overflow-hidden">
          {selectedSpace ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Space Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {(selectedSpace.displayName || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {selectedSpace.displayName || selectedSpace.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Google Workspace Active Channel • {selectedSpace.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadMessagesForSpace(selectedSpace.name)}
                    disabled={loadingMessages}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60"
                    title="Refresh Thread"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Fast Dispatch Quick-Pills Bar */}
              <div className="px-4 py-2 bg-indigo-50/40 border-b border-indigo-100 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                <span className="text-[10px] font-bold text-indigo-900 flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-indigo-600" /> Broadcast:
                </span>
                {DISPATCH_BROADCASTS.map((broadcast, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMessageText(broadcast.text);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-medium whitespace-nowrap transition-colors shadow-2xs"
                  >
                    {broadcast.label}
                  </button>
                ))}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/30">
                {loadingMessages && messages.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Loading messages from Google Chat...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold text-slate-600">No messages in this space yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Post a broadcast or announcement to start the team conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isCurrentUser = msg.sender?.name?.includes(user?.uid || '') || false;
                    const senderName = msg.sender?.displayName || msg.sender?.name?.split('/')[1] || 'Workspace Member';
                    const timeStr = msg.createTime ? new Date(msg.createTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div
                        key={msg.name || index}
                        className="flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                          {msg.sender?.avatarUrl ? (
                            <img
                              src={msg.sender.avatarUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            senderName.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0 max-w-2xl">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-900">
                              {senderName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {timeStr}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed shadow-2xs break-words">
                            {msg.text || msg.formattedText || ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <form onSubmit={handleInitiateSendMessage} className="p-3.5 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder={`Message #${selectedSpace.displayName || 'space'}...`}
                    className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold transition-all shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
              <div>
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-slate-600">Select a Chat Space</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Choose a channel from the left sidebar or create a new space to communicate with your fleet teams.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Space Modal */}
      {isNewSpaceOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Create Google Chat Space
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSpaceOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateCreateSpace} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Space Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSpaceName}
                  onChange={e => setNewSpaceName(e.target.value)}
                  placeholder="e.g. Central Dispatch - Riyadh Hub or Driver Support"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSpaceOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Review & Create Space
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
