export type Language = 'en' | 'ar' | 'ps';

export interface TranslationDict {
  // Navigation
  dashboard: string;
  vehicles: string;
  workers: string;
  documents: string;
  expiryAlerts: string;
  maintenance: string;
  fuel: string;
  expenses: string;
  gmail: string;
  googleTasks: string;
  googleChat: string;
  googleContacts: string;
  reports: string;
  orgStructure: string;
  notifications: string;
  users: string;
  billing: string;
  settings: string;
  auditLogs: string;
  logout: string;

  // Header & Search
  globalSearchPlaceholder: string;
  quickPlateLookup: string;
  quickIqamaLookup: string;
  urgentAlertsBadge: string;
  systemOnline: string;
  switchLanguage: string;
  role: string;

  // Urgent Banner
  urgentExpiryAlerts: string;
  expiredDocs: string;
  expiring7Days: string;
  expiring15Days: string;
  expiring30Days: string;
  validDocs: string;
  viewAllAlerts: string;

  // KPIs
  totalVehicles: string;
  activeVehicles: string;
  totalWorkers: string;
  activeWorkers: string;
  expiredDocuments: string;
  maintenanceDue: string;
  monthlyExpenses: string;
  monthlyFuelExpenses: string;
  sar: string;

  // Common Table & Actions
  actions: string;
  add: string;
  edit: string;
  delete: string;
  view: string;
  save: string;
  cancel: string;
  search: string;
  filter: string;
  status: string;
  department: string;
  exportExcel: string;
  exportPdf: string;
  downloadReport: string;
  print: string;
  refresh: string;
  loading: string;
  noRecordsFound: string;
  all: string;
  confirmDelete: string;

  // Vehicles
  addVehicle: string;
  editVehicle: string;
  plateNumber: string;
  vehicleId: string;
  makeModel: string;
  vinNumber: string;
  assignedDriver: string;
  mileage: string;
  istimaraExpiry: string;
  insuranceExpiry: string;
  inspectionExpiry: string;
  fuelType: string;
  ownership: string;

  // Workers
  addWorker: string;
  editWorker: string;
  employeeId: string;
  workerName: string;
  nationality: string;
  jobTitle: string;
  iqamaNumber: string;
  iqamaExpiry: string;
  passportNumber: string;
  passportExpiry: string;
  mobileNumber: string;
  assignedVehicle: string;
  salary: string;
  driverLicense: string;

  // Expiry & Documents
  documentType: string;
  entity: string;
  daysRemaining: string;
  expired: string;
  urgent: string;
  warning: string;
  valid: string;
  uploadDocument: string;
  downloadDocument: string;
  previewDocument: string;

  // Maintenance & Fuel
  addMaintenance: string;
  addFuelRecord: string;
  workshop: string;
  laborCost: string;
  partsCost: string;
  totalCost: string;
  liters: string;
  pricePerLiter: string;
  fuelStation: string;
  nextService: string;

  // Company Profile & Settings
  companyProfile: string;
  companyName: string;
  crNumber: string;
  vatNumber: string;
  generalManager: string;
  address: string;
  phone: string;
  email: string;
  databaseBackup: string;
  createBackup: string;
  restoreBackup: string;
  resetDemoData: string;
  wipeDemoData: string;

  // QR Code Scanner & Asset Labels
  scanQrCode: string;
  qrScanner: string;
  scanLabelHint: string;
  qrAssetLabel: string;
  viewQrCode: string;
  cameraAccessDenied: string;
  scanSuccess: string;
  searchingAsset: string;
  noAssetFound: string;
  switchCamera: string;
  toggleFlash: string;
  uploadQrImage: string;
  manualLookup: string;
  printQrLabel: string;
  downloadSvg: string;

  // Table Sorting & Filters
  sortBy: string;
  lastMaintenanceDate: string;
  expiryDate: string;
  sortAscending: string;
  sortDescending: string;
  allDepartments: string;
  filterByDepartment: string;

  // Bulk Import
  bulkImport: string;
  bulkImportVehicles: string;
  bulkImportWorkers: string;
  downloadTemplate: string;

