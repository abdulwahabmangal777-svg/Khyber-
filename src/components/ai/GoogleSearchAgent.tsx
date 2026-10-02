import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Send,
  Copy,
  Check,
  Newspaper,
  MessageSquare,
  Scale,
  Compass,
  ArrowRight,
  TrendingUp,
  Clock,
  Share2,
  Trash2,
  ChevronDown,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type AgentMode = 'chat' | 'news' | 'fact_check' | 'regulatory';

export interface GroundedSource {
  title: string;
  url: string;
  domain?: string;
}

export interface FactCheckVerdict {
  verdict: 'VERIFIED_TRUE' | 'PARTIALLY_TRUE' | 'DEBUNKED_FALSE' | 'INCONCLUSIVE';
  verdictLabel: string;
  confidence: number;
  claim: string;
  evidencePoints: string[];
  consensusSummary: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  mode: AgentMode;
  timestamp: string;
  sources?: GroundedSource[];
  searchQueries?: string[];
  provider?: string;
  factCheck?: FactCheckVerdict;
}

interface TrendItem {
  id: string;
  title: string;
  query: string;
  category?: string;
}

interface FactCheckClaim {
  id: string;
  claim: string;
  expectedVerdict: string;
  query: string;
}

interface GoogleSearchAgentProps {
  initialMode?: AgentMode;
  className?: string;
  compact?: boolean;
}

