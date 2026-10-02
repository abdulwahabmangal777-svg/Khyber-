import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Contact,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Building2,
  MapPin,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Truck,
  ShieldCheck,
  LogOut,
  UserCheck,
  Briefcase,
  IdCard,
  ArrowRight
} from 'lucide-react';
import { useGoogleWorkspace } from '../context/GoogleWorkspaceContext';
import { GoogleSignInButton } from '../components/workspace/GoogleSignInButton';
import {
  fetchGoogleContacts,
  searchGoogleContacts,
  createGoogleContact,
  updateGoogleContact,
  deleteGoogleContact,
  syncWorkerToGoogleContacts,
  GoogleContact,
  NewContactPayload
} from '../services/contactsApi';
import { WorkspaceConfirmDialog } from '../components/workspace/WorkspaceConfirmDialog';
import { Worker, Vehicle } from '../types';

interface GoogleContactsViewProps {
  workers?: Worker[];
  vehicles?: Vehicle[];
  onOpenWorker?: (id: string) => void;
  onOpenVehicle?: (id: string) => void;
}

export const GoogleContactsView: React.FC<GoogleContactsViewProps> = ({
  workers = [],
  vehicles = [],
  onOpenWorker,
  onOpenVehicle
}) => {
  const { user, accessToken, isAuthenticated, isLoading: authLoading, signIn, signOut } = useGoogleWorkspace();

  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'DRIVERS' | 'WITH_PHONE' | 'WITH_EMAIL'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<GoogleContact | null>(null);
  const [formData, setFormData] = useState<NewContactPayload>({
    givenName: '',
    familyName: '',
    email: '',
    phone: '',
    company: 'Saudi Fleet & Logistics Operations',
    jobTitle: '',
    department: 'Fleet & Logistics',
    notes: '',
    address: 'Riyadh, Kingdom of Saudi Arabia'
  });

  // Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedWorkerIdsToSync, setSelectedWorkerIdsToSync] = useState<string[]>([]);
  const [syncingWorkers, setSyncingWorkers] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'CREATE_CONTACT' | 'UPDATE_CONTACT' | 'DELETE_CONTACT' | 'SYNC_CONTACTS';
    title: string;
    description: string;
    details?: { label: string; value: string | React.ReactNode }[];
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    type: 'CREATE_CONTACT',
    title: '',
    description: '',
    onConfirm: () => {}
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Load Contacts
  const loadContacts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGoogleContacts(accessToken, 100);
      setContacts(data.connections || []);
    } catch (err: any) {
      console.error('Failed to load Google Contacts:', err);
      setError(err.message || 'Failed to load Google Contacts.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      loadContacts();
    }
  }, [accessToken, loadContacts]);

  // Handle Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!searchQuery.trim()) {
      loadContacts();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await searchGoogleContacts(accessToken, searchQuery);
      setContacts(results);
    } catch (err: any) {
      console.error('Error searching contacts:', err);
      setError(err.message || 'Failed to search contacts');
    } finally {
      setLoading(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingContact(null);
    setFormData({
      givenName: '',
      familyName: '',
      email: '',
      phone: '+966 ',
      company: 'Saudi Fleet & Logistics',
      jobTitle: 'Driver / Logistics Staff',
      department: 'Logistics Operations',
      notes: '',
      address: 'Riyadh, Saudi Arabia'
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (contact: GoogleContact) => {
    setEditingContact(contact);
    const name = contact.names?.[0];
    const email = contact.emailAddresses?.[0]?.value || '';
    const phone = contact.phoneNumbers?.[0]?.value || '';
    const org = contact.organizations?.[0];
    const note = contact.biographies?.[0]?.value || '';
    const addr = contact.addresses?.[0]?.formattedValue || '';

    setFormData({
      givenName: name?.givenName || name?.displayName || '',
      familyName: name?.familyName || '',
      email,
      phone,
      company: org?.name || '',
      jobTitle: org?.title || '',
      department: org?.department || '',
      notes: note,
      address: addr
    });
    setIsFormModalOpen(true);
  };

  // Submit Contact Form (Create or Update)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.givenName.trim()) return;

    if (editingContact) {
      // Update
      setConfirmDialog({
        isOpen: true,
        type: 'UPDATE_CONTACT',
        title: 'Update Google Contact',
        description: `Are you sure you want to update contact details for "${formData.givenName} ${formData.familyName || ''}"?`,
        details: [
          { label: 'Name', value: `${formData.givenName} ${formData.familyName || ''}`.trim() },
          { label: 'Phone', value: formData.phone || 'N/A' },
          { label: 'Email', value: formData.email || 'N/A' },
          { label: 'Role / Title', value: formData.jobTitle || 'N/A' },
          { label: 'Organization', value: formData.company || 'N/A' }
        ],
        onConfirm: async () => {
          if (!accessToken || !editingContact) return;
          setActionLoading(true);
          try {
            await updateGoogleContact(accessToken, editingContact.resourceName, editingContact.etag, formData);
            setIsFormModalOpen(false);
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            await loadContacts();
          } catch (err: any) {
            setError(err.message || 'Failed to update contact');
          } finally {
            setActionLoading(false);
          }
        }
      });
    } else {
      // Create
      setConfirmDialog({
        isOpen: true,
        type: 'CREATE_CONTACT',
        title: 'Create Google Contact',
        description: `Add "${formData.givenName} ${formData.familyName || ''}" to your authenticated Google Contacts?`,
        details: [
          { label: 'Name', value: `${formData.givenName} ${formData.familyName || ''}`.trim() },
          { label: 'Phone', value: formData.phone || 'N/A' },
          { label: 'Email', value: formData.email || 'N/A' },
          { label: 'Role / Title', value: formData.jobTitle || 'N/A' },
          { label: 'Company', value: formData.company || 'Saudi Fleet Operations' }
        ],
        onConfirm: async () => {
          if (!accessToken) return;
          setActionLoading(true);
          try {
            await createGoogleContact(accessToken, formData);
            setIsFormModalOpen(false);
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            await loadContacts();
          } catch (err: any) {
            setError(err.message || 'Failed to create contact');
          } finally {
            setActionLoading(false);
          }
        }
      });
    }
  };

  // Delete Contact with Mandatory Workspace Confirmation Dialog
  const handleDeleteContact = (contact: GoogleContact) => {
    const displayName = contact.names?.[0]?.displayName || 'Selected Contact';
    const email = contact.emailAddresses?.[0]?.value || 'N/A';
    const phone = contact.phoneNumbers?.[0]?.value || 'N/A';

    setConfirmDialog({
      isOpen: true,
      type: 'DELETE_CONTACT',
      isDestructive: true,
      title: 'Delete Google Contact',
      description: `This action will permanently delete "${displayName}" from your Google Contacts address book.`,
      details: [
        { label: 'Contact', value: displayName },
        { label: 'Email', value: email },
        { label: 'Phone', value: phone },
        { label: 'Resource ID', value: contact.resourceName }
      ],
      onConfirm: async () => {
        if (!accessToken) return;
        setActionLoading(true);
        try {
          await deleteGoogleContact(accessToken, contact.resourceName);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          await loadContacts();
        } catch (err: any) {
          setError(err.message || 'Failed to delete contact');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Sync selected Fleet Workers directly to Google Contacts
  const handleConfirmSyncWorkers = () => {
    if (selectedWorkerIdsToSync.length === 0) return;

    const selectedWorkersList = workers.filter(w => selectedWorkerIdsToSync.includes(w.id));

    setConfirmDialog({
      isOpen: true,
      type: 'SYNC_CONTACTS',
      title: 'Sync Fleet Workforce to Google Contacts',
      description: `You are about to export and sync ${selectedWorkersList.length} Saudi Fleet driver(s) and staff member(s) into your Google Contacts address book.`,
      details: [
        {
          label: 'Workers Count',
          value: `${selectedWorkersList.length} employee(s)`
        },
        {
          label: 'Personnel',
          value: selectedWorkersList.map(w => `${w.fullName} (${w.jobTitle || 'Staff'})`).slice(0, 4).join(', ') + (selectedWorkersList.length > 4 ? ` and ${selectedWorkersList.length - 4} more` : '')
        },
        {
          label: 'Metadata Included',
          value: 'Saudi Mobile #, Work Email, Iqama ID, Fleet Role, Assigned Vehicle Plate'
        }
      ],
      onConfirm: async () => {
        if (!accessToken) return;
        setSyncingWorkers(true);
        setActionLoading(true);
        let count = 0;

        try {
          for (const w of selectedWorkersList) {
            const assignedVehicle = vehicles.find(v => v.assignedWorkerId === w.id);
            await syncWorkerToGoogleContacts(accessToken, {
              name: w.fullName,
              jobTitle: w.jobTitle,
              department: w.department || 'Logistics & Fleet',
              phone: w.mobileNumber,
              email: w.email,
              iqamaNumber: w.iqamaNumber,
              nationality: w.nationality,
              workerId: w.employeeId,
              assignedVehiclePlate: assignedVehicle?.plateNumber
            });
            count++;
          }

          setSyncSuccessMessage(`Successfully synced ${count} fleet personnel to Google Contacts!`);
          setTimeout(() => setSyncSuccessMessage(null), 5000);
          setIsSyncModalOpen(false);
          setSelectedWorkerIdsToSync([]);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          await loadContacts();
        } catch (err: any) {
          console.error('Sync failed:', err);
          setError(err.message || 'Failed during sync to Google Contacts');
        } finally {
          setSyncingWorkers(false);
          setActionLoading(false);
        }
      }
    });
  };

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const name = c.names?.[0]?.displayName || '';
      const email = c.emailAddresses?.[0]?.value || '';
      const phone = c.phoneNumbers?.[0]?.value || '';
      const title = c.organizations?.[0]?.title || '';
      const org = c.organizations?.[0]?.name || '';

      // Search query filter (client-side fallback)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          name.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q) ||
          org.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (filterCategory === 'DRIVERS') {
        const isDriver =
          title.toLowerCase().includes('driver') ||
          title.toLowerCase().includes('سائق') ||
          org.toLowerCase().includes('fleet') ||
          c.userDefined?.some(u => u.key.toLowerCase().includes('vehicle') || u.key.toLowerCase().includes('iqama'));
        return isDriver;
      }
      if (filterCategory === 'WITH_PHONE') {
        return !!phone;
      }
      if (filterCategory === 'WITH_EMAIL') {
        return !!email;
      }

      return true;
    });
  }, [contacts, searchQuery, filterCategory]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // If not authenticated, display Google Workspace Login Hero
  if (!isAuthenticated || !accessToken) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-slate-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-amber-500/20 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 mb-4">
              <Contact className="w-3.5 h-3.5" />
              <span>Google People & Contacts API</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Fleet Workforce & Google Contacts
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Connect your Google Workspace account to seamlessly sync drivers, fleet technicians, logistics coordinators, and emergency contacts. Directly dial, message via WhatsApp, and manage your Saudi fleet contacts address book.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <GoogleSignInButton className="shadow-lg shadow-amber-950/50" />
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">1-Click Driver Sync</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export and keep your workforce, driver phone numbers, Saudi Iqamas, and vehicle plates updated in Google Contacts automatically.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Direct Driver Dispatch</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instant click-to-call and WhatsApp routing directly from contact cards for logistics coordinators and dispatch managers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Secure OAuth 2.0</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              All credentials are kept in-memory with granular Google People API permissions and strict confirmation checks on modifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
              <Contact className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Google Contacts</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  {contacts.length} Contacts
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Connected as <span className="font-semibold text-slate-700">{user?.email || 'Google User'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadContacts}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5"
            title="Refresh contacts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedWorkerIdsToSync(workers.map(w => w.id));
              setIsSyncModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sync Fleet Workers ({workers.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-colors flex items-center gap-1.5 shadow-xs shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Contact</span>
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Disconnect Google Account"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Success Alert */}
      {syncSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email, vehicle plate, or role..."
            className="w-full pl-9 pr-20 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                loadContacts();
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterCategory === 'ALL'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('DRIVERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 ${
              filterCategory === 'DRIVERS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Fleet & Drivers</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('WITH_PHONE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterCategory === 'WITH_PHONE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            With Phone
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('WITH_EMAIL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterCategory === 'WITH_EMAIL'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            With Email
          </button>
        </div>
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading contacts from Google People API...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Contact className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No contacts found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `No contacts matched "${searchQuery}". Try a different keyword or clear the search.`
              : 'Your Google Contacts address book is currently empty. Create a new contact or sync your Fleet workforce.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
            >
              Add First Contact
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedWorkerIdsToSync(workers.map(w => w.id));
                setIsSyncModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              Sync Fleet Workforce
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => {
            const displayName = contact.names?.[0]?.displayName || 'Unnamed Contact';
            const email = contact.emailAddresses?.[0]?.value;
            const phone = contact.phoneNumbers?.[0]?.value;
            const organization = contact.organizations?.[0]?.name;
            const title = contact.organizations?.[0]?.title;
            const department = contact.organizations?.[0]?.department;
            const photoUrl = contact.photos?.[0]?.url;
            const address = contact.addresses?.[0]?.formattedValue;
            const notes = contact.biographies?.[0]?.value;
            const userFields = contact.userDefined || [];

            const isDriver =
              title?.toLowerCase().includes('driver') ||
              title?.toLowerCase().includes('سائق') ||
              userFields.some(u => u.key.toLowerCase().includes('vehicle'));

            // Initials
            const initials = String(displayName || 'U')
              .split(' ')
              .filter(Boolean)
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'U';

            // WhatsApp link helper (remove +, spaces, hyphens)
            const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
            const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

            return (
              <div
                key={contact.resourceName}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md hover:border-amber-300/80 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Photo + Name + Role */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            isDriver
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {initials || <Contact className="w-5 h-5" />}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate leading-tight group-hover:text-amber-700 transition-colors">
                          {displayName}
                        </h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {title || department || 'Google Contact'}
                        </p>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(contact)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Organization & Tags */}
                  {(organization || isDriver) && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {organization && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60 truncate max-w-full flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{organization}</span>
                        </span>
                      )}
                      {isDriver && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-amber-600" />
                          <span>Fleet Driver</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Contact Info Items */}
                  <div className="space-y-2 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {/* Phone */}
                    {phone ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <a
                            href={`tel:${phone}`}
                            className="font-medium text-slate-800 hover:underline hover:text-amber-700 truncate"
                          >
                            {phone}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(phone, `phone-${contact.resourceName}`)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Copy phone"
                        >
                          {copiedId === `phone-${contact.resourceName}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span className="italic">No phone number</span>
                      </div>
                    )}

                    {/* Email */}
                    {email ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <a
                            href={`mailto:${email}`}
                            className="font-medium text-slate-800 hover:underline hover:text-blue-700 truncate"
                          >
                            {email}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(email, `email-${contact.resourceName}`)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Copy email"
                        >
                          {copiedId === `email-${contact.resourceName}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="italic">No email address</span>
                      </div>
                    )}

                    {/* Custom User Defined Fields (e.g. Iqama, Vehicle) */}
                    {userFields.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1">
                        {userFields.map((uf, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">{uf.key}:</span>
                            <span className="font-semibold text-slate-800">{uf.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Address */}
                    {address && (
                      <div className="flex items-start gap-2 text-[11px] text-slate-500 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Fast Dispatch Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {phone && (
                      <>
                        <a
                          href={`tel:${phone}`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>

                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </>
                    )}

                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const summary = [
                        displayName,
                        phone ? `Phone: ${phone}` : '',
                        email ? `Email: ${email}` : '',
                        title ? `Title: ${title}` : '',
                        organization ? `Company: ${organization}` : ''
                      ].filter(Boolean).join('\n');
                      copyToClipboard(summary, `card-${contact.resourceName}`);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Copy full vCard info"
                  >
                    {copiedId === `card-${contact.resourceName}` ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Contact className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingContact ? 'Edit Google Contact' : 'Add New Google Contact'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Syncs directly with your Google Workspace address book
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First / Given Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.givenName}
                    onChange={e => setFormData({ ...formData, givenName: e.target.value })}
                    placeholder="e.g. Captain Ahmed"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Family / Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.familyName || ''}
                    onChange={e => setFormData({ ...formData, familyName: e.target.value })}
                    placeholder="e.g. Al-Harbi"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Phone #
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+966 50 123 4567"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="driver@saudifleet.com.sa"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization / Company
                  </label>
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Saudi Fleet Operations"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Job Title / Role
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle || ''}
                    onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="e.g. Heavy Truck Driver / Logistics Coordinator"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Logistics & Supply Chain"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Location / Address
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Riyadh Depot, Saudi Arabia"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Saudi Compliance (Iqama, Vehicle, etc.)
                </label>
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Iqama: 2450123456, Assigned Plate: 1234-ABC, Emergency contact..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-colors shadow-xs"
                >
                  {editingContact ? 'Save Changes' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync Fleet Workforce Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Sync Fleet Workforce to Google Contacts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select personnel to export to your Google Contacts with verified Saudi mobile & Iqama info
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Bar */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                {selectedWorkerIdsToSync.length} of {workers.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkerIdsToSync(workers.map(w => w.id))}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedWorkerIdsToSync([])}
                  className="font-semibold text-slate-500 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Workers List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100">
              {workers.map(worker => {
                const isSelected = selectedWorkerIdsToSync.includes(worker.id);
                const assignedVehicle = vehicles.find(v => v.assignedWorkerId === worker.id);

                return (
                  <div
                    key={worker.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedWorkerIdsToSync(prev => prev.filter(id => id !== worker.id));
                      } else {
                        setSelectedWorkerIdsToSync(prev => [...prev, worker.id]);
                      }
                    }}
                    className={`pt-2.5 first:pt-0 flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected ? 'bg-blue-50/60 border border-blue-200/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div
                        className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {worker.fullName}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {worker.jobTitle || 'Fleet Staff'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                          <span>📱 {worker.mobileNumber || 'N/A'}</span>
                          <span>🪪 Iqama: {worker.iqamaNumber || 'N/A'}</span>
                          {assignedVehicle && (
                            <span className="text-amber-700 font-medium">
                              🚚 {assignedVehicle.plateNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                      {worker.department || 'Operations'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                disabled={syncingWorkers}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSyncWorkers}
                disabled={syncingWorkers || selectedWorkerIdsToSync.length === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
              >
                {syncingWorkers && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Sync {selectedWorkerIdsToSync.length} to Google Contacts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Google Workspace Action Confirmation Dialog */}
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
