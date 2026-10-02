import { getDb, Vehicle, Worker } from './db';

export interface ExpiryAlertItem {
  id: string;
  documentType: 'ISTIMARA' | 'INSURANCE' | 'INSPECTION' | 'IQAMA' | 'PASSPORT' | 'WORK_PERMIT' | 'MEDICAL_INSURANCE' | 'DRIVER_LICENSE' | 'CONTRACT';
  documentTypeName: string;
  documentTypeNameAr: string;
  documentTypeNamePs: string;
  documentNumber: string;
  entityType: 'VEHICLE' | 'WORKER';
  entityId: string;
  entityName: string; // e.g. "FLT-101 (7845 XYZ)" or "Ahmed Mohammed Al-Omari (EMP-1001)"
  entitySubtext: string; // Plate # or Iqama #
  department: string;
  departmentId: string;
  expiryDate: string; // YYYY-MM-DD
  daysRemaining: number;
  status: 'EXPIRED' | 'EXPIRING_URGENT' | 'EXPIRING_WARNING' | 'EXPIRING_SOON' | 'VALID';
  responsiblePerson?: string;
  contactNumber?: string;
}

export function calculateDaysRemaining(expiryDateStr: string): number {
  if (!expiryDateStr) return 9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiryDate = new Date(expiryDateStr);
  expiryDate.setHours(0, 0, 0, 0);
  
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(days: number): 'EXPIRED' | 'EXPIRING_URGENT' | 'EXPIRING_WARNING' | 'EXPIRING_SOON' | 'VALID' {
  if (days < 0) return 'EXPIRED';
  if (days <= 7) return 'EXPIRING_URGENT';
  if (days <= 15) return 'EXPIRING_WARNING';
  if (days <= 30) return 'EXPIRING_SOON';
  return 'VALID';
}

export function getAllExpiryAlerts(): ExpiryAlertItem[] {
  const db = getDb();
  const alerts: ExpiryAlertItem[] = [];

  const deptMap = new Map(db.departments.map(d => [d.id, d.name]));

  // 1. Vehicle Documents
  for (const v of db.vehicles) {
    const deptName = deptMap.get(v.departmentId) || 'Fleet Operations';
    const driver = db.workers.find(w => w.id === v.assignedWorkerId);

    // Istimara
    if (v.istimaraExpiry) {
      const days = calculateDaysRemaining(v.istimaraExpiry);
      alerts.push({
        id: `exp-ist-${v.id}`,
        documentType: 'ISTIMARA',
        documentTypeName: 'Vehicle Registration (Istimara)',
        documentTypeNameAr: 'استمارة رخصة السير',
        documentTypeNamePs: 'د موټر استماره / ثبت',
        documentNumber: v.istimaraNumber || v.plateNumber,
        entityType: 'VEHICLE',
        entityId: v.id,
        entityName: `${v.internalVehicleId} - ${v.make} ${v.model}`,
        entitySubtext: `Plate: ${v.plateNumber} (${v.plateLettersAr} ${v.plateDigitsAr})`,
        department: deptName,
        departmentId: v.departmentId,
        expiryDate: v.istimaraExpiry,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: driver?.fullName,
        contactNumber: driver?.mobileNumber
      });
    }

    // Insurance
    if (v.insuranceExpiry) {
      const days = calculateDaysRemaining(v.insuranceExpiry);
      alerts.push({
        id: `exp-ins-${v.id}`,
        documentType: 'INSURANCE',
        documentTypeName: 'Vehicle Insurance Policy',
        documentTypeNameAr: 'وثيقة تأمين المركبة',
        documentTypeNamePs: 'د موټر بیمه',
        documentNumber: v.insurancePolicyNumber || v.insuranceCompany,
        entityType: 'VEHICLE',
        entityId: v.id,
        entityName: `${v.internalVehicleId} - ${v.make} ${v.model}`,
        entitySubtext: `${v.insuranceCompany} (${v.plateNumber})`,
        department: deptName,
        departmentId: v.departmentId,
        expiryDate: v.insuranceExpiry,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: driver?.fullName,
        contactNumber: driver?.mobileNumber
      });
    }

    // Periodic MVPI Inspection
    if (v.inspectionExpiry) {
      const days = calculateDaysRemaining(v.inspectionExpiry);
      alerts.push({
        id: `exp-mvpi-${v.id}`,
        documentType: 'INSPECTION',
        documentTypeName: 'Periodic Inspection (Fahs MVPI)',
        documentTypeNameAr: 'الفحص الفني الدوري الدوري للمركبة',
        documentTypeNamePs: 'د موټر فحص / تخنیکي معاینه',
        documentNumber: `MVPI-${v.plateDigits}`,
        entityType: 'VEHICLE',
        entityId: v.id,
        entityName: `${v.internalVehicleId} - ${v.make} ${v.model}`,
        entitySubtext: `Plate: ${v.plateNumber}`,
        department: deptName,
        departmentId: v.departmentId,
        expiryDate: v.inspectionExpiry,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: driver?.fullName,
        contactNumber: driver?.mobileNumber
      });
    }
  }

  // 2. Worker Documents
  for (const w of db.workers) {
    const deptName = deptMap.get(w.departmentId) || 'Human Resources';
    const assignedVehicle = db.vehicles.find(v => v.id === w.assignedVehicleId);

    // Iqama / National ID
    if (w.iqamaExpiry) {
      const days = calculateDaysRemaining(w.iqamaExpiry);
      const isSaudi = w.iqamaNumber.startsWith('1');
      alerts.push({
        id: `exp-iqama-${w.id}`,
        documentType: 'IQAMA',
        documentTypeName: isSaudi ? 'Saudi National ID (Hawiyya)' : 'Resident Iqama (Muqeem)',
        documentTypeNameAr: isSaudi ? 'الهوية الوطنية السعودية' : 'الإقامة النظامية (مقيم)',
        documentTypeNamePs: isSaudi ? 'د سعودي ملي هویت کارت' : 'د مقیم اقامه کارت',
        documentNumber: w.iqamaNumber,
        entityType: 'WORKER',
        entityId: w.id,
        entityName: `${w.fullName} (${w.employeeId})`,
        entitySubtext: `Iqama: ${w.iqamaNumber} - ${w.nationality}`,
        department: deptName,
        departmentId: w.departmentId,
        expiryDate: w.iqamaExpiry,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: w.fullName,
        contactNumber: w.mobileNumber
      });
    }

    // Passport
    if (w.passportExpiry) {
      const days = calculateDaysRemaining(w.passportExpiry);
      alerts.push({
        id: `exp-pass-${w.id}`,
        documentType: 'PASSPORT',
        documentTypeName: 'International Passport',
        documentTypeNameAr: 'جواز السفر الدولي',
        documentTypeNamePs: 'پاسپورت',
        documentNumber: w.passportNumber,
        entityType: 'WORKER',
        entityId: w.id,
        entityName: `${w.fullName} (${w.employeeId})`,
        entitySubtext: `Passport: ${w.passportNumber} (${w.nationality})`,
        department: deptName,
        departmentId: w.departmentId,
        expiryDate: w.passportExpiry,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: w.fullName,
        contactNumber: w.mobileNumber
      });
    }

    // Work Permit (Qiwa / Qiwa Ajeer)
    if (w.workPermitExpiry) {
      const days = calculateDaysRemaining(w.workPermitExpiry);
      alerts.push({
        id: `exp-wp-${w.id}`,
        documentType: 'WORK_PERMIT',
        documentTypeName: 'Work Permit (Qiwa / MLSD)',
        documentTypeNameAr: 'رخصة العمل (قوى / وزارة الموارد البشرية)',
        documentTypeNamePs: 'د کار اجازه لیک (قوی)',
        documentNumber: w.workPermitNumber || `WP-${w.iqamaNumber.slice(-6)}`,
        entityType: 'WORKER',
        entityId: w.id,
        entityName: `${w.fullName} (${w.employeeId})`,
        entitySubtext: `Job: ${w.jobTitle}`,
        department: deptName,
        departmentId: w.departmentId,
        expiryDate: w.workPermitExpiry,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: w.fullName,
        contactNumber: w.mobileNumber
      });
    }

    // Medical Insurance
    if (w.medicalInsuranceExpiry) {
      const days = calculateDaysRemaining(w.medicalInsuranceExpiry);
      alerts.push({
        id: `exp-med-${w.id}`,
        documentType: 'MEDICAL_INSURANCE',
        documentTypeName: 'Medical Insurance (CCHI)',
        documentTypeNameAr: 'التأمين الطبي (مجلس الضمان الصحي)',
        documentTypeNamePs: 'طبي بیمه',
        documentNumber: w.medicalInsuranceNumber,
        entityType: 'WORKER',
        entityId: w.id,
        entityName: `${w.fullName} (${w.employeeId})`,
        entitySubtext: `Policy: ${w.medicalInsuranceNumber}`,
        department: deptName,
        departmentId: w.departmentId,
        expiryDate: w.medicalInsuranceExpiry,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: w.fullName,
        contactNumber: w.mobileNumber
      });
    }

    // Driver License
    if (w.driverLicenseExpiry && w.driverLicenseNumber) {
      const days = calculateDaysRemaining(w.driverLicenseExpiry);
      alerts.push({
        id: `exp-dl-${w.id}`,
        documentType: 'DRIVER_LICENSE',
        documentTypeName: 'Saudi Driver License',
        documentTypeNameAr: 'رخصة القيادة السعودية (المرور)',
        documentTypeNamePs: 'د موټر چلولو لایسنس',
        documentNumber: w.driverLicenseNumber,
        entityType: 'WORKER',
        entityId: w.id,
        entityName: `${w.fullName} (${w.employeeId})`,
        entitySubtext: `License: ${w.driverLicenseNumber}`,
        department: deptName,
        departmentId: w.departmentId,
        expiryDate: w.driverLicenseExpiry,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: w.fullName,
        contactNumber: w.mobileNumber
      });
    }

    // Employment Contract
    if (w.contractEndDate) {
      const days = calculateDaysRemaining(w.contractEndDate);
      alerts.push({
        id: `exp-contract-${w.id}`,
        documentType: 'CONTRACT',
        documentTypeName: 'Employment Contract (Qiwa)',
        documentTypeNameAr: 'عقد العمل الموثق (منصة قوى)',
        documentTypeNamePs: 'د کار تړون',
        documentNumber: `CTR-${w.employeeId}`,
        entityType: 'WORKER',
        entityId: w.id,
        entityName: `${w.fullName} (${w.employeeId})`,
        entitySubtext: `Salary: ${w.salary} SAR/mo`,
        department: deptName,
        departmentId: w.departmentId,
        expiryDate: w.contractEndDate,
        daysRemaining: days,
        status: getExpiryStatus(days),
        responsiblePerson: w.fullName,
        contactNumber: w.mobileNumber
      });
    }
  }

  // Sort alerts: Expired first, then shortest days remaining
  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return alerts;
}

export function getDashboardExpirySummary() {
  const alerts = getAllExpiryAlerts();
  
  const expired = alerts.filter(a => a.daysRemaining < 0);
  const expiring7 = alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 7);
  const expiring15 = alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 15);
  const expiring30 = alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 30);
  const expiring60 = alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 60);
  const valid = alerts.filter(a => a.daysRemaining > 30);

  // Category breakdown
  const insuranceExpiringSoon = alerts.filter(a => (a.documentType === 'INSURANCE' || a.documentType === 'MEDICAL_INSURANCE') && a.daysRemaining <= 30);
  const registrationExpiringSoon = alerts.filter(a => a.documentType === 'ISTIMARA' && a.daysRemaining <= 30);
  const iqamaExpiringSoon = alerts.filter(a => a.documentType === 'IQAMA' && a.daysRemaining <= 30);
  const passportExpiringSoon = alerts.filter(a => a.documentType === 'PASSPORT' && a.daysRemaining <= 30);
  const inspectionExpiringSoon = alerts.filter(a => a.documentType === 'INSPECTION' && a.daysRemaining <= 30);
  const driverLicenseExpiringSoon = alerts.filter(a => a.documentType === 'DRIVER_LICENSE' && a.daysRemaining <= 30);

  return {
    totalDocumentsTracked: alerts.length,
    expiredCount: expired.length,
    expiring7DaysCount: expiring7.length,
    expiring15DaysCount: expiring15.length,
    expiring30DaysCount: expiring30.length,
    expiring60DaysCount: expiring60.length,
    validCount: valid.length,
    insuranceExpiringSoonCount: insuranceExpiringSoon.length,
    registrationExpiringSoonCount: registrationExpiringSoon.length,
    iqamaExpiringSoonCount: iqamaExpiringSoon.length,
    passportExpiringSoonCount: passportExpiringSoon.length,
    inspectionExpiringSoonCount: inspectionExpiringSoon.length,
    driverLicenseExpiringSoonCount: driverLicenseExpiringSoon.length,
    urgentAlerts: alerts.slice(0, 10)
  };
}
