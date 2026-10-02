import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  PenTool,
  CheckSquare,
  ClipboardList,
  ShieldCheck,
  Truck,
  UserCheck,
  Calendar,
  Sparkles,
  Plus,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { Vehicle, Worker } from '../types';
import { DigitalSignaturePad } from './common/DigitalSignaturePad';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles: Vehicle[];
  workers: Worker[];
  defaultEntityType?: 'VEHICLE' | 'WORKER';
  defaultEntityId?: string;
  initialMode?: 'UPLOAD' | 'SIGN';
}

type SignTemplateType = 'VEHICLE_HANDOVER' | 'MAINTENANCE_SIGNOFF' | 'PRE_TRIP_INSPECTION' | 'FIELD_TOOL_CUSTODY' | 'CUSTOM_DECLARATION';

interface ChecklistItem {
  id: string;
  label: string;
  labelAr: string;
  checked: boolean;
}

const TEMPLATE_PRESETS: Record<SignTemplateType, { title: string; titleAr: string; docType: string; items: Array<{ label: string; labelAr: string }> }> = {
  VEHICLE_HANDOVER: {
    title: 'Vehicle & Equipment Handover Custody Form',
    titleAr: 'محضر تسليم واستلام مركبة ومعدات عهدة',
    docType: 'CONTRACT',
    items: [
      { label: 'Vehicle Body & Exterior Cleanliness Checked', labelAr: 'فحص سلامة الهيكل الخارجي والنظافة' },
      { label: 'Current Odometer & Fuel Level Verified', labelAr: 'مطابقة قراءة العداد ومستوى الوقود' },
      { label: 'Tires, Spare Wheel & Tire Pressure Inspected', labelAr: 'فحص الإطارات والعجلة الاحتياطية' },
      { label: 'Vehicle Istimara & Insurance Card in Vehicle', labelAr: 'وجود الاستمارة والتأمين في المركبة' },
      { label: 'Fuel Card / Waee RFID Tag Verified Present', labelAr: 'وجود بطاقة الوقود / شريحة واعي' },
      { label: 'Fire Extinguisher & First Aid Kit Checked', labelAr: 'جاهزية طفاية الحريق وحقيبة الإسعافات' },
      { label: 'Jack, Lug Wrench & Emergency Triangle Present', labelAr: 'وجود رافعة الإطارات وعدة الطوارئ' },
      { label: 'Air Conditioning & Cabin Electronics Operational', labelAr: 'عمل التكييف والأنظمة الكهربائية' }
    ]
  },
  MAINTENANCE_SIGNOFF: {
    title: 'Workshop Maintenance Release & Acceptance Sign-off',
    titleAr: 'محضر استلام وإفراج صيانة من الورشة',
    docType: 'INVOICE',
    items: [
      { label: 'Repair Scope Completed per Work Order', labelAr: 'إتمام أعمال الإصلاح طبقاً لأمر العمل' },
      { label: 'Old Replaced Parts Inspected & Accounted For', labelAr: 'معاينة واستلام القطع القديمة المستبدلة' },
      { label: 'Engine Oil, Coolant & Fluid Levels Checked', labelAr: 'فحص منسوب زيت المحرك وسوائل التبريد' },
      { label: 'Brake Response & Road Test Drive Approved', labelAr: 'اختبار القيادة واستجابة الفرامل' },
      { label: 'Dashboard Warning Lights & Fault Codes Cleared', labelAr: 'خلو شاشة الطبلون من إشارات الأعطال' },
      { label: 'Workshop Invoice & Warranty Terms Verified', labelAr: 'مطابقة فاتورة الورشة وشروط الضمان' }
    ]
  },
  PRE_TRIP_INSPECTION: {
    title: 'Daily Pre-Trip Driver Safety & Compliance Checklist',
    titleAr: 'فحص ما قبل الرحلة والسلامة اليومية للسائق',
    docType: 'OTHER',
    items: [
      { label: 'Headlights, Blinkers & Brake Lights Working', labelAr: 'عمل كافة المصابيح والإشارات والفرامل' },
      { label: 'Brake Fluid & Engine Oil Levels Normal', labelAr: 'مستوى زيت المحرك وسوائل الفرامل سليم' },
      { label: 'Windshield Wipers & Washer Fluid Operational', labelAr: 'عمل مساحات الزجاج ومياه الغسيل' },
      { label: 'Side Mirrors & Rearview Adjusted Properly', labelAr: 'ضبط المرايا الجانبية والرؤية الخلفية' },
      { label: 'Driver Iqama & Saudi License Valid for Route', labelAr: 'سريان الإقامة ورخصة القيادة للرحلة' },
      { label: 'Cargo Load Securely Tied & Weight Compliant', labelAr: 'تثبيت الحمولة ومطابقة الوزن المسموح' }
    ]
  },
  FIELD_TOOL_CUSTODY: {
    title: 'Field Equipment & Heavy Tool Custody Sign-off',
    titleAr: 'نموذج تسليم عهدة أجهزة ومعدات ميدانية',
    docType: 'CONTRACT',
    items: [
      { label: 'Diagnostic Scanners & Handheld Devices Received', labelAr: 'استلام أجهزة الفحص الميدانية والماسحات' },
      { label: 'Power Tools, Cables & Chargers Operational', labelAr: 'سلامة العدد الكهربائية والكابلات' },
      { label: 'Safety PPE (Helmet, High-Vis Vest, Boots) Issued', labelAr: 'استلام مهمات السلامة والوقاية الشخصية' },
      { label: 'Storage Cases & Lockboxes in Secure Condition', labelAr: 'سلامة حقائب التخزين والأقفال' }
    ]
  },
  CUSTOM_DECLARATION: {
    title: 'Custom Electronic Declaration & Sign-off',
    titleAr: 'إقرار وتوقيع إلكتروني مخصص',
    docType: 'OTHER',
    items: [
      { label: 'All Equipment & Assets Received as Listed', labelAr: 'استلام كافة الأصول والمعدات المذكورة' },
      { label: 'Terms and Operating Policies Accepted', labelAr: 'الموافقة على شروط وسياسات التشغيل' },
      { label: 'Condition Verified and Certified by Signer', labelAr: 'إقرار الحالة الفنية المعتمدة من الموقع' }
    ]
  }
};

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vehicles,
  workers,
  defaultEntityType = 'VEHICLE',
  defaultEntityId = '',
  initialMode = 'UPLOAD'
}) => {
  const { t, formatDate } = useLanguage();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'SIGN'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common Entity Selection
  const [entityType, setEntityType] = useState<'VEHICLE' | 'WORKER'>(defaultEntityType);
  const [entityId, setEntityId] = useState(
    defaultEntityId || (defaultEntityType === 'VEHICLE' ? vehicles[0]?.id : workers[0]?.id) || ''
  );

  // Upload Mode State
  const [docType, setDocType] = useState('ISTIMARA');
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fileData, setFileData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');

  // Sign Mode State
  const [signTemplate, setSignTemplate] = useState<SignTemplateType>('VEHICLE_HANDOVER');
  const [signerRole, setSignerRole] = useState<'RECEIVING_DRIVER' | 'SUPERVISOR' | 'WORKSHOP_TECH' | 'DISPATCHER'>('RECEIVING_DRIVER');
  const [signerName, setSignerName] = useState('');
  const [signerIdNumber, setSignerIdNumber] = useState('');
  const [conditionRating, setConditionRating] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'DEFECTS_NOTED'>('GOOD');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);

  // Sync signer name with selected entity or user
  useEffect(() => {
    if (entityType === 'WORKER') {
      const matched = workers.find(w => w.id === entityId);
      if (matched) {
        setSignerName(matched.fullName);
        setSignerIdNumber(matched.iqamaNumber || matched.employeeId);
      }
    } else {
      const v = vehicles.find(veh => veh.id === entityId);
      if (v?.driver) {
        setSignerName(v.driver.fullName);
        setSignerIdNumber(v.driver.iqamaNumber || v.driver.employeeId);
      } else if (user) {
        setSignerName(user.fullName);
        setSignerIdNumber(user.username);
      }
    }
  }, [entityType, entityId, vehicles, workers, user]);

  // Load checklist items when template changes
  useEffect(() => {
    const preset = TEMPLATE_PRESETS[signTemplate];
    if (preset) {
      setChecklistItems(
        preset.items.map((item, idx) => ({
          id: `item-${idx}-${Date.now()}`,
          label: item.label,
          labelAr: item.labelAr,
          checked: true
        }))
      );
    }
  }, [signTemplate]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('File size must not exceed 15MB');
      return;
    }

    setFileName(file.name);
    setFileSize(`${(file.size / 1024 / 1024).toFixed(2)} MB`);

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklistItems(prev => prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const handleAddCustomChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    setChecklistItems(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label: newChecklistText.trim(),
        labelAr: newChecklistText.trim(),
        checked: true
      }
    ]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems(prev => prev.filter(item => item.id !== id));
  };

  // Helper to draw and render full high-resolution handover certificate with signature
  const generateSignoffCertificatePng = (options: {
    title: string;
    entityName: string;
    entitySub: string;
    docNumber: string;
    checklist: Array<{ label: string; checked: boolean }>;
    signerName: string;
    signerRole: string;
    signerId: string;
    condition: string;
    notes: string;
    dateStr: string;
    signatureDataUrl: string;
  }): Promise<string> => {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(options.signatureDataUrl);
        return;
      }

      // Certificate dimensions: 1200 x 1600 px (3:4 ratio for printing/archiving)
      canvas.width = 1200;
      canvas.height = 1600;

      // Clean background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1200, 1600);

      // Outer formal border
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 14;
      ctx.strokeRect(20, 20, 1160, 1560);

      ctx.strokeStyle = '#d1fae5';
      ctx.lineWidth = 3;
      ctx.strokeRect(34, 34, 1132, 1532);

      // Top Header Ribbon
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(38, 38, 1124, 160);

      // Saudi Emblem / Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KINGDOM OF SAUDI ARABIA • FLEET LOGISTICS OPERATIONS', 600, 95);

      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(options.title, 600, 140);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText(`Certificate Ref: ${options.docNumber} • Generated: ${options.dateStr}`, 600, 175);

      // Target Entity Details Card
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(60, 220, 1080, 160);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 220, 1080, 160);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`Target Asset / Custodian: ${options.entityName}`, 85, 265);

      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`Details: ${options.entitySub}`, 85, 300);
      ctx.fillText(`Condition Rating: ${options.condition.toUpperCase()} | Signer: ${options.signerName} (${options.signerRole})`, 85, 335);
      if (options.signerId) {
        ctx.fillText(`Signer Iqama / Employee ID: ${options.signerId}`, 85, 365);
      }

      // Checklist Inspection Audit Section
      ctx.fillStyle = '#064e3b';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('INSPECTION & HANDOVER CHECKLIST AUDIT (قائمة الفحص والمطابقة):', 60, 420);

      const startY = 465;
      options.checklist.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 60 + col * 550;
        const y = startY + row * 46;

        // Checkbox box
        ctx.strokeStyle = item.checked ? '#059669' : '#94a3b8';
        ctx.fillStyle = item.checked ? '#ecfdf5' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y - 20, 24, 24);
        ctx.strokeRect(x, y - 20, 24, 24);

        if (item.checked) {
          ctx.fillStyle = '#059669';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✓', x + 5, y - 1);
        }

        ctx.fillStyle = item.checked ? '#0f172a' : '#64748b';
        ctx.font = item.checked ? 'bold 16px sans-serif' : '16px sans-serif';
        ctx.fillText(item.label, x + 34, y - 2);
      });

      const checklistRows = Math.ceil(options.checklist.length / 2);
      const notesY = startY + checklistRows * 46 + 25;

      // Remarks Box
      ctx.fillStyle = '#064e3b';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('HANDOVER REMARKS & DEFECT OBSERVATIONS (ملاحظات التسليم):', 60, notesY);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(60, notesY + 12, 1080, 90);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(60, notesY + 12, 1080, 90);

      ctx.fillStyle = '#334155';
      ctx.font = 'italic 17px sans-serif';
      ctx.fillText(
        options.notes || 'All items inspected and verified in operational compliance without unrecorded defects.',
        80,
        notesY + 55
      );

      // Legal Custody Declaration
      const legalY = notesY + 130;
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('LEGAL ACKNOWLEDGMENT & CUSTODY DECLARATION (إقرار الاستلام والمسؤولية):', 60, legalY);

      ctx.fillStyle = '#475569';
      ctx.font = '15px sans-serif';
      const legalText =
        'I hereby confirm that I have inspected and received the above asset/equipment in good condition. I accept operational responsibility in compliance with Saudi transport regulations and corporate fleet policies.';
      ctx.fillText(legalText.slice(0, 115), 60, legalY + 26);
      ctx.fillText(legalText.slice(115), 60, legalY + 48);

      // Signature Card
      const signBoxY = legalY + 80;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(60, signBoxY, 1080, 270);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, signBoxY, 1080, 270);

      ctx.fillStyle = '#064e3b';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('AUTHORIZED DIGITAL SIGNATURE (التوقيع الإلكتروني المعتمد):', 85, signBoxY + 36);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`Signer Name: ${options.signerName}`, 85, signBoxY + 70);
      ctx.fillText(`Role / Capacity: ${options.signerRole}`, 85, signBoxY + 98);
      ctx.fillText(`National ID / Iqama: ${options.signerId || 'Verified on file'}`, 85, signBoxY + 126);
      ctx.fillText(`Signed Timestamp: ${options.dateStr} (KSA)`, 85, signBoxY + 154);
      ctx.fillText('Verification: Saudi Electronic Transactions Compliance', 85, signBoxY + 182);

      // Render the digital signature image onto the certificate
      const sigImg = new Image();
      sigImg.crossOrigin = 'anonymous';
      sigImg.onload = () => {
        ctx.drawImage(sigImg, 640, signBoxY + 20, 480, 230);

        // Bottom Footer
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(38, 1520, 1124, 42);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SAUDI ARABIA FLEET & WORKFORCE MANAGEMENT SYSTEM • CERTIFIED DIGITAL AUDIT ARCHIVE', 600, 1547);

        resolve(canvas.toDataURL('image/png'));
      };
      sigImg.onerror = () => {
        resolve(canvas.toDataURL('image/png'));
      };
      sigImg.src = options.signatureDataUrl;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId) {
      setError('Please select a target Vehicle or Worker');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalFileName = fileName;
      let finalFileData = fileData;
      let finalFileSize = fileSize || '1.5 MB';
      let finalDocType = docType;
      let finalDocNumber = docNumber;
      let finalNotes = notes;

      // When submitting Digital Sign-off Mode
      if (activeTab === 'SIGN') {
        if (!signatureDataUrl || isSignatureEmpty) {
          throw new Error('Please provide your digital signature on the signature pad before submitting.');
        }

        const preset = TEMPLATE_PRESETS[signTemplate];
        const selectedVehicle = entityType === 'VEHICLE' ? vehicles.find(v => v.id === entityId) : null;
        const selectedWorker = entityType === 'WORKER' ? workers.find(w => w.id === entityId) : null;

        const entityLabel = selectedVehicle
          ? `${selectedVehicle.internalVehicleId} - ${selectedVehicle.plateNumber} (${selectedVehicle.make} ${selectedVehicle.model})`
          : selectedWorker
          ? `${selectedWorker.fullName} (EMP ID: ${selectedWorker.employeeId})`
          : 'Asset';

        const entitySub = selectedVehicle
          ? `Plate: ${selectedVehicle.plateNumber} | VIN: ${selectedVehicle.vin || 'N/A'} | Department: ${selectedVehicle.departmentName || 'Fleet'}`
          : selectedWorker
          ? `Iqama: ${selectedWorker.iqamaNumber} | Job Title: ${selectedWorker.jobTitle} | Dept: ${selectedWorker.departmentName || 'Operations'}`
          : 'Asset';

        finalDocNumber = docNumber || `SIGN-${signTemplate.slice(0, 4)}-${Date.now().toString().slice(-6)}`;
        finalDocType = preset.docType;
        finalFileName = `${preset.title.replace(/\s+/g, '_')}_${finalDocNumber}.png`;

        const timestampStr = new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Riyadh',
          dateStyle: 'medium',
          timeStyle: 'short'
        });

        // Generate complete certificate image
        finalFileData = await generateSignoffCertificatePng({
          title: preset.title,
          entityName: entityLabel,
          entitySub,
          docNumber: finalDocNumber,
          checklist: checklistItems.map(c => ({ label: c.label, checked: c.checked })),
          signerName: signerName || user?.fullName || 'Authorized Signer',
          signerRole: signerRole.replace('_', ' '),
          signerId: signerIdNumber,
          condition: conditionRating,
          notes,
          dateStr: timestampStr,
          signatureDataUrl
        });

        finalFileSize = `${(finalFileData.length / 1024 / 1.33 / 1024).toFixed(2)} MB`;
        finalNotes = `Digital Sign-off: ${preset.title}. Signer: ${signerName} (${signerRole}). Condition: ${conditionRating}. ${notes}`;
      } else {
        // Upload Mode Validation
        if (!fileName || !fileData) {
          throw new Error('Please choose a file or document copy to upload');
        }
        finalDocNumber = docNumber || `${docType}-${Date.now().toString().slice(-4)}`;
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: getAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          entityType,
          entityId,
          docType: finalDocType,
          docNumber: finalDocNumber,
          fileName: finalFileName,
          fileData: finalFileData,
          fileSize: finalFileSize,
          mimeType: activeTab === 'SIGN' ? 'image/png' : 'application/pdf',
          expiryDate: expiryDate || undefined,
          notes: finalNotes,
          uploadedBy: user?.fullName || 'Admin User'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save document');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTab === 'SIGN' ? (
              <PenTool className="w-5 h-5 text-emerald-400" />
            ) : (
              <UploadCloud className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <h2 className="text-sm font-bold">
                {activeTab === 'SIGN'
                  ? 'Digital Handover & Maintenance Sign-off'
                  : t.uploadDocument}
              </h2>
              <p className="text-[11px] text-emerald-200">
                {activeTab === 'SIGN'
                  ? 'Mobile canvas signature pad for equipment handover & inspection checklists'
                  : 'Central vault for Istimara, Iqama, MVPI & Insurance archives'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-slate-100 p-1.5 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('UPLOAD')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'UPLOAD'
                ? 'bg-white text-emerald-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-700" />
            <span>Upload File / Copy (رفع ملف)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SIGN')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'SIGN'
                ? 'bg-white text-emerald-950 shadow-xs border border-slate-200 ring-2 ring-emerald-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4 text-emerald-700" />
            <span>Digital Sign-off & Checklist (توقيع واستلام)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Entity Selection (Shared) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Target Entity (الجهة المعنية)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEntityType('VEHICLE');
                    setEntityId(vehicles[0]?.id || '');
                    if (activeTab === 'UPLOAD') setDocType('ISTIMARA');
                  }}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    entityType === 'VEHICLE'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-600 ring-2 ring-emerald-200'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Fleet Vehicle (مركبة)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntityType('WORKER');
                    setEntityId(workers[0]?.id || '');
                    if (activeTab === 'UPLOAD') setDocType('IQAMA');
                  }}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    entityType === 'WORKER'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-600 ring-2 ring-emerald-200'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Worker / Driver (موظف)</span>
                </button>
              </div>
            </div>

            {/* Target Item Dropdown */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Select {entityType === 'VEHICLE' ? 'Vehicle' : 'Worker'}
              </label>
              <select
                value={entityId}
                onChange={e => setEntityId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600"
              >
                {entityType === 'VEHICLE'
                  ? vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.internalVehicleId} - {v.plateNumber} ({v.make} {v.model}) - {v.departmentName || 'Fleet'}
                      </option>
                    ))
                  : workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.fullName} ({w.employeeId}) - Iqama: {w.iqamaNumber} - {w.jobTitle}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: UPLOAD EXISTING FILE                                              */}
          {/* ========================================================================= */}
          {activeTab === 'UPLOAD' && (
            <div className="space-y-4">
              {/* Document Type & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Document Category</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                  >
                    {entityType === 'VEHICLE' ? (
                      <>
                        <option value="ISTIMARA">Istimara Registration (استمارة)</option>
                        <option value="INSURANCE">Insurance Policy (وثيقة تأمين)</option>
                        <option value="INSPECTION">MVPI Fahs Periodic (فحص دوري)</option>
                        <option value="INVOICE">Service Invoice (فاتورة)</option>
                        <option value="OTHER">Other Document (أخرى)</option>
                      </>
                    ) : (
                      <>
                        <option value="IQAMA">Saudi Iqama / ID (إقامة / هوية)</option>
                        <option value="PASSPORT">Passport (جواز سفر)</option>
                        <option value="WORK_PERMIT">Work Permit / Qiwa (رخصة عمل)</option>
                        <option value="MEDICAL_INSURANCE">Medical Insurance CCHI (تأمين طبي)</option>
                        <option value="DRIVER_LICENSE">Saudi Driving License (رخصة قيادة)</option>
                        <option value="CONTRACT">Employment Contract (عقد عمل)</option>
                        <option value="OTHER">Other Document (أخرى)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Document Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* Document Number */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Document / Certificate #</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value)}
                  placeholder="e.g. 2491028475 or POL-99214"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              {/* File Upload Box */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Select File (PDF, PNG, JPG)</label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-700 bg-slate-50 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-8 h-8 text-emerald-800 mx-auto mb-1.5" />
                  {fileName ? (
                    <div className="text-emerald-950 font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        {fileName} ({fileSize})
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-slate-800">Click or drag file to attach</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Maximum file size: 15MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Remarks / Reference Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional archival notes..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DIGITAL SIGN-OFF & CHECKLIST                                      */}
          {/* ========================================================================= */}
          {activeTab === 'SIGN' && (
            <div className="space-y-4">
              {/* Template Preset Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-emerald-700" />
                  <span>Checklist & Handover Template</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(TEMPLATE_PRESETS) as SignTemplateType[]).map(key => {
                    const tpl = TEMPLATE_PRESETS[key];
                    const isSelected = signTemplate === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSignTemplate(key)}
                        className={`p-2.5 rounded-xl border text-left rtl:text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-200 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold text-xs">{tpl.title}</div>
                        <div className="text-[11px] text-slate-500 font-arabic mt-0.5">{tpl.titleAr}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checklist Items Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-700" />
                    <span>Inspection Items ({checklistItems.filter(c => c.checked).length}/{checklistItems.length} Verified)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Tap item to toggle check</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {checklistItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer select-none transition-colors ${
                        item.checked
                          ? 'bg-white border-emerald-200 text-slate-900'
                          : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${
                            item.checked
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                        <span className="font-medium text-[11px]">{item.label}</span>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveChecklistItem(item.id);
                        }}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Remove item"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Custom Checklist Item */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    placeholder="Add custom inspection check..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomChecklistItem(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomChecklistItem}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 font-bold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Signer Details & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Signer Full Name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    placeholder="Signer Name"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Signer Capacity / Role</label>
                  <select
                    value={signerRole}
                    onChange={e => setSignerRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900"
                  >
                    <option value="RECEIVING_DRIVER">Receiving Driver (سائق مستلم)</option>
                    <option value="SUPERVISOR">Fleet Supervisor (مشرف أسطول)</option>
                    <option value="WORKSHOP_TECH">Workshop Mechanic (مهندس ورشة)</option>
                    <option value="DISPATCHER">Logistics Dispatcher (مأمور حركة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Overall Condition</label>
                  <select
                    value={conditionRating}
                    onChange={e => setConditionRating(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900"
                  >
                    <option value="EXCELLENT">Excellent (ممتاز)</option>
                    <option value="GOOD">Good / Operational (جيد - جاهز)</option>
                    <option value="FAIR">Fair (مقبول)</option>
                    <option value="DEFECTS_NOTED">Defects Noted (يوجد ملاحظات)</option>
                  </select>
                </div>
              </div>

              {/* Remarks / Observations */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Handover Notes & Observations</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Scratches on rear bumper, odometer at 42,150 KM, tools verified."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                />
              </div>

              {/* Digital Canvas Signature Pad */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Digital Signature Pad (لوحة التوقيع الإلكتروني)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Use finger, stylus or mouse</span>
                </label>

                <DigitalSignaturePad
                  onSignatureChange={(sig, isEmpty) => {
                    setSignatureDataUrl(sig);
                    setIsSignatureEmpty(isEmpty);
                  }}
                  signerName={signerName}
                  signerRole={signerRole.replace('_', ' ')}
                  signerIdNumber={signerIdNumber}
                  height={175}
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Saudi Electronic Records Compliance</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={loading || (activeTab === 'SIGN' && isSignatureEmpty)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : activeTab === 'SIGN' ? (
                  <>
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Sign & Generate Certificate</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Save & Attach</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