  // Authentication
  systemTitle: string;
  username: string;
  password: string;
  login: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    systemTitle: 'Khyber Logistics services',
    username: 'Username',
    password: 'Password',
    login: 'Sign In',

    dashboard: 'Dashboard',
    vehicles: 'Vehicles',
    workers: 'Workers',
    documents: 'Documents',
    expiryAlerts: 'Expiry Alerts',
    maintenance: 'Maintenance',
    fuel: 'Fuel Management',
    expenses: 'Expenses',
    gmail: 'Gmail Inbox',
    googleTasks: 'Google Tasks',
    googleChat: 'Google Chat',
    googleContacts: 'Google Contacts',
    reports: 'Reports',
    orgStructure: 'TGA Org Structure',
    notifications: 'Notifications',
    users: 'User Management',
    billing: 'Subscription & Billing',
    settings: 'Settings',
    auditLogs: 'Audit Logs',
    logout: 'Logout',

    globalSearchPlaceholder: 'Search plate #, Iqama #, VIN, worker name...',
    quickPlateLookup: 'Quick Plate Lookup',
    quickIqamaLookup: 'Quick Iqama Lookup',
    urgentAlertsBadge: 'Urgent Alerts',
    systemOnline: 'System Online',
    switchLanguage: 'Language',
    role: 'Role',

    urgentExpiryAlerts: 'URGENT EXPIRY COMPLIANCE ALERTS',
    expiredDocs: 'Expired',
    expiring7Days: 'Expiring in 7 Days',
    expiring15Days: 'Expiring in 15 Days',
    expiring30Days: 'Expiring in 30 Days',
    validDocs: 'Valid',
    viewAllAlerts: 'View All Compliance Alerts',

    totalVehicles: 'Total Vehicles',
    activeVehicles: 'Active Vehicles',
    totalWorkers: 'Total Workforce',
    activeWorkers: 'Active Workers',
    expiredDocuments: 'Expired Documents',
    maintenanceDue: 'Maintenance Due',
    monthlyExpenses: 'Monthly Expenses',
    monthlyFuelExpenses: 'Monthly Fuel Cost',
    sar: 'SAR',

    actions: 'Actions',
    add: 'Add New',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View 360° Profile',
    save: 'Save Changes',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    status: 'Status',
    department: 'Department',
    exportExcel: 'Export Excel',
    exportPdf: 'Export PDF',
    downloadReport: 'Download Report',
    print: 'Print Report',
    refresh: 'Refresh',
    loading: 'Loading system data...',
    noRecordsFound: 'No matching records found',
    all: 'All',
    confirmDelete: 'Are you sure you want to delete this record?',

    addVehicle: 'Add New Vehicle',
    editVehicle: 'Edit Vehicle',
    plateNumber: 'Saudi License Plate',
    vehicleId: 'Vehicle ID',
    makeModel: 'Make & Model',
    vinNumber: 'VIN / Chassis Number',
    assignedDriver: 'Assigned Driver',
    mileage: 'Current Mileage',
    istimaraExpiry: 'Istimara (Registration) Expiry',
    insuranceExpiry: 'Insurance Expiry',
    inspectionExpiry: 'Inspection (MVPI) Expiry',
    fuelType: 'Fuel Type',
    ownership: 'Ownership Type',

    addWorker: 'Add New Worker',
    editWorker: 'Edit Worker',
    employeeId: 'Employee ID',
    workerName: 'Full Name',
    nationality: 'Nationality',
    jobTitle: 'Job Title',
    iqamaNumber: 'Saudi Iqama / ID Number',
    iqamaExpiry: 'Iqama Expiry Date',
    passportNumber: 'Passport Number',
    passportExpiry: 'Passport Expiry Date',
    mobileNumber: 'Mobile Number',
    assignedVehicle: 'Assigned Vehicle',
    salary: 'Basic Salary (SAR)',
    driverLicense: 'Driver License #',

