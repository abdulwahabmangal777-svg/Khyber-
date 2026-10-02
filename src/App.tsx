import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { getAuthHeaders, safeFetch } from './utils/api';

// Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { VehiclesView } from './views/VehiclesView';
import { WorkersView } from './views/WorkersView';
import { ExpiryAlertsView } from './views/ExpiryAlertsView';
import { DocumentsView } from './views/DocumentsView';
import { MaintenanceView } from './views/MaintenanceView';
import { FuelView } from './views/FuelView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsView } from './views/ReportsView';
import { OrgStructureView } from './views/OrgStructureView';
import { NotificationsView } from './views/NotificationsView';
import { UsersAdminView } from './views/UsersAdminView';
import { SettingsView } from './views/SettingsView';
import { AuditLogsView } from './views/AuditLogsView';
import { BillingView } from './views/BillingView';
import { VoiceReportsAdminView } from './components/voice/VoiceReportsAdminView';
import { TripsListView } from './components/voice/TripsListView';
import { FleetMapView } from './views/FleetMapView';
import { GmailView } from './views/GmailView';
import { GoogleTasksView } from './views/GoogleTasksView';
import { GoogleChatView } from './views/GoogleChatView';
import { GoogleContactsView } from './views/GoogleContactsView';
import { FleetIntelligenceView } from './views/FleetIntelligenceView';

// Modals
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { QRScannerModal } from './components/QRScannerModal';
import { DriverVoiceReportingModal } from './components/voice/DriverVoiceReportingModal';
import { LiveVoiceConversationModal } from './components/voice/LiveVoiceConversationModal';
import { FleetIntelligenceHubModal } from './components/voice/FleetIntelligenceHubModal';
import { VehicleDetailModal } from './components/VehicleDetailModal';
import { WorkerDetailModal } from './components/WorkerDetailModal';
import { VehicleFormModal } from './components/VehicleFormModal';
import { WorkerFormModal } from './components/WorkerFormModal';
import { MaintenanceFormModal } from './components/MaintenanceFormModal';
import { FuelFormModal } from './components/FuelFormModal';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { DocumentModal } from './components/DocumentModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AdsterraManagerModal } from './components/ads/AdsterraManagerModal';
import { AdsterraSocialBar } from './components/ads/AdsterraSocialBar';
import { KhyberCoreHubModal } from './components/KhyberCoreHubModal';
import { KhyberFullArchitectureView } from './components/KhyberFullArchitectureView';
import { generateCurrentViewPdf } from './utils/printPdfReport';

import { Vehicle, Worker, Department } from './types';

// Canonical navigation order for direction-aware horizontal slide transitions
const VIEW_HIERARCHY: string[] = [
  'DASHBOARD',
  'KHYBER_ARCHITECTURE',
  'AI_INTELLIGENCE',
  'VOICE_REPORTS',
  'TRIPS',
  'MAP',
  'VEHICLES',
  'WORKERS',
  'DOCUMENTS',
  'EXPIRY_ALERTS',
  'MAINTENANCE',
  'FUEL',
  'EXPENSES',
  'GMAIL',
  'GOOGLE_TASKS',
  'GOOGLE_CHAT',
  'GOOGLE_CONTACTS',
  'REPORTS',
  'ORG_STRUCTURE',
  'NOTIFICATIONS',
  'USERS',
  'BILLING',
  'SETTINGS',
  'AUDIT_LOGS'
];

// Fluid horizontal slide-in transition variants
const viewSlideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 52 : direction < 0 ? -52 : 0,
    opacity: 0,
    scale: 0.994
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 320, damping: 32, mass: 0.75 },
      opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
      scale: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
    }
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction > 0 ? -52 : direction < 0 ? 52 : 0,
    opacity: 0,
    scale: 0.994,
    transition: {
      x: { type: 'spring', stiffness: 320, damping: 32, mass: 0.75 },
      opacity: { duration: 0.2, ease: [0.7, 0, 0.84, 0] },
      scale: { duration: 0.2 }
    }
  })
};

