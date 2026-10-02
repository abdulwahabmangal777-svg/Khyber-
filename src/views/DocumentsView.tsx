import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  ExternalLink,
  UploadCloud,
  FileSpreadsheet,
  Truck,
  Users,
  ShieldCheck,
  Calendar,
  PenTool,
  CheckSquare
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel, exportToPdf } from '../utils/export';
import { DocumentItem, Vehicle, Worker } from '../types';

interface DocumentsViewProps {
  onOpenDocumentUpload: () => void;
  onOpenDocumentSign?: () => void;
  onOpenVehicle: (id: string) => void;
  onOpenWorker: (id: string) => void;
  vehicles: Vehicle[];
  workers: Worker[];
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  onOpenDocumentUpload,
  onOpenDocumentSign,
  onOpenVehicle,
  onOpenWorker,
  vehicles,
  workers
}) => {
  const { t, formatDate, formatDaysRemainingText } = useLanguage();
  const { token, hasRole } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<'ALL' | 'VEHICLE' | 'WORKER'>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.data || []);
        setDocuments(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.warn('Notice: Documents fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document copy?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        setDocuments(docs => (Array.isArray(docs) ? docs : []).filter(d => d.id !== id));
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const safeDocuments = Array.isArray(documents) ? documents : [];

  const filteredDocs = safeDocuments.filter(d => {
    if (entityFilter !== 'ALL' && d.entityType !== entityFilter) return false;
    if (docTypeFilter !== 'ALL' && d.docType !== docTypeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (d.fileName || '').toLowerCase().includes(q);
      const matchNum = (d.docNumber || '').toLowerCase().includes(q);
      const matchEntity = (d.entityName || '').toLowerCase().includes(q);
      if (!matchName && !matchNum && !matchEntity) return false;
    }

    return true;
  });

  const handleExportExcel = () => {
    const data = filteredDocs.map(d => ({
      'Document Name': d.fileName,
      'Target Entity': d.entityName,
      'Type': d.entityType,
      'Document Category': d.docType,
      'Document #': d.docNumber,
      'Expiry Date': d.expiryDate || 'N/A',
      'Uploaded By': d.uploadedBy,
      'Upload Date': d.createdAt?.slice(0, 10)
    }));
    exportToExcel(data, 'Saudi_Document_Archive', 'Documents');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-800" />
            <span>{t.documents} ({documents.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central Digital Vault for Istimara, Iqamas, Passports, Insurance Policies, Invoices & Inspection Certificates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
            <span>{t.exportExcel}</span>
          </button>

          {hasRole('ADMIN', 'MANAGER', 'HR', 'DRIVER') && onOpenDocumentSign && (
            <button
              type="button"
              onClick={onOpenDocumentSign}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <PenTool className="w-4 h-4 text-emerald-300" />
              <span>Digital Handover Sign-off (توقيع واستلام)</span>
            </button>
          )}

          {hasRole('ADMIN', 'MANAGER', 'HR') && (
            <button
              type="button"
              onClick={onOpenDocumentUpload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t.uploadDocument}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by file name, document #, entity name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">All Targets (Vehicles & Workers)</option>
            <option value="VEHICLE">Fleet Vehicles Only</option>
            <option value="WORKER">Workers Only</option>
          </select>

          <select
            value={docTypeFilter}
            onChange={e => setDocTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">All Document Types</option>
            <option value="ISTIMARA">Istimara Registration</option>
            <option value="IQAMA">Saudi Iqama</option>
            <option value="INSURANCE">Insurance Policy</option>
            <option value="INSPECTION">MVPI Fahs Inspection</option>
            <option value="PASSPORT">Passport</option>
            <option value="DRIVER_LICENSE">Driver License</option>
            <option value="WORK_PERMIT">Qiwa Work Permit</option>
            <option value="INVOICE">Invoices</option>
          </select>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading document archives...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">{t.noRecordsFound}</p>
            <p className="text-xs text-slate-400 mt-1">No documents match the active filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Document / File Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Associated Entity</th>
                  <th className="py-3 px-4">Document #</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    {/* File Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-950 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{doc.fileName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{doc.fileSize || 'PDF Document'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {doc.docType}
                      </span>
                    </td>

                    {/* Associated Entity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div
                        onClick={() => {
                          if (doc.entityType === 'VEHICLE') onOpenVehicle(doc.entityId);
                          else onOpenWorker(doc.entityId);
                        }}
                        className="cursor-pointer hover:underline flex items-center gap-1.5 font-bold text-slate-800"
                      >
                        {doc.entityType === 'VEHICLE' ? (
                          <Truck className="w-3.5 h-3.5 text-emerald-800" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-emerald-800" />
                        )}
                        <span>{doc.entityName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{doc.entityType}</div>
                    </td>

                    {/* Doc Number */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-700">
                      {doc.docNumber || '—'}
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-900">
                      {doc.expiryDate ? formatDate(doc.expiryDate) : <span className="text-slate-400">Non-expiring</span>}
                    </td>

                    {/* Uploaded By */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      <div>{doc.uploadedBy}</div>
                      <div className="text-[10px] text-slate-400">{doc.createdAt?.slice(0, 10)}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-1">
                        {doc.fileData && (
                          <a
                            href={doc.fileData}
                            download={doc.fileName}
                            title="Download Document"
                            className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (doc.entityType === 'VEHICLE') onOpenVehicle(doc.entityId);
                            else onOpenWorker(doc.entityId);
                          }}
                          title="Open 360° Profile"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-950 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete Document"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