    documentType: 'Document Type',
    entity: 'Entity / Asset',
    daysRemaining: 'Days Remaining',
    expired: 'EXPIRED',
    urgent: 'CRITICAL (≤ 7 Days)',
    warning: 'WARNING (≤ 15 Days)',
    valid: 'VALID',
    uploadDocument: 'Upload Document',
    downloadDocument: 'Download File',
    previewDocument: 'Preview Document',

    addMaintenance: 'Log Maintenance',
    addFuelRecord: 'Log Fuel Refill',
    workshop: 'Garage / Service Center',
    laborCost: 'Labor Cost',
    partsCost: 'Parts Cost',
    totalCost: 'Total Cost',
    liters: 'Liters',
    pricePerLiter: 'SAR / Liter',
    fuelStation: 'Fuel Station',
    nextService: 'Next Service Due',

    companyProfile: 'Corporate Profile & Saudi Licensing',
    companyName: 'Company Name',
    crNumber: 'Commercial Registration (CR) #',
    vatNumber: 'ZATCA VAT Tax Number',
    generalManager: 'General Manager Name',
    address: 'Corporate Address',
    phone: 'Official Phone',
    email: 'Corporate Email',
    databaseBackup: 'Database Snapshots & Backups',
    createBackup: 'Create Full Backup',
    restoreBackup: 'Restore Snapshot',
    resetDemoData: 'Reset Demo Dataset',
    wipeDemoData: 'Clean Slate for Production',

    // QR Scanner
    scanQrCode: 'Scan QR Code',
    qrScanner: 'Asset QR Scanner',
    scanLabelHint: 'Point device camera at vehicle or worker QR tag to instantly pull up 360° profile',
    qrAssetLabel: 'Asset QR Tag',
    viewQrCode: 'QR Asset Label',
    cameraAccessDenied: 'Camera access denied or unavailable. You may upload an image or type plate/Iqama.',
    scanSuccess: 'Scanned & Verified Successfully!',
    searchingAsset: 'Searching asset profile in registry...',
    noAssetFound: 'No asset matched this code in the database.',
    switchCamera: 'Switch Camera',
    toggleFlash: 'Flashlight',
    uploadQrImage: 'Upload QR Image',
    manualLookup: 'Manual Code Lookup',
    printQrLabel: 'Print QR Tag',
    downloadSvg: 'Download Vector SVG',

    // Table Sorting & Filters
    sortBy: 'Sort By',
    lastMaintenanceDate: 'Last Maintenance Date',
    expiryDate: 'Expiry Date',
    sortAscending: 'Ascending (A-Z, Oldest / Low)',
    sortDescending: 'Descending (Z-A, Newest / High)',
    allDepartments: 'All Departments',
    filterByDepartment: 'Filter by Department',

