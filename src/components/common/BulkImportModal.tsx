import React, { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Download,
  RefreshCw,
  Truck,
  Users,
  Check,
  HelpCircle,
  Info,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { safeFetch } from '../../utils/api';

export interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'VEHICLES' | 'WORKERS';
  departments?: { id: string; name: string; nameAr?: string; code?: string }[];
  existingVehicles?: { plateNumber: string; vin?: string; internalVehicleId?: string }[];
  existingWorkers?: { iqamaNumber: string; employeeId?: string; fullName?: string }[];
  onSuccess?: (importedCount: number) => void;
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
  normalized: Record<string, any>;
  status: 'VALID' | 'DUPLICATE' | 'INVALID';
  errors: string[];
  warnings: string[];
  selected: boolean;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  type,
  departments = [],
  existingVehicles = [],
  existingWorkers = [],
  onSuccess
}) => {
  const { language, dir, t } = useLanguage();
  const { token } = useAuth();

  const [step, setStep] = useState<'UPLOAD' | 'PREVIEW' | 'RESULT'>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [skipErrors, setSkipErrors] = useState(true);

  // Result state
  const [resultSummary, setResultSummary] = useState<{
    importedCount: number;
    skippedCount: number;
    skippedList: { row: number; reason: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isVehicle = type === 'VEHICLES';

  // Download sample template (Excel / CSV)
  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    let sampleData: Record<string, any>[] = [];

    if (isVehicle) {
      sampleData = [
        {
          'Plate Digits': '4821',
          'Plate Letters': 'ABC',
          'Make': 'Toyota',
          'Model': 'Hilux 4x4',
          'Year': 2024,
          'Color': 'White',
          'VIN': '1HGCR2F83HA009121',
          'Vehicle Type': 'Pickup',
          'Department': 'Logistics & Distribution',
          'Mileage (KM)': 34500,
          'Fuel Type': 'DIESEL',
          'Ownership': 'OWNED',
          'Istimara Expiry (YYYY-MM-DD)': '2027-06-15',
          'Insurance Company': 'Tawuniya Insurance',
          'Insurance Expiry (YYYY-MM-DD)': '2026-12-30',
          'MVPI Inspection Expiry': '2026-09-10',
          'Status': 'ACTIVE'
        },
        {
          'Plate Digits': '9204',
          'Plate Letters': 'XYZ',
          'Make': 'Isuzu',
          'Model': 'NPR 75 Cargo',
          'Year': 2023,
          'Color': 'Blue',
          'VIN': 'JALC4B182HA004519',
          'Vehicle Type': 'Truck',
          'Department': 'Operations',
          'Mileage (KM)': 61200,
          'Fuel Type': 'DIESEL',
          'Ownership': 'OWNED',
          'Istimara Expiry (YYYY-MM-DD)': '2027-03-20',
          'Insurance Company': 'Al Rajhi Takaful',
          'Insurance Expiry (YYYY-MM-DD)': '2026-11-15',
          'MVPI Inspection Expiry': '2026-10-05',
          'Status': 'ACTIVE'
        },
        {
          'Plate Digits': '1150',
          'Plate Letters': 'RST',
          'Make': 'Hyundai',
          'Model': 'Elantra GL',
          'Year': 2024,
          'Color': 'Silver',
          'VIN': 'KMHD84LF7HA008321',
          'Vehicle Type': 'Sedan',
          'Department': 'Executive Fleet',
          'Mileage (KM)': 18900,
          'Fuel Type': 'GASOLINE_91',
          'Ownership': 'LEASED',
          'Istimara Expiry (YYYY-MM-DD)': '2027-08-01',
          'Insurance Company': 'Medgulf',
          'Insurance Expiry (YYYY-MM-DD)': '2027-01-20',
          'MVPI Inspection Expiry': '2026-12-15',
          'Status': 'ACTIVE'
        }
      ];
    } else {
      sampleData = [
        {
          'Employee ID': 'EMP-1081',
          'Full Name (English)': 'Fahad Mohammed Al-Otaibi',
          'Full Name (Arabic)': 'فهد محمد العتيبي',
          'Saudi Iqama / National ID': '1084729184',
          'Nationality': 'Saudi',
          'Job Title': 'Fleet Operations Supervisor',
          'Department': 'Operations',
          'Mobile Phone': '+966501234567',
          'Email': 'fahad.otaibi@fleet.sa',
          'Basic Salary (SAR)': 8500,
          'Iqama Expiry (YYYY-MM-DD)': '2028-01-01',
          'Driver License #': '1084729184',
          'Driver License Expiry': '2028-05-10',
          'Status': 'ACTIVE'
        },
        {
          'Employee ID': 'EMP-1082',
          'Full Name (English)': 'Rahim Khan Durrani',
          'Full Name (Arabic)': 'رحيم خان دراني',
          'Saudi Iqama / National ID': '2481920394',
          'Nationality': 'Pakistani',
          'Job Title': 'Heavy Truck Driver',
          'Department': 'Logistics & Distribution',
          'Mobile Phone': '+966559876543',
          'Email': 'rahim.khan@fleet.sa',
          'Basic Salary (SAR)': 5200,
          'Iqama Expiry (YYYY-MM-DD)': '2026-11-20',
          'Passport #': 'PK9812736',
          'Passport Expiry': '2027-04-15',
          'Driver License #': '2481920394',
          'Driver License Expiry': '2026-12-01',
          'Status': 'ACTIVE'
        },
        {
          'Employee ID': 'EMP-1083',
          'Full Name (English)': 'Ahmed Mahmoud Soliman',
          'Full Name (Arabic)': 'أحمد محمود سليمان',
          'Saudi Iqama / National ID': '2519283746',
          'Nationality': 'Egyptian',
          'Job Title': 'Delivery Van Driver',
          'Department': 'Logistics & Distribution',
          'Mobile Phone': '+966543219876',
          'Email': 'ahmed.soliman@fleet.sa',
          'Basic Salary (SAR)': 4800,
          'Iqama Expiry (YYYY-MM-DD)': '2027-02-15',
          'Passport #': 'A18273645',
          'Passport Expiry': '2028-08-30',
          'Driver License #': '2519283746',
          'Driver License Expiry': '2027-03-10',
          'Status': 'ACTIVE'
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isVehicle ? 'Vehicles' : 'Workforce');

    const fileName = isVehicle 
      ? `Fleet_Vehicles_Template.${format}` 
      : `Fleet_Workforce_Template.${format}`;

    if (format === 'csv') {
      XLSX.writeFile(wb, fileName, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
    }
  };

  // Process and normalize uploaded file
  const processUploadedFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          alert('The uploaded spreadsheet contains no data rows.');
          setIsParsing(false);
          return;
        }

        // Sets for tracking duplicates inside the file itself
        const inBatchPlates = new Set<string>();
        const inBatchVins = new Set<string>();
        const inBatchIqamas = new Set<string>();

        const existingPlateSet = new Set(
          existingVehicles.map(v => (v.plateNumber || '').replace(/\s+/g, '').toUpperCase())
        );
        const existingVinSet = new Set(
          existingVehicles.map(v => (v.vin || '').trim().toUpperCase()).filter(Boolean)
        );
        const existingIqamaSet = new Set(
          existingWorkers.map(w => (w.iqamaNumber || '').replace(/\D/g, '')).filter(Boolean)
        );

        const rows: ParsedRow[] = rawJson.map((row, index) => {
          const rowNumber = index + 1;
          const errors: string[] = [];
          const warnings: string[] = [];
          const normalized: Record<string, any> = {};

          // Helper to get value from multiple possible header keys
          const getValue = (...keys: string[]) => {
            for (const key of keys) {
              for (const [k, v] of Object.entries(row)) {
                if (k.trim().toLowerCase() === key.toLowerCase()) {
                  return String(v).trim();
                }
              }
            }
            return '';
          };

          if (isVehicle) {
            let digits = getValue('plate digits', 'digits', 'plate #', 'رقم اللوحة', 'platedigits');
            let letters = getValue('plate letters', 'letters', 'أحرف اللوحة', 'plateletters', 'platelettersen').toUpperCase();
            const combinedPlate = getValue('plate number', 'plate', 'اللوحة', 'platenumber');

            if ((!digits || !letters) && combinedPlate) {
              const match = combinedPlate.match(/^(\d{1,4})[\s\-_]*([A-Za-z]{1,4})/);
              if (match) {
                digits = match[1];
                letters = match[2].toUpperCase();
              }
            }

            const make = getValue('make', 'brand', 'الماركة', 'الشركة المصنعة');
            const model = getValue('model', 'الطراز', 'الموديل');
            let vin = getValue('vin', 'vin number', 'chassis number', 'رقم الهيكل').toUpperCase();
            const year = parseInt(getValue('year', 'السنة', 'سنة الصنع'), 10) || new Date().getFullYear();
            const color = getValue('color', 'اللون') || 'White';
            const department = getValue('department', 'القسم', 'الإدارة', 'dept');
            const vehicleType = getValue('vehicle type', 'type', 'نوع المركبة') || 'Sedan';
            const ownership = getValue('ownership', 'ownership type', 'نوع الملكية') || 'OWNED';
            const mileage = parseInt(getValue('mileage (km)', 'mileage', 'current mileage', 'قراءة العداد'), 10) || 0;
            const fuelType = getValue('fuel type', 'fuel', 'نوع الوقود') || 'DIESEL';
            const istimaraExpiry = getValue('istimara expiry (yyyy-mm-dd)', 'istimara expiry', 'انتهاء الاستمارة');
            const insuranceExpiry = getValue('insurance expiry (yyyy-mm-dd)', 'insurance expiry', 'انتهاء التأمين');
            const inspectionExpiry = getValue('mvpi inspection expiry', 'inspection expiry', 'انتهاء الفحص الدوري');

            normalized.plateDigits = digits;
            normalized.plateLettersEn = letters;
            normalized.plateNumber = digits && letters ? `${digits} ${letters}` : combinedPlate;
            normalized.make = make;
            normalized.model = model;
            normalized.vin = vin;
            normalized.year = year;
            normalized.color = color;
            normalized.department = department;
            normalized.vehicleType = vehicleType;
            normalized.ownershipType = ownership;
            normalized.currentMileage = mileage;
            normalized.fuelType = fuelType;
            normalized.istimaraExpiry = istimaraExpiry;
            normalized.insuranceExpiry = insuranceExpiry;
            normalized.inspectionExpiry = inspectionExpiry;

            // Validation
            if (!digits || !letters) {
              errors.push(language === 'ar' ? 'أرقام أو حروف اللوحة مفقودة' : 'Plate digits or letters missing');
            } else {
              const cleanPlate = `${digits}${letters}`.toUpperCase();
              if (existingPlateSet.has(cleanPlate)) {
                warnings.push(language === 'ar' ? 'اللوحة مسجلة مسبقاً في النظام' : 'Plate already exists in database');
              }
              if (inBatchPlates.has(cleanPlate)) {
                errors.push(language === 'ar' ? 'لوحة مكررة داخل ملف الاستيراد' : 'Duplicate plate within this file');
              }
              inBatchPlates.add(cleanPlate);
            }

            if (!make) errors.push(language === 'ar' ? 'الماركة مطلوبة' : 'Make is required');
            if (!model) errors.push(language === 'ar' ? 'الموديل مطلوب' : 'Model is required');

            if (vin) {
              if (existingVinSet.has(vin)) {
                warnings.push(language === 'ar' ? 'رقم الهيكل مسجل مسبقاً' : 'VIN already exists in database');
              }
              if (inBatchVins.has(vin)) {
                errors.push(language === 'ar' ? 'رقم هيكل مكرر داخل الملف' : 'Duplicate VIN within this file');
              }
              inBatchVins.add(vin);
            }

          } else {
            // Worker parsing
            const fullName = getValue('full name (english)', 'full name', 'worker name', 'name', 'اسم الموظف', 'الاسم الكامل');
            const fullNameAr = getValue('full name (arabic)', 'arabic name', 'الاسم بالعربي');
            const rawIqama = getValue('saudi iqama / national id', 'saudi iqama', 'iqama number', 'national id', 'iqama', 'رقم الهوية / الإقامة', 'رقم الإقامة');
            const cleanIqama = rawIqama.replace(/\D/g, '');
            const nationality = getValue('nationality', 'الجنسية') || 'Saudi';
            const jobTitle = getValue('job title', 'role', 'designation', 'المسمى الوظيفي', 'المهنة') || 'Driver';
            const mobilePhone = getValue('mobile phone', 'mobile', 'phone', 'رقم الجوال', 'الهاتف');
            const email = getValue('email', 'البريد الإلكتروني');
            const department = getValue('department', 'القسم', 'الإدارة');
            const salary = parseFloat(getValue('basic salary (sar)', 'basic salary', 'salary', 'الراتب الأساسي')) || 4500;
            const iqamaExpiry = getValue('iqama expiry (yyyy-mm-dd)', 'iqama expiry', 'انتهاء الإقامة');
            const licenseNumber = getValue('driver license #', 'license number', 'رقم رخصة القيادة');
            const licenseExpiry = getValue('driver license expiry', 'license expiry', 'انتهاء رخصة القيادة');

            normalized.fullName = fullName;
            normalized.fullNameAr = fullNameAr;
            normalized.iqamaNumber = cleanIqama;
            normalized.nationality = nationality;
            normalized.jobTitle = jobTitle;
            normalized.mobileNumber = mobilePhone;
            normalized.email = email;
            normalized.department = department;
            normalized.salary = salary;
            normalized.iqamaExpiry = iqamaExpiry;
            normalized.driverLicenseNumber = licenseNumber;
            normalized.driverLicenseExpiry = licenseExpiry;

            // Worker validation
            if (!fullName) {
              errors.push(language === 'ar' ? 'اسم الموظف مطلوب' : 'Full name is required');
            }

            if (!cleanIqama) {
              errors.push(language === 'ar' ? 'رقم الإقامة/الهوية مطلوب' : 'Iqama/National ID is required');
            } else if (cleanIqama.length !== 10) {
              errors.push(language === 'ar' ? 'رقم الهوية/الإقامة يجب أن يتكون من 10 أرقام' : 'Saudi ID must be exactly 10 digits');
            } else if (!cleanIqama.startsWith('1') && !cleanIqama.startsWith('2')) {
              errors.push(language === 'ar' ? 'يجب أن يبدأ بـ 1 (مواطن) أو 2 (مقيم)' : 'Must begin with 1 (Citizen) or 2 (Resident)');
            } else {
              if (existingIqamaSet.has(cleanIqama)) {
                warnings.push(language === 'ar' ? 'رقم الهوية مسجل مسبقاً في النظام' : 'Iqama already exists in database');
              }
              if (inBatchIqamas.has(cleanIqama)) {
                errors.push(language === 'ar' ? 'رقم هوية مكرر داخل الملف' : 'Duplicate Iqama in this file');
              }
              inBatchIqamas.add(cleanIqama);
            }
          }

          let status: 'VALID' | 'DUPLICATE' | 'INVALID' = 'VALID';
          if (errors.length > 0) {
            status = 'INVALID';
          } else if (warnings.length > 0) {
            status = 'DUPLICATE';
          }

          return {
            rowNumber,
            data: row,
            normalized,
            status,
            errors,
            warnings,
            selected: status !== 'INVALID'
          };
        });

        setParsedRows(rows);
        setStep('PREVIEW');
      } catch (err: any) {
        console.error('File parsing error:', err);
        alert(language === 'ar' ? 'تعذر قراءة الملف. تأكد من سلامة التنسيق.' : 'Failed to parse file. Please verify format.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Filtered rows for the preview table
  const filteredRows = useMemo(() => {
    return parsedRows.filter(row => {
      if (statusFilter === 'VALID' && row.status !== 'VALID') return false;
      if (statusFilter === 'ERRORS' && row.status === 'VALID') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (isVehicle) {
          const matchPlate = (row.normalized.plateNumber || '').toLowerCase().includes(q);
          const matchMake = (row.normalized.make || '').toLowerCase().includes(q);
          const matchModel = (row.normalized.model || '').toLowerCase().includes(q);
          const matchVin = (row.normalized.vin || '').toLowerCase().includes(q);
          return matchPlate || matchMake || matchModel || matchVin;
        } else {
          const matchName = (row.normalized.fullName || '').toLowerCase().includes(q);
          const matchIqama = (row.normalized.iqamaNumber || '').includes(q);
          const matchJob = (row.normalized.jobTitle || '').toLowerCase().includes(q);
          return matchName || matchIqama || matchJob;
        }
      }
      return true;
    });
  }, [parsedRows, statusFilter, searchQuery, isVehicle]);

  // Counts
  const validCount = parsedRows.filter(r => r.status === 'VALID').length;
  const duplicateCount = parsedRows.filter(r => r.status === 'DUPLICATE').length;
  const errorCount = parsedRows.filter(r => r.status === 'INVALID').length;
  const selectedCount = parsedRows.filter(r => r.selected).length;

  const toggleSelectAll = (checked: boolean) => {
    setParsedRows(prev => prev.map(r => ({
      ...r,
      selected: checked && r.status !== 'INVALID'
    })));
  };

  const toggleRowSelect = (rowNumber: number) => {
    setParsedRows(prev => prev.map(r => {
      if (r.rowNumber === rowNumber) {
        return { ...r, selected: !r.selected };
      }
      return r;
    }));
  };

  // Submit bulk import payload
  const handleExecuteImport = async () => {
    const selectedRows = parsedRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      alert(language === 'ar' ? 'الرجاء تحديد سجل واحد على الأقل للاستيراد' : 'Please select at least one record to import');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isVehicle ? '/api/vehicles/bulk-import' : '/api/workers/bulk-import';
      const payload = {
        items: selectedRows.map(r => r.normalized),
        skipErrors
      };

      const res = await safeFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, token);

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Import failed');
      }

      setResultSummary({
        importedCount: json.importedCount ?? json.count ?? selectedRows.length,
        skippedCount: json.skippedCount ?? 0,
        skippedList: (json.skipped || []).map((s: any) => ({
          row: s.row,
          reason: s.reason
        }))
      });

      if (onSuccess) {
        onSuccess(json.importedCount ?? selectedRows.length);
      }

      setStep('RESULT');
    } catch (err: any) {
      console.error('Import execution error:', err);
      alert(err.message || 'Error occurred during bulk import');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setParsedRows([]);
    setStep('UPLOAD');
    setResultSummary(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        id="bulk-import-modal-container"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        dir={dir}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isVehicle ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            }`}>
              {isVehicle ? <Truck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {isVehicle ? t.bulkImportVehicles : t.bulkImportWorkers}
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  CSV / XLSX
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVehicle
                  ? (language === 'ar' ? 'رفع وتدقيق أسطول المركبات دفعة واحدة مع التحقق من الهيكل واللوحة' : 'Upload and validate bulk fleet vehicle records with plate and VIN checks')
                  : (language === 'ar' ? 'رفع وتدقيق سجلات الكادر والموظفين مع التحقق من أرقام الإقامات السعودية' : 'Upload and validate employee datasets with Saudi Iqama verification')}
              </p>
            </div>
          </div>

          <button
            id="close-bulk-import-btn"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500">
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 ${step === 'UPLOAD' ? 'text-blue-600 dark:text-blue-400 font-bold' : step === 'PREVIEW' || step === 'RESULT' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'UPLOAD' ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {step === 'PREVIEW' || step === 'RESULT' ? '✓' : '1'}
              </span>
              <span>{language === 'ar' ? 'رفع الملف' : 'Upload File'}</span>
            </div>

            <span className="text-slate-300 dark:text-slate-700">→</span>

            <div className={`flex items-center gap-2 ${step === 'PREVIEW' ? 'text-blue-600 dark:text-blue-400 font-bold' : step === 'RESULT' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'PREVIEW' ? 'bg-blue-600 text-white' : step === 'RESULT' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
              }`}>
                {step === 'RESULT' ? '✓' : '2'}
              </span>
              <span>{language === 'ar' ? 'المعاينة والتدقيق' : 'Preview & Validate'}</span>
            </div>

            <span className="text-slate-300 dark:text-slate-700">→</span>

            <div className={`flex items-center gap-2 ${step === 'RESULT' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'RESULT' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
              }`}>
                3
              </span>
              <span>{language === 'ar' ? 'النتائج' : 'Results'}</span>
            </div>
          </div>

          {step === 'PREVIEW' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">{language === 'ar' ? 'الملف:' : 'File:'}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{file?.name}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: UPLOAD & TEMPLATE */}
          {step === 'UPLOAD' && (
            <div className="space-y-6 animate-fade-in">
              {/* Template Download Card */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                      {language === 'ar' ? 'تحميل نموذج الإدخال الجاهز' : 'Download Standardized Template'}
                    </h4>
                    <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                      {language === 'ar'
                        ? 'تجنب أخطاء التنسيق باستعمال النموذج المهيأ مسبقاً بأعمدة وأمثلة مطابقة للنظام السعودي.'
                        : 'Avoid formatting discrepancies with pre-configured columns tailored for Saudi fleet records.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="download-template-xlsx-btn"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    id="download-template-csv-btn"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div
                id="bulk-import-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processUploadedFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 shadow-inner">
                  {isParsing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {isParsing
                    ? (language === 'ar' ? 'جارٍ قراءة وفحص بيانات الملف...' : 'Parsing and analyzing spreadsheet...')
                    : (language === 'ar' ? 'اسحب وأفلت الملف هنا، أو انقر للاختيار' : 'Drag and drop your spreadsheet here, or click to browse')}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {language === 'ar'
                    ? 'يدعم ملفات Microsoft Excel (.xlsx, .xls) وملفات القيم المفصولة بفواصل (.csv) حتى 5,000 سجل'
                    : 'Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files up to 5,000 records'}
                </p>
              </div>

              {/* Saudi Compliance & Requirements Checklist */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-700/60">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>{language === 'ar' ? 'متطلبات التدقيق والتحقق' : 'Data Verification Rules'}</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                  {isVehicle ? (
                    <>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? 'رقم اللوحة: أرقام (1-4) وحروف إنجليزية (1-3) أو عربية' : 'Plate: Digits (1-4) and English (1-3) or Arabic letters'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? 'رقم الهيكل VIN: 17 خانة فريدة تمنع التكرار في الأسطول' : 'VIN: 17-character unique identifier preventing duplicates'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? 'الماركة والموديل: حقول إلزامية لتصنيف المركبة' : 'Make & Model: Required fields for fleet categorization'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? 'تواريخ الانتهاء: يفضل تنسيق YYYY-MM-DD لتفعيل التنبيهات' : 'Expiry Dates: Standard YYYY-MM-DD triggers alerts engine'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? 'الهوية / الإقامة: 10 أرقام تبدأ بـ 1 (مواطن) أو 2 (مقيم)' : 'Saudi ID: 10 numeric digits starting with 1 (Citizen) or 2 (Muqeem)'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? 'الاسم الكامل: إلزامي باللغة الإنجليزية أو العربية' : 'Full Name: Mandatory employee identifier'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? 'رقم الجوال: يدعم التنسيق السعودي (+966 5X...)' : 'Mobile: Formats standard Saudi numbers automatically'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? 'الربط التلقائي: يتم مطابقة الأقسام وسيارات السائقين آلياً' : 'Auto-linking: Departments and vehicle assignments mapped automatically'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATE */}
          {step === 'PREVIEW' && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{language === 'ar' ? 'إجمالي السجلات' : 'Total Rows'}</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{parsedRows.length}</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{language === 'ar' ? 'جاهز للاستيراد' : 'Valid & Ready'}</div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{validCount}</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">{language === 'ar' ? 'مسجل مسبقاً' : 'Existing Duplicates'}</div>
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{duplicateCount}</div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                  <div className="text-xs text-rose-700 dark:text-rose-400 font-medium">{language === 'ar' ? 'أخطاء بيانات' : 'Invalid Rows'}</div>
                  <div className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">{errorCount}</div>
                </div>
              </div>

              {/* Filters & Actions Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800">
                    <button
                      id="filter-all-rows-btn"
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        statusFilter === 'ALL'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {language === 'ar' ? 'الكل' : 'All'} ({parsedRows.length})
                    </button>
                    <button
                      id="filter-valid-rows-btn"
                      onClick={() => setStatusFilter('VALID')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        statusFilter === 'VALID'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {language === 'ar' ? 'الصحيحة فقط' : 'Valid Only'} ({validCount})
                    </button>
                    <button
                      id="filter-error-rows-btn"
                      onClick={() => setStatusFilter('ERRORS')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        statusFilter === 'ERRORS'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {language === 'ar' ? 'الأخطاء والتعارضات' : 'Errors & Conflicts'} ({errorCount + duplicateCount})
                    </button>
                  </div>

                  <input
                    id="search-parsed-rows-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'بحث في البيانات المقروءة...' : 'Search in parsed records...'}
                    className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={skipErrors}
                      onChange={(e) => setSkipErrors(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{language === 'ar' ? 'تجاوز الأخطاء واستيراد الصحيح' : 'Skip errors and import valid'}</span>
                  </label>

                  <button
                    id="reupload-file-btn"
                    onClick={resetAll}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'ملف آخر' : 'Change File'}</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700 z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCount > 0 && selectedCount === (validCount + duplicateCount)}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="p-3 w-14 text-center">#</th>
                        <th className="p-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                        {isVehicle ? (
                          <>
                            <th className="p-3">{language === 'ar' ? 'رقم اللوحة' : 'Plate'}</th>
                            <th className="p-3">{language === 'ar' ? 'الماركة والموديل' : 'Make & Model'}</th>
                            <th className="p-3">{language === 'ar' ? 'رقم الهيكل VIN' : 'VIN'}</th>
                            <th className="p-3">{language === 'ar' ? 'القسم' : 'Department'}</th>
                            <th className="p-3">{language === 'ar' ? 'انتهاء الاستمارة' : 'Istimara Expiry'}</th>
                          </>
                        ) : (
                          <>
                            <th className="p-3">{language === 'ar' ? 'اسم الموظف' : 'Full Name'}</th>
                            <th className="p-3">{language === 'ar' ? 'الهوية / الإقامة' : 'Iqama / National ID'}</th>
                            <th className="p-3">{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</th>
                            <th className="p-3">{language === 'ar' ? 'الجوال' : 'Mobile'}</th>
                            <th className="p-3">{language === 'ar' ? 'القسم' : 'Department'}</th>
                          </>
                        )}
                        <th className="p-3">{language === 'ar' ? 'الملاحظات / الأخطاء' : 'Details / Reason'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/60 font-sans">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={isVehicle ? 8 : 8} className="p-8 text-center text-slate-400">
                            {language === 'ar' ? 'لا توجد سجلات تطابق الفلتر المحدد' : 'No records match the selected filter'}
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => {
                          const isInvalid = row.status === 'INVALID';
                          const isDuplicate = row.status === 'DUPLICATE';

                          return (
                            <tr
                              key={row.rowNumber}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                                isInvalid
                                  ? 'bg-rose-50/40 dark:bg-rose-950/10'
                                  : isDuplicate
                                  ? 'bg-amber-50/40 dark:bg-amber-950/10'
                                  : ''
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isInvalid}
                                  checked={row.selected}
                                  onChange={() => toggleRowSelect(row.rowNumber)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                                />
                              </td>
                              <td className="p-3 text-center text-slate-400 font-mono">
                                {row.rowNumber}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {isInvalid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400">
                                    <XCircle className="w-3 h-3" />
                                    <span>{language === 'ar' ? 'غير صالح' : 'Invalid'}</span>
                                  </span>
                                ) : isDuplicate ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{language === 'ar' ? 'مكرر' : 'Duplicate'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{language === 'ar' ? 'جاهز' : 'Valid'}</span>
                                  </span>
                                )}
                              </td>

                              {isVehicle ? (
                                <>
                                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">
                                    {row.normalized.plateNumber || '—'}
                                  </td>
                                  <td className="p-3">
                                    <span className="font-semibold">{row.normalized.make}</span>{' '}
                                    <span className="text-slate-500">{row.normalized.model}</span>{' '}
                                    <span className="text-xs text-slate-400">({row.normalized.year})</span>
                                  </td>
                                  <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                    {row.normalized.vin || '—'}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">
                                    {row.normalized.department || 'General'}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">
                                    {row.normalized.istimaraExpiry || '—'}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                                    {row.normalized.fullName || '—'}
                                  </td>
                                  <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                                    {row.normalized.iqamaNumber || '—'}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">
                                    {row.normalized.jobTitle || '—'}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                                    {row.normalized.mobileNumber || '—'}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">
                                    {row.normalized.department || 'General'}
                                  </td>
                                </>
                              )}

                              <td className="p-3 text-xs max-w-xs truncate">
                                {row.errors.length > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                                    {row.errors.join(' • ')}
                                  </span>
                                ) : row.warnings.length > 0 ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    {row.warnings.join(' • ')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">
                                    {language === 'ar' ? 'تم التحقق بنجاح' : 'Ready for database write'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT REPORT */}
          {step === 'RESULT' && resultSummary && (
            <div className="space-y-6 py-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {language === 'ar' ? 'اكتمل الاستيراد الجماعي بنجاح!' : 'Bulk Import Completed!'}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {isVehicle
                    ? (language === 'ar' 
                        ? `تمت إضافة ${resultSummary.importedCount} مركبة بنجاح إلى قاعدة بيانات الأسطول.` 
                        : `Successfully added ${resultSummary.importedCount} vehicles to fleet inventory.`)
                    : (language === 'ar'
                        ? `تمت إضافة ${resultSummary.importedCount} موظف بنجاح إلى سجلات الموارد البشرية والكادر.`
                        : `Successfully added ${resultSummary.importedCount} worker records to personnel directory.`)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-6 max-w-sm mx-auto">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex-1">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{language === 'ar' ? 'تم إدراجه' : 'Imported'}</div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{resultSummary.importedCount}</div>
                </div>

                {resultSummary.skippedCount > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex-1">
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">{language === 'ar' ? 'تم تجاوزه' : 'Skipped'}</div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{resultSummary.skippedCount}</div>
                  </div>
                )}
              </div>

              {resultSummary.skippedList && resultSummary.skippedList.length > 0 && (
                <div className="text-left rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 max-w-lg mx-auto">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {language === 'ar' ? 'السجلات التي تم تجاوزها وأسبابها:' : 'Skipped Records & Reasons:'}
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {resultSummary.skippedList.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">#{item.row}:</span>
                        <span>{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          {step === 'UPLOAD' && (
            <>
              <button
                id="cancel-bulk-import-btn"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t.cancel}
              </button>

              <div className="text-xs text-slate-400">
                {language === 'ar' ? 'يدعم Excel و CSV باللغتين العربية والإنجليزية' : 'Supports Excel & CSV in English and Arabic'}
              </div>
            </>
          )}

          {step === 'PREVIEW' && (
            <>
              <button
                id="back-to-upload-btn"
                onClick={() => setStep('UPLOAD')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === 'ar' ? 'رجوع لاختيار ملف' : 'Back to Upload'}</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {selectedCount}{' '}
                  {isVehicle
                    ? (language === 'ar' ? 'مركبة محددة' : 'vehicles selected')
                    : (language === 'ar' ? 'موظف محدد' : 'workers selected')}
                </span>

                <button
                  id="execute-bulk-import-btn"
                  disabled={isSubmitting || selectedCount === 0}
                  onClick={handleExecuteImport}
                  className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl text-white shadow-md transition-all ${
                    isSubmitting || selectedCount === 0
                      ? 'opacity-50 cursor-not-allowed bg-blue-500'
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{language === 'ar' ? 'جارٍ الاستيراد...' : 'Importing Records...'}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        {language === 'ar'
                          ? `استيراد ${selectedCount} سجل إلى النظام`
                          : `Import ${selectedCount} Records`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'RESULT' && (
            <div className="w-full flex justify-end">
              <button
                id="done-bulk-import-btn"
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
              >
                <span>{language === 'ar' ? 'تم، عرض البيانات في النظام' : 'Done & View Records'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