export default function App() {
  const { user, token, loading: authLoading } = useAuth();
  const { dir } = useLanguage();

  // Navigation State & Motion Direction Tracking
  const [currentView, setCurrentView] = useState<string>('DASHBOARD');
  const [navDirection, setNavDirection] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Direction-aware navigation dispatcher
  const navigateToView = (nextView: string) => {
    if (nextView === currentView) return;
    const prevIdx = VIEW_HIERARCHY.indexOf(currentView);
    const nextIdx = VIEW_HIERARCHY.indexOf(nextView);

    // Compute relative hierarchy direction (+1 = forward/downwards, -1 = backward/upwards)
    const baseDirection = (nextIdx === -1 || prevIdx === -1) ? 1 : (nextIdx >= prevIdx ? 1 : -1);
    // Mirror direction for Right-To-Left layout so slide direction matches visual flow
    const resolvedDirection = dir === 'rtl' ? -baseDirection : baseDirection;

    setNavDirection(resolvedDirection);
    setCurrentView(nextView);
  };

  // Common Shared Data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  // Modal Control States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isFleetHubOpen, setIsFleetHubOpen] = useState(false);
  const [isKhyberCoreModalOpen, setIsKhyberCoreModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pendingVoiceCount, setPendingVoiceCount] = useState<number>(0);

  // 360° Profiles
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Vehicle Form
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Worker Form
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Maintenance Form
  const [isMaintenanceFormOpen, setIsMaintenanceFormOpen] = useState(false);
  const [defaultMaintenanceVehicleId, setDefaultMaintenanceVehicleId] = useState<string>('');

  // Fuel Form
  const [isFuelFormOpen, setIsFuelFormOpen] = useState(false);
  const [defaultFuelVehicleId, setDefaultFuelVehicleId] = useState<string>('');

  // Expense Form
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [defaultExpenseVehicleId, setDefaultExpenseVehicleId] = useState<string>('');

  // Document Upload / Sign Modal
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentModalMode, setDocumentModalMode] = useState<'UPLOAD' | 'SIGN'>('UPLOAD');

  // Delete Confirmation Modal
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Google Maps Platform Quota Exceeded Tracking
  const [isGmpQuotaExceeded, setIsGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsGmpQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Global Ctrl+K Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch shared foundational datasets
  useEffect(() => {
    fetchCommonData();
  }, [token]);

  const fetchCommonData = async () => {
    try {
      const headers = getAuthHeaders(token);
      const [vRes, wRes, dRes, eRes, vrRes] = await Promise.all([
        fetch('/api/vehicles', { headers }),
        fetch('/api/workers', { headers }),
        fetch('/api/departments', { headers }),
        fetch('/api/expiry/alerts', { headers }),
        fetch('/api/voice-reports?status=PENDING', { headers })
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        const vList = Array.isArray(vData) ? vData : (vData?.data || []);
        setVehicles(Array.isArray(vList) ? vList : []);
      }
      if (wRes.ok) {
        const wData = await wRes.json();
        const wList = Array.isArray(wData) ? wData : (wData?.data || []);
        setWorkers(Array.isArray(wList) ? wList : []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        const dList = Array.isArray(dData) ? dData : (dData?.data || []);
        setDepartments(Array.isArray(dList) ? dList : []);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        const eList = Array.isArray(eData) ? eData : (eData?.alerts || eData?.data || []);
        if (Array.isArray(eList)) {
          setUnreadAlertsCount(eList.filter((a: any) => a && a.daysRemaining <= 7).length);
        }
      }
      if (vrRes.ok) {
        const vrData = await vrRes.json();
        if (vrData.metrics?.pendingCount !== undefined) {
          setPendingVoiceCount(vrData.metrics.pendingCount);
        } else if (Array.isArray(vrData.reports)) {
          setPendingVoiceCount(vrData.reports.length);
        }
      }
    } catch (err) {
      console.warn('Notice: Common data fetch fallback:', err);
    }
  };

  // Handlers for deleting assets
  const handleDeleteVehicle = (vehicle: Vehicle) => {
    setDeleteModalState({
      isOpen: true,
      title: `Delete Fleet Vehicle: ${vehicle.plateNumber}`,
      message: `Are you sure you want to permanently remove "${vehicle.make} ${vehicle.model} (${vehicle.internalVehicleId})"? All associated document logs will be unlinked.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/vehicles/${vehicle.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token)
          });
          if (res.ok) {
            setDeleteModalState(prev => ({ ...prev, isOpen: false }));
            fetchCommonData();
          }
        } catch (err) {
          console.error('Error deleting vehicle:', err);
        }
      }
    });
  };

  const handleDeleteWorker = (worker: Worker) => {
    setDeleteModalState({
      isOpen: true,
      title: `Delete Workforce Member: ${worker.fullName}`,
      message: `Are you sure you want to remove employee "${worker.fullName}" (Iqama: ${worker.iqamaNumber})? Assigned vehicles will be unallocated.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/workers/${worker.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token)
          });
          if (res.ok) {
            setDeleteModalState(prev => ({ ...prev, isOpen: false }));
            fetchCommonData();
          }
        } catch (err) {
          console.error('Error deleting worker:', err);
        }
      }
    });
  };

  const handleDownloadCurrentViewPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateCurrentViewPdf('current-view-content', {
        reportTitle: `Khyber ${currentView} Operations Report`,
        viewName: currentView,
        orientation: 'landscape'
      });
    } catch (err) {
      console.error('Failed to generate current view PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-400 font-bold text-sm">Loading Fleet & Workforce System...</p>
        </div>
      </div>
    );
  }

  // If not logged in, display modern enterprise login
  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] font-sans text-slate-800" dir={dir}>
      {/* Left/Right Sidebar depending on RTL */}
      <Sidebar
        currentView={currentView as any}
        onSelectView={navigateToView as any}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        urgentAlertsCount={unreadAlertsCount}
        pendingVoiceReportsCount={pendingVoiceCount}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onOpenKhyberCore={() => setIsKhyberCoreModalOpen(true)}
      />

      {/* Main Structural Body */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Google Maps Platform Quota Exceeded Sticky Banner */}
        {isGmpQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Top Application Header */}
        <Header
          onOpenSearch={(initialQuery = '') => {
            setSearchInitialQuery(initialQuery);
            setIsSearchOpen(true);
          }}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          unreadNotificationsCount={unreadAlertsCount}
          onOpenNotifications={() => navigateToView('NOTIFICATIONS')}
          onOpenQRScanner={() => setIsQRScannerOpen(true)}
          onOpenVoiceReportModal={() => setIsVoiceModalOpen(true)}
          onOpenLiveVoiceConversation={() => setIsLiveVoiceOpen(true)}
          onOpenFleetIntelligence={() => setIsFleetHubOpen(true)}
          onOpenKhyberCore={() => setIsKhyberCoreModalOpen(true)}
          onDownloadViewPdf={handleDownloadCurrentViewPdf}
          isGeneratingPdf={isGeneratingPdf}
        />

        {/* Dynamic Center Stage Content View with Direction-Aware Fluid Slide-In Transitions */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
          <AnimatePresence mode="wait" custom={navDirection} initial={false}>
            <motion.div
              key={currentView}
              id="current-view-content"
              custom={navDirection}
              variants={viewSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="h-full min-h-full w-full"
            >
              {currentView === 'DASHBOARD' && (
                <DashboardView
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  onOpenWorker={id => setSelectedWorkerId(id)}
                  onNavigate={navigateToView}
                  onAddVehicle={() => {
                    setEditingVehicle(null);
                    setIsVehicleFormOpen(true);
                  }}
                  onAddWorker={() => {
                    setEditingWorker(null);
                    setIsWorkerFormOpen(true);
                  }}
                  onAddMaintenance={vId => {
                    setDefaultMaintenanceVehicleId(vId || '');
                    setIsMaintenanceFormOpen(true);
                  }}
                  onAddFuel={() => {
                    setDefaultFuelVehicleId('');
                    setIsFuelFormOpen(true);
                  }}
                />
              )}

              {currentView === 'KHYBER_ARCHITECTURE' && (
                <KhyberFullArchitectureView
                  onOpenTelAgent={() => setIsKhyberCoreModalOpen(true)}
                  onOpenIntegrationHub={() => setIsKhyberCoreModalOpen(true)}
                  onOpenAiEngine={() => setIsFleetHubOpen(true)}
                />
              )}

              {currentView === 'AI_INTELLIGENCE' && (
                <FleetIntelligenceView
                  onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
                />
              )}

              {currentView === 'VOICE_REPORTS' && (
                <VoiceReportsAdminView
                  onOpenDriverModal={() => setIsVoiceModalOpen(true)}
                />
              )}

              {currentView === 'TRIPS' && (
                <TripsListView
                  onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                />
              )}

              {currentView === 'MAP' && (
                <FleetMapView
                  vehicles={vehicles}
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  onOpenWorker={id => setSelectedWorkerId(id)}
                />
              )}

              {currentView === 'VEHICLES' && (
                <VehiclesView
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  onOpenWorker={id => setSelectedWorkerId(id)}
                  onAddVehicle={() => {
                    setEditingVehicle(null);
                    setIsVehicleFormOpen(true);
                  }}
                  onEditVehicle={v => {
                    setEditingVehicle(v);
                    setIsVehicleFormOpen(true);
                  }}
                  onDeleteVehicle={handleDeleteVehicle}
                  onAddMaintenance={vId => {
                    setDefaultMaintenanceVehicleId(vId);
                    setIsMaintenanceFormOpen(true);
                  }}
                  onAddFuel={vId => {
                    setDefaultFuelVehicleId(vId);
                    setIsFuelFormOpen(true);
                  }}
                  departments={departments}
                  workers={workers}
                />
              )}

              {currentView === 'WORKERS' && (
                <WorkersView
                  onOpenWorker={id => setSelectedWorkerId(id)}
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  onAddWorker={() => {
                    setEditingWorker(null);
                    setIsWorkerFormOpen(true);
                  }}
                  onEditWorker={w => {
                    setEditingWorker(w);
                    setIsWorkerFormOpen(true);
                  }}
                  onDeleteWorker={handleDeleteWorker}
                  departments={departments}
                  vehicles={vehicles}
                />
              )}

              {currentView === 'EXPIRY_ALERTS' && (
                <ExpiryAlertsView
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  onOpenWorker={id => setSelectedWorkerId(id)}
                  departments={departments}
                />
              )}

              {currentView === 'DOCUMENTS' && (
                <DocumentsView
                  onOpenDocumentUpload={() => {
                    setDocumentModalMode('UPLOAD');
                    setIsDocumentModalOpen(true);
                  }}
                  onOpenDocumentSign={() => {
                    setDocumentModalMode('SIGN');
                    setIsDocumentModalOpen(true);
                  }}
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  onOpenWorker={id => setSelectedWorkerId(id)}
                  vehicles={vehicles}
                  workers={workers}
                />
              )}

              {currentView === 'MAINTENANCE' && (
                <MaintenanceView
                  onOpenMaintenanceModal={vId => {
                    setDefaultMaintenanceVehicleId(vId || '');
                    setIsMaintenanceFormOpen(true);
                  }}
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  vehicles={vehicles}
                />
              )}

              {currentView === 'FUEL' && (
                <FuelView
                  onOpenFuelModal={vId => {
                    setDefaultFuelVehicleId(vId || '');
                    setIsFuelFormOpen(true);
                  }}
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  onOpenWorker={id => setSelectedWorkerId(id)}
                  vehicles={vehicles}
                  workers={workers}
                />
              )}

              {currentView === 'EXPENSES' && (
                <ExpensesView
                  onOpenExpenseModal={vId => {
                    setDefaultExpenseVehicleId(vId || '');
                    setIsExpenseFormOpen(true);
                  }}
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  vehicles={vehicles}
                />
              )}

              {currentView === 'GMAIL' && (
                <GmailView />
              )}

              {currentView === 'GOOGLE_TASKS' && (
                <GoogleTasksView />
              )}

              {currentView === 'GOOGLE_CHAT' && (
                <GoogleChatView />
              )}

              {currentView === 'GOOGLE_CONTACTS' && (
                <GoogleContactsView
                  workers={workers}
                  vehicles={vehicles}
                  onOpenWorker={id => setSelectedWorkerId(id)}
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                />
              )}

              {currentView === 'REPORTS' && (
                <ReportsView departments={departments} />
              )}

              {currentView === 'ORG_STRUCTURE' && (
                <OrgStructureView />
              )}

              {currentView === 'NOTIFICATIONS' && (
                <NotificationsView
                  onOpenVehicle={id => setSelectedVehicleId(id)}
                  onOpenWorker={id => setSelectedWorkerId(id)}
                />
              )}

              {currentView === 'USERS' && (
                <UsersAdminView />
              )}

              {currentView === 'BILLING' && (
                <BillingView />
              )}

              {currentView === 'SETTINGS' && (
                <SettingsView />
              )}

              {currentView === 'AUDIT_LOGS' && (
                <AuditLogsView />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global 360° Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectVehicle={id => setSelectedVehicleId(id)}
        onSelectWorker={id => setSelectedWorkerId(id)}
        initialQuery={searchInitialQuery}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
      />

      {/* Live Device Camera QR Asset Scanner */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onSelectVehicle={id => {
          setSelectedWorkerId(null);
          setSelectedVehicleId(id);
        }}
        onSelectWorker={id => {
          setSelectedVehicleId(null);
          setSelectedWorkerId(id);
        }}
      />

      {/* 360° Vehicle Profile Modal */}
      {selectedVehicleId && (
        <VehicleDetailModal
          vehicleId={selectedVehicleId}
          onClose={() => setSelectedVehicleId(null)}
          onOpenWorker={id => {
            setSelectedVehicleId(null);
            setSelectedWorkerId(id);
          }}
          onEditVehicle={v => {
            setSelectedVehicleId(null);
            setEditingVehicle(v);
            setIsVehicleFormOpen(true);
          }}
          onAddMaintenance={vId => {
            setDefaultMaintenanceVehicleId(vId);
            setIsMaintenanceFormOpen(true);
          }}
          onAddFuel={vId => {
            setDefaultFuelVehicleId(vId);
            setIsFuelFormOpen(true);
          }}
        />
      )}

      {/* 360° Worker Profile Modal */}
      {selectedWorkerId && (
        <WorkerDetailModal
          workerId={selectedWorkerId}
          onClose={() => setSelectedWorkerId(null)}
          onOpenVehicle={id => {
            setSelectedWorkerId(null);
            setSelectedVehicleId(id);
          }}
          onWorkerUpdated={() => fetchCommonData()}
          onEditWorker={w => {
            setSelectedWorkerId(null);
            setEditingWorker(w);
            setIsWorkerFormOpen(true);
          }}
        />
      )}

      {/* Vehicle Add/Edit Modal */}
      <VehicleFormModal
        isOpen={isVehicleFormOpen}
        onClose={() => setIsVehicleFormOpen(false)}
        onSuccess={() => fetchCommonData()}
        initialVehicle={editingVehicle}
        departments={departments}
        workers={workers}
      />

      {/* Worker Add/Edit Modal */}
      <WorkerFormModal
        isOpen={isWorkerFormOpen}
        onClose={() => setIsWorkerFormOpen(false)}
        onSuccess={() => fetchCommonData()}
        initialWorker={editingWorker}
        vehicles={vehicles}
        departments={departments}
      />

      {/* Maintenance Form Modal */}
      <MaintenanceFormModal
        isOpen={isMaintenanceFormOpen}
        onClose={() => setIsMaintenanceFormOpen(false)}
        onSuccess={() => fetchCommonData()}
        vehicles={vehicles}
        defaultVehicleId={defaultMaintenanceVehicleId}
      />

      {/* Fuel Form Modal */}
      <FuelFormModal
        isOpen={isFuelFormOpen}
        onClose={() => setIsFuelFormOpen(false)}
        onSuccess={() => fetchCommonData()}
        vehicles={vehicles}
        workers={workers}
        defaultVehicleId={defaultFuelVehicleId}
      />

      {/* Expense Form Modal */}
      <ExpenseFormModal
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
        onSuccess={() => fetchCommonData()}
        vehicles={vehicles}
        defaultVehicleId={defaultExpenseVehicleId}
      />

      {/* Document Upload & Digital Sign-off Modal */}
      <DocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onSuccess={() => fetchCommonData()}
        vehicles={vehicles}
        workers={workers}
        initialMode={documentModalMode}
      />

      {/* Driver Multilingual AI Voice Reporting Modal */}
      <DriverVoiceReportingModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSuccess={() => fetchCommonData()}
      />

      {/* Live Voice Conversation Modal (Live API gemini-3.1-flash-live-preview) */}
      <LiveVoiceConversationModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />

      {/* Fleet Intelligence Hub Modal (Google Search Grounding & Maps Grounding) */}
      <FleetIntelligenceHubModal
        isOpen={isFleetHubOpen}
        onClose={() => setIsFleetHubOpen(false)}
      />

      {/* KHYBER CORE Multi-Channel Gateway Hub Modal */}
      <KhyberCoreHubModal
        isOpen={isKhyberCoreModalOpen}
        onClose={() => setIsKhyberCoreModalOpen(false)}
        currentViewName={currentView}
      />

      {/* Universal Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        message={deleteModalState.message}
        confirmLabel="Yes, Delete Permanently"
        confirmVariant="danger"
        onConfirm={deleteModalState.onConfirm}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Adsterra Ad Network Components */}
      <AdsterraManagerModal />
      <AdsterraSocialBar />
    </div>
  );
}