export const GoogleSearchAgent: React.FC<GoogleSearchAgentProps> = ({
  initialMode = 'chat',
  className = '',
  compact = false
}) => {
  const { language } = useLanguage();
  const [mode, setMode] = useState<AgentMode>(initialMode);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQueriesFor, setShowQueriesFor] = useState<string | null>(null);

  // Search Trends & Presets
  const [currentEvents, setCurrentEvents] = useState<TrendItem[]>([
    {
      id: 'ev-1',
      title: 'Saudi Landbridge & Rail Corridors',
      query: 'Latest updates on Saudi Landbridge project connecting Jeddah and Dammam ports via Riyadh',
      category: 'Infrastructure'
    },
    {
      id: 'ev-2',
      title: 'Red Sea Maritime Shipping Routes',
      query: 'Current status of Red Sea container shipping routes, Bab-el-Mandeb, and overland freight corridors',
      category: 'Global Trade'
    },
    {
      id: 'ev-3',
      title: 'Saudi Vision 2030 Special Economic Zones',
      query: 'What are the latest developments in Saudi Special Economic Zones and National Transport Strategy?',
      category: 'Vision 2030'
    },
    {
      id: 'ev-4',
      title: 'Global Energy Markets & OPEC+ Policies',
      query: 'Latest OPEC+ crude oil production decisions and global diesel fuel price trends',
      category: 'Energy & Fuel'
    }
  ]);

  const [factCheckClaims, setFactCheckClaims] = useState<FactCheckClaim[]>([
    {
      id: 'fc-1',
      claim: 'Saudi Arabia eliminated all domestic diesel fuel subsidies this year',
      expectedVerdict: 'DEBUNKED_FALSE',
      query: 'Fact check: Did Saudi Arabia eliminate all diesel fuel subsidies in 2026?'
    },
    {
      id: 'fc-2',
      claim: 'Najm requires a police officer to attend minor vehicle collisions',
      expectedVerdict: 'DEBUNKED_FALSE',
      query: 'Fact check: Does Najm require a police officer present for minor vehicle accidents in Saudi Arabia?'
    },
    {
      id: 'fc-3',
      claim: 'Commercial trucks are banned 24/7 on all highways in Riyadh',
      expectedVerdict: 'PARTIALLY_TRUE',
      query: 'Fact check: Are heavy commercial trucks banned 24/7 on all highways in Riyadh?'
    },
    {
      id: 'fc-4',
      claim: 'Electronic Bayan waybill is mandatory for all freight carriers',
      expectedVerdict: 'VERIFIED_TRUE',
      query: 'Fact check: Is the electronic Bayan waybill mandatory for commercial freight transport in Saudi Arabia?'
    }
  ]);

  // Initial welcome message
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome-1',
      role: 'agent',
      content: `**Welcome to the Real-Time Google Search Intelligence Agent.**

I am connected directly to **live Google Search results** powered by \`gemini-3.8-flash\`. I can:
- 🌐 **Discuss Current Events**: Get up-to-the-minute briefings on global and Middle Eastern developments, logistics, geopolitics, and energy markets.
- 📰 **Cite Recent News**: Explore breaking news with verifiable hyperlinks, publisher names, and publication dates.
- ⚖️ **Fact-Check Claims**: Submit any news headline, statistic, or viral rumor. I will cross-reference live sources to give you an authoritative **Verdict Badge**, key evidence points, and source citations.

Select a quick topic below or type your question or claim to begin.`,
      mode: 'chat',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'gemini-3.8-flash (Google Search Grounding)'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Fetch live search trends if available
  useEffect(() => {
    fetch('/api/ai/search-trends')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          if (data.currentEvents?.length) setCurrentEvents(data.currentEvents);
          if (data.factCheckClaims?.length) setFactCheckClaims(data.factCheckClaims);
        }
      })
      .catch(() => {
        // Fallbacks already in state
      });
  }, []);

  // Handle Query Submission
  const handleSendMessage = async (customQuery?: string, customMode?: AgentMode) => {
    const q = (customQuery || inputQuery).trim();
    if (!q || isLoading) return;

    const activeMode = customMode || mode;
    setInputQuery('');

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      mode: activeMode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build brief conversation history (last 4 turns)
      const recentHistory = messages.slice(-4).map(m => ({
        role: (m.role === 'agent' ? 'model' : 'user') as 'model' | 'user',
        text: m.content
      }));

      const res = await fetch('/api/ai/grounded-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          mode: activeMode,
          conversationHistory: recentHistory
        })
      });

      const data = await res.json();

      if (data.success) {
        const agentMessage: AgentMessage = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: data.answer || 'No response returned from search grounding.',
          mode: activeMode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: data.sources || [],
          searchQueries: data.searchQueries || [],
          provider: data.provider || 'gemini-3.8-flash (Google Search Grounded)',
          factCheck: data.factCheck
        };
        setMessages(prev => [...prev, agentMessage]);
      } else {
        const errorMessage: AgentMessage = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: `⚠️ **Search Grounding Notice:** ${data.error || 'Unable to retrieve real-time search data.'}`,
          mode: activeMode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'Error'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err: any) {
      const errorMessage: AgentMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: `⚠️ **Connection Error:** ${err?.message || 'Could not reach search grounding service.'}`,
        mode: activeMode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'Network Error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'agent',
        content: `**Chat cleared.** What current event, news headline, or claim would you like me to research using live Google Search data?`,
        mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'gemini-3.8-flash'
      }
    ]);
  };

  // Helper to render verdict badge styling
  const renderVerdictBadge = (verdict?: FactCheckVerdict) => {
    if (!verdict) return null;

    let badgeBg = 'bg-slate-100 text-slate-800 border-slate-300';
    let icon = <HelpCircle className="w-4 h-4 text-slate-600" />;

    if (verdict.verdict === 'VERIFIED_TRUE') {
      badgeBg = 'bg-emerald-50 text-emerald-900 border-emerald-300';
      icon = <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    } else if (verdict.verdict === 'DEBUNKED_FALSE') {
      badgeBg = 'bg-rose-50 text-rose-900 border-rose-300';
      icon = <XCircle className="w-4 h-4 text-rose-600" />;
    } else if (verdict.verdict === 'PARTIALLY_TRUE') {
      badgeBg = 'bg-amber-50 text-amber-900 border-amber-300';
      icon = <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }

    return (
      <div className={`p-4 rounded-xl border ${badgeBg} space-y-2 mb-3 shadow-2xs`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs">
            {icon}
            <span className="uppercase tracking-wider">Fact-Check Verdict:</span>
            <span className="px-2 py-0.5 rounded-full font-extrabold text-[11px] bg-white border border-current shadow-2xs">
              {verdict.verdictLabel}
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold opacity-80">
            Confidence: {verdict.confidence}%
          </span>
        </div>

        {verdict.evidencePoints && verdict.evidencePoints.length > 0 && (
          <div className="pt-2 border-t border-current/15 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block">
              Verified Evidence Points:
            </span>
            <ul className="space-y-1 text-xs">
              {verdict.evidencePoints.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-current font-bold mt-0.5">•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden ${className}`}>
      {/* Top Agent Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-indigo-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Google Search Intelligence Agent
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Search Connected
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Grounding with <code className="font-mono text-indigo-700 bg-indigo-50 px-1 rounded">gemini-3.8-flash</code> • Real-time web retrieval & citations
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs transition-colors"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'chat'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Current Events & Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('fact_check')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'fact_check'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Fact-Check Lab</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 font-extrabold uppercase">
              Verdicts
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode('news')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'news'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>News Radar & Headlines</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('regulatory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'regulatory'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Saudi Transport & Rates</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts based on Active Mode */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          {mode === 'fact_check' ? 'Test Claims:' : mode === 'news' ? 'Recent Headlines:' : 'Trending Topics:'}
        </span>

        {mode === 'fact_check'
          ? factCheckClaims.map(fc => (
              <button
                key={fc.id}
                type="button"
                onClick={() => handleSendMessage(fc.query, 'fact_check')}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 text-xs transition-colors flex items-center gap-1.5 font-medium"
              >
                <span>🔍</span>
                <span className="truncate max-w-[240px]">{fc.claim}</span>
              </button>
            ))
          : currentEvents.map(ev => (
              <button
                key={ev.id}
                type="button"
                onClick={() => handleSendMessage(ev.query, mode)}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 text-xs transition-colors flex items-center gap-1.5 font-medium"
              >
                <TrendingUp className="w-3 h-3 text-indigo-500" />
                <span className="truncate max-w-[220px]">{ev.title}</span>
              </button>
            ))}
      </div>

      {/* Chat Messages Feed */}
      <div className={`p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/30 ${compact ? 'max-h-[380px]' : 'min-h-[360px] max-h-[540px]'}`}>
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-full sm:max-w-[85%] rounded-2xl p-4 text-xs transition-all shadow-2xs ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
              }`}
            >
              {/* Agent Message Header */}
              {msg.role === 'agent' && (
                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Google Search Agent</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 uppercase font-mono font-bold text-slate-500">
                      {msg.mode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{msg.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Copy Answer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Fact Check Verdict Banner */}
              {msg.role === 'agent' && msg.factCheck && renderVerdictBadge(msg.factCheck)}

              {/* Formatted Text Content */}
              <div className="prose prose-xs max-w-none space-y-2 whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>

              {/* Citations & Sources Card */}
              {msg.role === 'agent' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Newspaper className="w-3 h-3 text-indigo-600" />
                      Cited Live Web Sources ({msg.sources.length}):
                    </span>
                    {msg.searchQueries && msg.searchQueries.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowQueriesFor(showQueriesFor === msg.id ? null : msg.id)
                        }
                        className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
                      >
                        <span>Search Queries</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showQueriesFor === msg.id ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Search Queries Dropdown */}
                  {showQueriesFor === msg.id && msg.searchQueries && (
                    <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-1 animate-in fade-in duration-150">
                      <span className="text-[9px] font-bold text-indigo-900 uppercase">Exact Search Grounding Queries:</span>
                      <div className="flex flex-wrap gap-1">
                        {msg.searchQueries.map((q, qIdx) => (
                          <span
                            key={qIdx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white text-indigo-800 border border-indigo-200 shadow-2xs"
                          >
                            🔍 {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clickable Source Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {msg.sources.map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors group text-[11px]"
                        title={src.title}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-indigo-300">
                            <Globe className="w-3 h-3 text-slate-500 group-hover:text-indigo-600" />
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-slate-800 truncate group-hover:text-indigo-900">
                              {src.title}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono truncate">
                              {src.domain || 'web source'}
                            </div>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timestamp for user message */}
            {msg.role === 'user' && (
              <span className="text-[10px] text-slate-400 mt-1 mr-1 font-mono">
                {msg.timestamp}
              </span>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-2xs space-y-2 max-w-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Globe className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>Searching Google in Real-Time...</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Executing search grounding with <code className="text-indigo-600 font-mono">gemini-3.8-flash</code> and synthesizing cited news sources.
              </p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Query Input Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              disabled={isLoading}
              placeholder={
                mode === 'fact_check'
                  ? 'Enter claim to fact-check (e.g. "Saudi Arabia eliminated diesel fuel subsidies")...'
                  : mode === 'news'
                  ? 'Search breaking news and latest headlines (e.g. "Red Sea trade route updates")...'
                  : 'Ask about current events, world news, or logistics...'
              }
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {mode === 'fact_check' ? 'Fact Check' : 'Research'}
            </span>
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Active Real-Time Web Grounding
          </span>
          <span>Press Enter to Submit</span>
        </div>
      </div>
    </div>
  );
};
