import React, { useState } from 'react';
import {
  Server,
  Cpu,
  Brain,
  Layers,
  Database,
  Wrench,
  Globe,
  Radio,
  Phone,
  PhoneCall,
  PhoneForwarded,
  MessageSquare,
  Calendar,
  Mail,
  CreditCard,
  Building2,
  Workflow,
  Sparkles,
  Shield,
  Zap,
  Activity,
  ArrowRight,
  ArrowDown,
  ExternalLink,
  CheckCircle2,
  Copy,
  Terminal,
  FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { audioService } from '../services/audioService';

interface KhyberFullArchitectureViewProps {
  onOpenTelAgent?: () => void;
  onOpenIntegrationHub?: () => void;
  onOpenAiEngine?: () => void;
}

export const KhyberFullArchitectureView: React.FC<KhyberFullArchitectureViewProps> = ({
  onOpenTelAgent,
  onOpenIntegrationHub,
  onOpenAiEngine
}) => {
  const { language } = useLanguage();
  const [selectedNode, setSelectedNode] = useState<string | null>('khyber_core');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected AI Model Provider
  const [activeModel, setActiveModel] = useState<'gemini' | 'openai' | 'claude' | 'deepseek' | 'qwen' | 'grok'>('gemini');

  // Interactive node data
  const nodeDetails: Record<string, { title: string; subtitle: string; desc: string; specs: Array<{ k: string; v: string }> }> = {
    khyber_ai: {
      title: 'KHYBER.AI (User / Admin Access Layer)',
      subtitle: 'Universal Web & Mobile Client Entry',
      desc: 'Enterprise dispatch console, executive telemetry dashboards, driver PWA mobile clients, and multi-tenant administrative controls.',
      specs: [
        { k: 'Protocols', v: 'HTTPS / TLS 1.3 / WSS' },
        { k: 'Access Targets', v: 'Fleet Admins, Dispatchers, Drivers, Subcontractors' },
        { k: 'Security', v: 'MFA, Session Token Invalidation, JWT' }
      ]
    },
    frontend: {
      title: 'KHYBER FRONTEND (Next.js / React / Mobile)',
      subtitle: 'Modern Hybrid Presentation Architecture',
      desc: 'High-performance React 18 / Next.js / Tailwind UI with sub-second responsive state management, offline PWA synchronization, and Arabic/English RTL/LTR dynamic layout.',
      specs: [
        { k: 'Framework', v: 'React 18 / Vite / Next.js SSR-ready' },
        { k: 'State & Real-time', v: 'Zustand / React Context / WebSocket Streams' },
        { k: 'Styling & UX', v: 'Tailwind CSS, Print-friendly CSS, Motion layout animations' }
      ]
    },
    api_gateway: {
      title: 'KHYBER API GATEWAY (FastAPI / Auth / RBAC)',
      subtitle: 'Unified REST & WebSocket Ingress Routing',
      desc: 'Central security gatekeeper validating JWT access tokens, enforcing Saudi role-based access controls (Super Admin, Dispatcher, HR Officer, Driver), rate-limiting, and telemetry ingestion.',
      specs: [
        { k: 'Runtime', v: 'FastAPI / Express Microservice Proxy' },
        { k: 'Authentication', v: 'OAuth2 Bearer Tokens / Firebase / Supabase RBAC' },
        { k: 'Audit & Compliance', v: 'ZATCA Phase 2 E-Invoicing & TGA Wasl Tamper-Proof Audit' }
      ]
    },
    khyber_core: {
      title: 'KHYBER CORE (Orchestrator & Agent Router)',
      subtitle: 'Autonomous Agentic Workflow Core',
      desc: 'Central task scheduler, multi-turn reasoning coordinator, intent classifier, and event bus dispatching tasks dynamically between LLM models, memory stores, and external APIs.',
      specs: [
        { k: 'Orchestration', v: 'Agentic LangGraph / ReAct Routing Engine' },
        { k: 'Event Bus', v: 'Distributed Pub/Sub & Redis Queue' },
        { k: 'Execution Latency', v: '< 80ms router dispatch overhead' }
      ]
    },
    khyber_memory: {
      title: 'KHYBER MEMORY (Short + Long / User + Business)',
      subtitle: 'Dual-Tier Hybrid Vector & Relational Storage',
      desc: 'Stores active conversation sessions, driver voice notes, historical vehicle maintenance logs, compliance expiry dates, and organizational hierarchy vectors.',
      specs: [
        { k: 'Short-term', v: 'Redis In-Memory Session Cache & Sliding Window' },
        { k: 'Long-term', v: 'PostgreSQL / Cloud SQL / PGVector + Firestore' },
        { k: 'Retrieval', v: 'RAG Context Injection & Semantic Search' }
      ]
    },
    khyber_tools: {
      title: 'KHYBER TOOLS (Business / API Actions)',
      subtitle: 'Dynamic Function Calling & Action Execution',
      desc: 'Pre-registered executable functions triggered autonomously by AI models: generate PDF invoice, reserve Petromin maintenance slot, verify Iqama on Absher, or push Wasl trip start.',
      specs: [
        { k: 'Tool Registry', v: 'JSON Schema Structured Tool Calling' },
        { k: 'Execution Mode', v: 'Sandbox Execution with Rollback Safeguards' },
        { k: 'Coverage', v: 'Waybills, Invoices, GPS Geofencing, Alert Broadcast' }
      ]
    },
    ai_engine: {
      title: 'KHYBER AI ENGINE (Multi-LLM Model Routing)',
      subtitle: 'Dynamic Cost / Latency / Reasoning Model Switching',
      desc: 'Dynamically routes user requests to optimal foundation models based on reasoning complexity, latency requirements, and cost budgets.',
      specs: [
        { k: 'Gemini (Default)', v: 'Gemini 2.5 Flash / Pro (Multimodal & Fast Audio)' },
        { k: 'OpenAI / Claude', v: 'GPT-4o, Claude 3.5 Sonnet (Complex Reasoning)' },
        { k: 'DeepSeek / Qwen / Grok', v: 'DeepSeek V3/R1, Qwen 2.5, xAI Grok (Cost-efficient / Open)' }
      ]
    },
    integration_hub: {
      title: 'INTEGRATION HUB (SaaS & Enterprise Connectors)',
      subtitle: 'Out-of-the-box Pre-built API Connectors',
      desc: 'Bi-directional synchronization with enterprise CRM, Google Workspace (Calendar, Gmail, Sheets, Tasks), WhatsApp Business Cloud API, Odoo/SAP ERP, Stripe payments, and custom Webhooks.',
      specs: [
        { k: 'Enterprise ERP', v: 'SAP, Odoo 17, Zoho Books, ZATCA XML' },
        { k: 'Messaging', v: 'WhatsApp Cloud API, Google Chat, SMS' },
        { k: 'Google Cloud', v: 'OAuth2 Google Workspace (Gmail, Calendar, Contacts)' }
      ]
    },
    tel_agent_edge: {
      title: 'TEL-AGENT EDGE (Telephony & Voice AI Pipeline)',
      subtitle: 'Ultra-low Latency Voice Pipeline with Barge-in',
      desc: 'Complete SIP / PSTN telematics stack handling real-time caller ID resolution, streaming speech-to-text (STT), text-to-speech (TTS), natural turn-taking, interruption handling, and live call transcripts.',
      specs: [
        { k: 'SIP Protocols', v: 'SIP 2.0 / WebRTC / G.711u / Opus (24kHz)' },
        { k: 'Turn-Taking', v: 'VAD (Voice Activity Detection) + Sub-300ms Barge-in' },
        { k: 'PSTN Carrier', v: 'STC / Mobily / Zain Saudi Telecom Trunking' }
      ]
    },
    customer_phone: {
      title: 'CUSTOMER / DRIVER PHONE',
      subtitle: 'PSTN Mobile & Landline Endpoints',
      desc: 'Any Saudi mobile phone (+966 5X) receiving automated calls for dispatch confirmations, Iqama renewal warnings, or driver road assistance without needing internet.',
      specs: [
        { k: 'Connectivity', v: 'Cellular GSM / VoLTE / 4G / 5G Voice' },
        { k: 'Requirement', v: 'Zero app installation required for drivers' },
        { k: 'Feedback', v: 'Interactive Voice Response (IVR) & Natural Speech' }
      ]
    }
  };

  const activeNodeData = nodeDetails[selectedNode || 'khyber_core'];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    audioService.playChime('click');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Architecture Context */}
      <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-500/40 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Workflow className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold tracking-tight">KHYBER.AI ENTERPRISE ARCHITECTURE</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40 font-bold">
                END-TO-END FLOW
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {language === 'ar'
                ? 'المخطط الهندسي الكامل: البوابة السحابية • المحرك الذكي • تكامل الأنظمة • شبكة Tel-Agent الصوتية'
                : 'Interactive System Blueprint: Full-stack routing from Presentation Layer down to Tel-Agent Edge SIP.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            LIVE SPEC v4.2
          </span>
        </div>
      </div>

      {/* Main Interactive Diagram Canvas */}
      <div className="p-5 sm:p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto space-y-4">
          {/* LEVEL 1: KHYBER.AI User / Admin */}
          <div
            onClick={() => {
              setSelectedNode('khyber_ai');
              audioService.playChime('click');
            }}
            className={`w-full max-w-md p-3.5 rounded-2xl cursor-pointer transition-all duration-200 text-center border-2 ${
              selectedNode === 'khyber_ai'
                ? 'bg-linear-to-r from-emerald-900/90 to-teal-900/90 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-sm font-black tracking-wider text-emerald-300">KHYBER.AI</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">User / Admin • Web Dashboard & Mobile PWA</p>
          </div>

          {/* Connection Line: HTTPS / WebSocket */}
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-4 bg-emerald-500/60" />
            <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400/90">
              HTTPS / WebSocket
            </span>
            <div className="w-0.5 h-4 bg-emerald-500/60" />
          </div>

          {/* LEVEL 2: KHYBER FRONTEND */}
          <div
            onClick={() => {
              setSelectedNode('frontend');
              audioService.playChime('click');
            }}
            className={`w-full max-w-md p-3.5 rounded-2xl cursor-pointer transition-all duration-200 text-center border-2 ${
              selectedNode === 'frontend'
                ? 'bg-linear-to-r from-blue-950 to-indigo-950 border-blue-400 shadow-lg shadow-blue-500/20 scale-[1.02]'
                : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-sm font-black tracking-wider text-blue-300">KHYBER FRONTEND</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">Next.js / React 18 / Mobile PWA (Tailwind & Motion)</p>
          </div>

          {/* Connection Line */}
          <div className="w-0.5 h-6 bg-blue-500/60" />

          {/* LEVEL 3: KHYBER API GATEWAY */}
          <div
            onClick={() => {
              setSelectedNode('api_gateway');
              audioService.playChime('click');
            }}
            className={`w-full max-w-md p-3.5 rounded-2xl cursor-pointer transition-all duration-200 text-center border-2 ${
              selectedNode === 'api_gateway'
                ? 'bg-linear-to-r from-teal-950 to-cyan-950 border-teal-400 shadow-lg shadow-teal-500/20 scale-[1.02]'
                : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <Layers className="w-4 h-4 text-teal-400" />
              <span className="font-mono text-sm font-black tracking-wider text-teal-300">KHYBER API GATEWAY</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">FastAPI / Auth / RBAC / Audit Ingress</p>
          </div>

          {/* Connection Fork to 3-Column Core Blocks */}
          <div className="w-full flex flex-col items-center">
            <div className="w-0.5 h-6 bg-teal-500/60" />
            <div className="w-5/6 h-0.5 bg-teal-500/60 relative">
              <div className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-emerald-400" />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400" />
              <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="w-5/6 flex justify-between">
              <div className="w-0.5 h-6 bg-emerald-500/60" />
              <div className="w-0.5 h-6 bg-cyan-500/60" />
              <div className="w-0.5 h-6 bg-amber-500/60" />
            </div>
          </div>

          {/* LEVEL 4: 3 CORE TRIAD BLOCKS */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Core Box 1: KHYBER CORE */}
            <div
              onClick={() => {
                setSelectedNode('khyber_core');
                audioService.playChime('click');
              }}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                selectedNode === 'khyber_core'
                  ? 'bg-linear-to-b from-emerald-950 to-slate-900 border-emerald-400 shadow-md scale-[1.02]'
                  : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs font-black text-emerald-300">KHYBER CORE</span>
              </div>
              <p className="text-[11px] text-slate-300 font-semibold">Orchestrator & Agent Router</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                  Multi-Agent
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                  Dynamic Dispatch
                </span>
              </div>
            </div>

            {/* Core Box 2: KHYBER MEMORY */}
            <div
              onClick={() => {
                setSelectedNode('khyber_memory');
                audioService.playChime('click');
              }}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                selectedNode === 'khyber_memory'
                  ? 'bg-linear-to-b from-cyan-950 to-slate-900 border-cyan-400 shadow-md scale-[1.02]'
                  : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs font-black text-cyan-300">KHYBER MEMORY</span>
              </div>
              <p className="text-[11px] text-slate-300 font-semibold">Short + Long • User + Business</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono">
                  Redis Buffer
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono">
                  Cloud SQL Vector
                </span>
              </div>
            </div>

            {/* Core Box 3: KHYBER TOOLS */}
            <div
              onClick={() => {
                setSelectedNode('khyber_tools');
                audioService.playChime('click');
              }}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                selectedNode === 'khyber_tools'
                  ? 'bg-linear-to-b from-amber-950 to-slate-900 border-amber-400 shadow-md scale-[1.02]'
                  : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs font-black text-amber-300">KHYBER TOOLS</span>
              </div>
              <p className="text-[11px] text-slate-300 font-semibold">Business & API Actions</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono">
                  Function Calls
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono">
                  ZATCA & Wasl
                </span>
              </div>
            </div>
          </div>

          {/* Connectors Downward from Core & Tools */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* Left Connector (Core to AI Engine) */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                Model routing
              </span>
              <div className="w-0.5 h-6 bg-purple-500/70" />
            </div>

            {/* Right Connector (Tools to Integration Hub) */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                Action execution
              </span>
              <div className="w-0.5 h-6 bg-amber-500/70" />
            </div>
          </div>

          {/* LEVEL 5: KHYBER AI ENGINE & INTEGRATION HUB */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: KHYBER AI ENGINE */}
            <div
              onClick={() => {
                setSelectedNode('ai_engine');
                audioService.playChime('click');
              }}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                selectedNode === 'ai_engine'
                  ? 'bg-linear-to-br from-purple-950 via-slate-900 to-indigo-950 border-purple-400 shadow-lg scale-[1.01]'
                  : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-xs font-black text-purple-300">KHYBER AI ENGINE</span>
                </div>
                <span className="text-[10px] text-purple-400 font-mono">Multi-LLM Matrix</span>
              </div>

              {/* Model pills */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModel('gemini');
                  }}
                  className={`p-2 rounded-xl border ${
                    activeModel === 'gemini'
                      ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  Gemini ✨
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModel('openai');
                  }}
                  className={`p-2 rounded-xl border ${
                    activeModel === 'openai'
                      ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  OpenAI
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModel('claude');
                  }}
                  className={`p-2 rounded-xl border ${
                    activeModel === 'claude'
                      ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  Claude
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModel('deepseek');
                  }}
                  className={`p-2 rounded-xl border ${
                    activeModel === 'deepseek'
                      ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  DeepSeek
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModel('qwen');
                  }}
                  className={`p-2 rounded-xl border ${
                    activeModel === 'qwen'
                      ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  Qwen
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModel('grok');
                  }}
                  className={`p-2 rounded-xl border ${
                    activeModel === 'grok'
                      ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  Grok / etc.
                </div>
              </div>
            </div>

            {/* Right: INTEGRATION HUB */}
            <div
              onClick={() => {
                setSelectedNode('integration_hub');
                audioService.playChime('click');
              }}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                selectedNode === 'integration_hub'
                  ? 'bg-linear-to-br from-amber-950 via-slate-900 to-orange-950 border-amber-400 shadow-lg scale-[1.01]'
                  : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs font-black text-amber-300">INTEGRATION HUB</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">Connectors</span>
              </div>

              {/* Service connectors */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200">
                  CRM
                </span>
                <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200">
                  Calendar
                </span>
                <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200">
                  Email / Gmail
                </span>
                <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-emerald-400 font-bold">
                  WhatsApp
                </span>
                <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200">
                  ERP (SAP/Odoo)
                </span>
                <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200">
                  Stripe / ZATCA
                </span>
              </div>
            </div>
          </div>

          {/* Upward/Downward Connector from Integration Hub to Tel-Agent Edge */}
          <div className="flex flex-col items-center pt-2">
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded border border-rose-800 flex items-center gap-1">
              <span>▲</span> REST / Webhooks <span>▼</span>
            </span>
            <div className="w-0.5 h-6 bg-rose-500/70" />
          </div>

          {/* LEVEL 6: TEL-AGENT EDGE */}
          <div
            onClick={() => {
              setSelectedNode('tel_agent_edge');
              audioService.playChime('click');
            }}
            className={`w-full max-w-2xl p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
              selectedNode === 'tel_agent_edge'
                ? 'bg-linear-to-r from-rose-950 via-slate-900 to-purple-950 border-rose-400 shadow-xl shadow-rose-500/20 scale-[1.01]'
                : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-rose-300">
                  TEL-AGENT EDGE
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono border border-rose-500/40">
                SIP Telephony Stack
              </span>
            </div>

            {/* Edge Sub-features matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-rose-400" /> SIP / Phone
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-rose-400" /> Caller ID
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-emerald-400" /> STT (Streaming)
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-purple-400" /> TTS (Neural)
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-cyan-400" /> Turn taking / Barge-in
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3 text-amber-400" /> Call routing
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-blue-400" /> Call recording
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-indigo-400" /> Transcript / Phone
              </div>
            </div>
          </div>

          {/* Connection to Customer Phone */}
          <div className="flex flex-col items-center pt-2">
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-800">
              SIP / PBX
            </span>
            <div className="w-0.5 h-6 bg-purple-500/70" />
          </div>

          {/* LEVEL 7: CUSTOMER / CALLER PHONE */}
          <div
            onClick={() => {
              setSelectedNode('customer_phone');
              audioService.playChime('click');
            }}
            className={`w-full max-w-md p-3.5 rounded-2xl cursor-pointer transition-all duration-200 text-center border-2 ${
              selectedNode === 'customer_phone'
                ? 'bg-linear-to-r from-emerald-900 to-green-950 border-green-400 shadow-lg scale-[1.02]'
                : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-sm font-black tracking-wider text-emerald-300">
                Customer / Caller Phone
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">Saudi Mobile (+966 5X) • PSTN / Voice Network</p>
          </div>
        </div>
      </div>

      {/* Interactive Detail Drawer for Selected Node */}
      {activeNodeData && (
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activeNodeData.title}</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeNodeData.subtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(activeNodeData, null, 2), activeNodeData.title)}
                className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === activeNodeData.title ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedKey === activeNodeData.title ? 'Copied' : 'Copy Spec'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {activeNodeData.desc}
          </p>

          {/* Technical Specs List */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeNodeData.specs.map((spec, i) => (
              <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">{spec.k}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{spec.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