    // Bulk Import
    bulkImport: 'Import CSV / Excel',
    bulkImportVehicles: 'Bulk Import Vehicles',
    bulkImportWorkers: 'Bulk Import Workforce',
    downloadTemplate: 'Download Template'
  },
  ar: {
    systemTitle: 'خدمات خيبر اللوجستية',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',

    dashboard: 'لوحة التحكم',
    vehicles: 'إدارة المركبات',
    workers: 'الموظفين والكادر',
    documents: 'إدارة الوثائق',
    expiryAlerts: 'تنبيهات الانتهاء',
    maintenance: 'الصيانة وأوامر العمل',
    fuel: 'إدارة الوقود',
    expenses: 'المصروفات',
    gmail: 'بريد Gmail',
    googleTasks: 'مهام Google Tasks',
    googleChat: 'محادثات Google Chat',
    googleContacts: 'جهات اتصال Google Contacts',
    reports: 'التقارير الشاملة',
    orgStructure: 'الهيكل التنظيمي (هيئة النقل)',
    notifications: 'الإشعارات',
    users: 'المستخدمين والصلاحيات',
    billing: 'الاشتراك والفوترة ZATCA',
    settings: 'الإعدادات العامة',
    auditLogs: 'سجل العمليات (Audit)',
    logout: 'تسجيل الخروج',

    globalSearchPlaceholder: 'ابحث برقم اللوحة، رقم الإقامة، الهيكل، اسم الموظف...',
    quickPlateLookup: 'استعلام سريع برقم اللوحة',
    quickIqamaLookup: 'استعلام سريع برقم الإقامة',
    urgentAlertsBadge: 'تنبيهات عاجلة',
    systemOnline: 'النظام متصل',
    switchLanguage: 'اللغة',
    role: 'الدور',

    urgentExpiryAlerts: 'تنبيهات انتهاء الوثائق النظامية العاجلة',
    expiredDocs: 'منتهية الصلاحية',
    expiring7Days: 'تنتهي خلال ٧ أيام',
    expiring15Days: 'تنتهي خلال ١٥ يوماً',
    expiring30Days: 'تنتهي خلال ٣٠ يوماً',
    validDocs: 'سارية المفعول',
    viewAllAlerts: 'عرض كل تنبيهات الالتزام',

    totalVehicles: 'إجمالي المركبات',
    activeVehicles: 'المركبات النشطة',
    totalWorkers: 'إجمالي الكادر',
    activeWorkers: 'الموظفون النشطون',
    expiredDocuments: 'الوثائق المنتهية',
    maintenanceDue: 'مطلوبة للصيانة',
    monthlyExpenses: 'مصروفات الشهر',
    monthlyFuelExpenses: 'مصروف الوقود الشهري',
    sar: 'ريال',

    actions: 'الإجراءات',
    add: 'إضافة جديد',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'الملف الشامل ٣٦٠°',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    search: 'بحث',
    filter: 'تصفية',
    status: 'الحالة',
    department: 'الإدارة / القسم',
    exportExcel: 'تصدير إكسل',
    exportPdf: 'تصدير PDF',
    downloadReport: 'تحميل التقرير (CSV)',
    print: 'طباعة التقرير',
    refresh: 'تحديث',
    loading: 'جاري تحميل بيانات النظام...',
    noRecordsFound: 'لم يتم العثور على سجلات مطابقة',
    all: 'الكل',
    confirmDelete: 'هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟',

    addVehicle: 'إضافة مركبة جديدة',
    editVehicle: 'تعديل بيانات المركبة',
    plateNumber: 'رقم لوحة المركبة',
    vehicleId: 'الرقم الداخلي للمركبة',
    makeModel: 'الشركة والموديل',
    vinNumber: 'رقم الهيكل (الشاسيه)',
    assignedDriver: 'السائق المعين',
    mileage: 'قراءة العداد الحالية',
    istimaraExpiry: 'تاريخ انتهاء الاستمارة',
    insuranceExpiry: 'تاريخ انتهاء التأمين',
    inspectionExpiry: 'تاريخ انتهاء الفحص الدوري',
    fuelType: 'نوع الوقود',
    ownership: 'نوع الملكية',

    addWorker: 'إضافة موظف جديد',
    editWorker: 'تعديل بيانات الموظف',
    employeeId: 'الرقم الوظيفي',
    workerName: 'الاسم الكامل',
    nationality: 'الجنسية',
    jobTitle: 'المسمى الوظيفي',
    iqamaNumber: 'رقم الإقامة / الهوية الوطنية',
    iqamaExpiry: 'تاريخ انتهاء الإقامة',
    passportNumber: 'رقم جواز السفر',
    passportExpiry: 'تاريخ انتهاء الجواز',
    mobileNumber: 'رقم الجوال',
    assignedVehicle: 'المركبة المسندة',
    salary: 'الراتب الأساسي (ريال)',
    driverLicense: 'رقم رخصة القيادة',

    documentType: 'نوع الوثيقة',
    entity: 'الأصل / الموظف',
    daysRemaining: 'الأيام المتبقية',
    expired: 'منتهية',
    urgent: 'حرجة (≤ ٧ أيام)',
    warning: 'تحذير (≤ ١٥ يوماً)',
    valid: 'سارية',
    uploadDocument: 'رفع وثيقة',
    downloadDocument: 'تحميل الملف',
    previewDocument: 'معاينة الوثيقة',

    addMaintenance: 'تسجيل صيانة جديدة',
    addFuelRecord: 'تسجيل تعبئة وقود',
    workshop: 'الورشة / مركز الخدمة',
    laborCost: 'أجور اليد',
    partsCost: 'قيمة قطع الغيار',
    totalCost: 'التكلفة الإجمالية',
    liters: 'اللترات',
    pricePerLiter: 'سعر اللتر (ريال)',
    fuelStation: 'محطة الوقود',
    nextService: 'موعد الصيانة القادم',

    companyProfile: 'الملف التعريفي للشركة والتراخيص السعودية',
    companyName: 'اسم الشركة',
    crNumber: 'رقم السجل التجاري',
    vatNumber: 'الرقم الضريبي (هيئة الزكاة)',
    generalManager: 'اسم المدير العام',
    address: 'عنوان المقر الرئيسي',
    phone: 'هاتف التواصل الرسمي',
    email: 'البريد الإلكتروني للشركة',
    databaseBackup: 'النسخ الاحتياطي لقاعدة البيانات',
    createBackup: 'إنشاء نسخة احتياطية فورية',
    restoreBackup: 'استعادة نسخة احتياطية',
    resetDemoData: 'استعادة البيانات التجريبية',
    wipeDemoData: 'تجهيز النظام لبدء العمل الفعلي',

    // QR Scanner
    scanQrCode: 'مسح رمز QR للأصل',
    qrScanner: 'قارئ رمز QR للأصول والمركبات',
    scanLabelHint: 'وجه الكاميرا نحو ملصق QR على المركبة أو بطاقة الموظف لفتح الملف الشامل فوراً',
    qrAssetLabel: 'ملصق رمز QR للأصل',
    viewQrCode: 'بطاقة رمز QR',
    cameraAccessDenied: 'تعذر الوصول للكاميرا. يمكنك رفع صورة الرمز أو إدخال الرقم يدوياً.',
    scanSuccess: 'تم مسح الرمز والتحقق بنجاح!',
    searchingAsset: 'جاري التحقق من بيانات الأصل في النظام...',
    noAssetFound: 'لم يتم العثور على مركبة أو موظف يطابق هذا الرمز.',
    switchCamera: 'تبديل الكاميرا',
    toggleFlash: 'تشغيل الفلاش',
    uploadQrImage: 'رفع صورة رمز QR',
    manualLookup: 'استعلام يدوي بالرقم',
    printQrLabel: 'طباعة ملصق QR',
    downloadSvg: 'تحميل كملف فيكتور SVG',

    // Table Sorting & Filters
    sortBy: 'ترتيب حسب',
    lastMaintenanceDate: 'تاريخ آخر صيانة',
    expiryDate: 'تاريخ الانتهاء',
    sortAscending: 'تصاعدي (أ-ي، الأقدم / الأقل)',
    sortDescending: 'تنازلي (ي-أ، الأحدث / الأعلى)',
    allDepartments: 'جميع الأقسام',
    filterByDepartment: 'تصفية حسب الإدارة',

    // Bulk Import
    bulkImport: 'استيراد CSV / إكسل',
    bulkImportVehicles: 'استيراد المركبات دفعة واحدة',
    bulkImportWorkers: 'استيراد الموظفين دفعة واحدة',
    downloadTemplate: 'تحميل نموذج البيانات'
  },
  ps: {
    systemTitle: 'د خيبر لوژستیکي خدمتونه',
    username: 'کارن نوم',
    password: 'پټ نوم',
    login: 'ننوتل',

    dashboard: 'ډشبورډ',
    vehicles: 'د موټرو مدیریت',
    workers: 'د کارکوونکو مدیریت',
    documents: 'د اسنادو مدیریت',
    expiryAlerts: 'د پای نیټې خبرداری',
    maintenance: 'ترمیم او ساتنه',
    fuel: 'د تیلو مدیریت',
    expenses: 'مصارف',
    gmail: 'د جی میل بریښنالیک',
    googleTasks: 'ګوګل دندې',
    googleChat: 'ګوګل چیټ',
    googleContacts: 'ګوګل اړیکې (Contacts)',
    reports: 'راپورونه',
    orgStructure: 'تشکیلاتي جوړښت (TGA)',
    notifications: 'خبرتیاوې',
    users: 'د کاروونکو مدیریت',
    billing: 'ګډون او د لګښتونو بیلونه',
    settings: 'تنظیمات',
    auditLogs: 'د کړنو تاریخچه',
    logout: 'وتل',

    globalSearchPlaceholder: 'د پلیټ شمیره، اقامه، شاسی شمیره، د کارکوونکي نوم وپلټئ...',
    quickPlateLookup: 'د پلیټ چټک لټون',
    quickIqamaLookup: 'د اقامې چټک لټون',
    urgentAlertsBadge: 'بیړني خبرداری',
    systemOnline: 'سیستم فعال دی',
    switchLanguage: 'ژبه',
    role: 'رول',

    urgentExpiryAlerts: 'د اسنادو د ختمیدو بیړني خبرتیاوې',
    expiredDocs: 'ختم شوي',
    expiring7Days: 'په ۷ ورځو کې ختمیږي',
    expiring15Days: 'په ۱۵ ورځو کې ختمیږي',
    expiring30Days: 'په ۳۰ ورځو کې ختمیږي',
    validDocs: 'معتبر اسناد',
    viewAllAlerts: 'ټول خبرتیاوې وګورئ',

    totalVehicles: 'ټول موټر',
    activeVehicles: 'فعال موټر',
    totalWorkers: 'ټول کارکوونکي',
    activeWorkers: 'فعال کارکوونکي',
    expiredDocuments: 'ختم شوي اسناد',
    maintenanceDue: 'ترمیم ته اړتیا',
    monthlyExpenses: 'میاشتني لګښتونه',
    monthlyFuelExpenses: 'د تیلو میاشتنی لګښت',
    sar: 'ریال',

    actions: 'کړنې',
    add: 'نوی اضافه کول',
    edit: 'سمول',
    delete: 'حذف کول',
    view: 'بشپړ معلومات وګورئ',
    save: 'خوندي کول',
    cancel: 'لغوه کول',
    search: 'لټون',
    filter: 'فلټر',
    status: 'حالت',
    department: 'څانګه',
    exportExcel: 'اکسیل ته صادرول',
    exportPdf: 'PDF ته صادرول',
    downloadReport: 'د راپور ډاونلوډ (CSV)',
    print: 'چاپ کول',
    refresh: 'تازه کول',
    loading: 'د معلوماتو بارول...',
    noRecordsFound: 'هیڅ ریکارډ ونه موندل شو',
    all: 'ټول',
    confirmDelete: 'ایا تاسو ډاډه یاست چې دا ریکارډ حذف کړئ؟',

    addVehicle: 'نوی موټر اضافه کړئ',
    editVehicle: 'د موټر معلومات سم کړئ',
    plateNumber: 'د پلیټ شمیره',
    vehicleId: 'د موټر داخلي کوډ',
    makeModel: 'ماډل او شرکت',
    vinNumber: 'د شاسي شمیره (VIN)',
    assignedDriver: 'ټاکل شوی چلوونکی',
    mileage: 'روان کیلومتر',
    istimaraExpiry: 'د استمارې د پای نیټه',
    insuranceExpiry: 'د بیمې د پای نیټه',
    inspectionExpiry: 'د تخنیکي معاینې پای نیټه',
    fuelType: 'د تیلو ډول',
    ownership: 'د مالکیت ډول',

    addWorker: 'نوی کارکوونکی اضافه کړئ',
    editWorker: 'د کارکوونکي معلومات سم کړئ',
    employeeId: 'د کارکوونکي شمیره',
    workerName: 'بشپړ نوم',
    nationality: 'تابعیت',
    jobTitle: 'دندې سرلیک',
    iqamaNumber: 'د اقامې شمیره',
    iqamaExpiry: 'د اقامې د پای نیټه',
    passportNumber: 'د پاسپورت شمیره',
    passportExpiry: 'د پاسپورت د پای نیټه',
    mobileNumber: 'موبایل شمیره',
    assignedVehicle: 'ټاکل شوی موټر',
    salary: 'میاشتنی معاش (SAR)',
    driverLicense: 'د موټر چلولو لایسنس',

    documentType: 'د سند ډول',
    entity: 'موټر / کارکوونکی',
    daysRemaining: 'پاتې ورځې',
    expired: 'ختم شوی',
    urgent: 'بیړنی (≤ ۷ ورځې)',
    warning: 'خبرداری (≤ ۱۵ ورځې)',
    valid: 'معتبر',
    uploadDocument: 'سند پورته کول',
    downloadDocument: 'ډاونلوډ',
    previewDocument: 'کتنه',

    addMaintenance: 'د ترمیم ریکارډ',
    addFuelRecord: 'د تیلو ثبتول',
    workshop: 'ورکشاپ / مستري خانه',
    laborCost: 'د کار مزدوري',
    partsCost: 'د پرزو بیه',
    totalCost: 'مجموعي لګښت',
    liters: 'لیتره',
    pricePerLiter: 'د لیتر بیه (SAR)',
    fuelStation: 'د تیلو ټانک',
    nextService: 'بل خدمت نیټه',

    companyProfile: 'د شرکت پروفایل او جوازونه',
    companyName: 'د شرکت نوم',
    crNumber: 'تجارتي راجستریشن شمیره (CR)',
    vatNumber: 'د مالیې شمیره (VAT)',
    generalManager: 'عمومي مدیر',
    address: 'ادرس',
    phone: 'تلیفون',
    email: 'بریښنالیک',
    databaseBackup: 'د ډیټابیس شاتړ (Backup)',
    createBackup: 'نوی بیک اپ جوړ کړئ',
    restoreBackup: 'بیک اپ بحال کړئ',
    resetDemoData: 'ازمایښتي معلومات راګرځول',
    wipeDemoData: 'د تولید لپاره سیستم پاکول',

    // QR Scanner
    scanQrCode: 'د QR کوډ سکین کړئ',
    qrScanner: 'د شتمنیو او موټرو QR سکینر',
    scanLabelHint: 'د موټر یا کارکوونکي پروفایل پرانیستلو لپاره QR کوډ په چوکاټ کې ونیسئ',
    qrAssetLabel: 'د شتمنۍ QR لیبل',
    viewQrCode: 'د QR ټاګ کتل',
    cameraAccessDenied: 'کیمرې ته لاسرسی رد شو. تاسو کولی شئ عکس اپلوډ کړئ یا شمیره ولیکئ.',
    scanSuccess: 'په بریالیتوب سره سکین او تایید شو!',
    searchingAsset: 'په سیستم کې د شتمنۍ معلومات لټول کیږي...',
    noAssetFound: 'د دې کوډ سره سمون لرونکی ریکارډ ونه موندل شو.',
    switchCamera: 'کیمره بدله کړئ',
    toggleFlash: 'فلش چالان کړئ',
    uploadQrImage: 'د QR عکس اپلوډ',
    manualLookup: 'لاسي لټون',
    printQrLabel: 'د QR لیبل چاپ کړئ',
    downloadSvg: 'د SVG فایل ډاونلوډ',

    // Table Sorting & Filters
    sortBy: 'ترتيب پر بنسټ',
    lastMaintenanceDate: 'د وروستي ترمیم نیټه',
    expiryDate: 'د پای نیټه',
    sortAscending: 'صعودي (A-Z، زوړ / کم)',
    sortDescending: 'نزولي (Z-A، نوی / زیات)',
    allDepartments: 'ټولې څانګې',
    filterByDepartment: 'د څانګې له مخې فلټر',

    // Bulk Import
    bulkImport: 'د CSV / اکسل لویه کچه واردول',
    bulkImportVehicles: 'د موټرو لویه کچه واردول',
    bulkImportWorkers: 'د کارکوونکو لویه کچه واردول',
    downloadTemplate: 'د بېلګې کينډۍ ډاونلوډ'
  }
};
