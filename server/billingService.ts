import { getDb, saveDatabase } from './db';
import {
  SubscriptionPlan,
  SubscriptionAddon,
  BillingInvoice,
  SubscriptionState,
  PlanTier,
  BillingCycle,
  PaymentMethodType
} from '../src/types';

// Standard Saudi ZATCA TLV encoding for QR code
export function generateZatcaTlvQr(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmount: number,
  vatAmount: number
): string {
  try {
    const formatEntry = (tag: number, val: string): Buffer => {
      const valBuf = Buffer.from(val, 'utf-8');
      const tagBuf = Buffer.from([tag]);
      const lenBuf = Buffer.from([valBuf.length]);
      return Buffer.concat([tagBuf, lenBuf, valBuf]);
    };

    const t1 = formatEntry(1, sellerName);
    const t2 = formatEntry(2, vatNumber);
    const t3 = formatEntry(3, timestamp);
    const t4 = formatEntry(4, totalAmount.toFixed(2));
    const t5 = formatEntry(5, vatAmount.toFixed(2));

    const combined = Buffer.concat([t1, t2, t3, t4, t5]);
    return combined.toString('base64');
  } catch {
    return 'AR1LaHliZXIgTG9naXN0aWNzIFNlcnZpY2VzAg8zMTAwMDAwMDAwMDAwMDMDEzIwMjYtMDktMThUMDA6MDA6MDBaBAYxMDM0Ljg1BQUxMzQuODU=';
  }
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'STARTER',
    nameEn: 'Starter Fleet',
    nameAr: 'أسطول المبتدئين',
    namePs: 'د پیل بیړۍ',
    monthlyPriceSar: 349,
    yearlyPriceSar: 3490, // Save 17% (2 months free)
    vehicleLimit: 10,
    workerLimit: 15,
    descriptionEn: 'Essential fleet tracking, driver compliance, and document expiration alerts for small transport operations.',
    descriptionAr: 'التتبع الأساسي للمركبات، متابعة انتهاء الوثائق، وسجلات السائقين لشركات النقل والمقاولات الناشئة.',
    descriptionPs: 'د کوچنیو باروړونکو او لوژستیکي عملیاتو لپاره د موټرو او سندونو اساسي مدیریت او خبرتیاوې.',
    features: [
      { textEn: 'Up to 10 active commercial vehicles', textAr: 'حتى ۱۰ مركبات تجارية نشطة', textPs: 'تر ۱۰ فعالو تجارتي موټرو پورې', included: true },
      { textEn: 'Up to 15 registered drivers / workforce', textAr: 'حتى ۱۵ سائقاً وموظفاً مسجلاً', textPs: 'تر ۱۵ پورې موټرچلوونکي او کارکوونکي', included: true },
      { textEn: 'Live GPS real-time map & 30-day replay', textAr: 'تتبع مباشر GPS مع إعادة مسار ۳۰ يوماً', textPs: 'ژوندۍ GPS نقشه او د ۳۰ ورځو تېرو لارو کتنه', included: true },
      { textEn: 'Istimara, Insurance & Inspection alerts', textAr: 'تنبيهات انتهاء الاستمارة والتأمين والفحص', textPs: 'د استمارې، بیمې او معاینې د پای خبرتیاوې', included: true },
      { textEn: 'Standard Maintenance & Fuel expense logs', textAr: 'سجلات الصيانة الدورية ومصروفات الوقود', textPs: 'د ترمیم او تیلو لګښتونو ریکارډونه', included: true },
      { textEn: 'Automated Geofence speed & zone breach alerts', textAr: 'تنبيهات السياج الجغرافي وتجاوز السرعة', textPs: 'د جغرافیایي حدودو او سرعت خبرتیاوې', included: false },
      { textEn: 'AI Multi-Dialect Driver Voice Reporting', textAr: 'تقارير السائقين الصوتية بالذكاء الاصطناعي', textPs: 'د موټرچلوونکو غږیز راپورونه د AI له لارې', included: false },
      { textEn: 'TGA Wasl Transport Authority regulatory API', textAr: 'الربط المباشر مع منصة وصل وهيئة النقل', textPs: 'د سعودي ټرانسپورټ ادارې (وصل) مستقیم اتصال', included: false }
    ]
  },
  {
    id: 'PROFESSIONAL',
    nameEn: 'Professional Logistics',
    nameAr: 'الخدمات اللوجستية المتقدمة',
    namePs: 'مسلکي لوژستیک',
    monthlyPriceSar: 899,
    yearlyPriceSar: 8990, // Save 17%
    vehicleLimit: 50,
    workerLimit: 75,
    isPopular: true,
    descriptionEn: 'High-performance dispatching, AI driver voice intelligence, geofencing, and automated fleet compliance for medium fleets.',
    descriptionAr: 'إدارة تشغيل متكاملة، تقارير صوتية بالذكاء الاصطناعي، سياج جغرافي، ومزامنة آلية لأساطيل الشركات المتوسطة.',
    descriptionPs: 'د منځنۍ کچې باروړونکو شرکتونو لپاره د AI غږیز راپورونه، جغرافیایي حدود، او د ګوګل کلاوډ اتومات همغږي.',
    features: [
      { textEn: 'Up to 50 active commercial vehicles', textAr: 'حتى ۵۰ مركبة تجارية نشطة', textPs: 'تر ۵۰ فعالو تجارتي موټرو پورې', included: true },
      { textEn: 'Up to 75 registered drivers / workforce', textAr: 'حتى ۷۵ سائقاً وموظفاً مسجلاً', textPs: 'تر ۷۵ پورې موټرچلوونکي او کارکوونکي', included: true },
      { textEn: 'Live GPS real-time map & 180-day replay', textAr: 'تتبع مباشر GPS مع إعادة مسار ۱۸۰ يوماً', textPs: 'ژوندۍ GPS نقشه او د ۱۸۰ ورځو تېرو لارو ریکارډ', included: true },
      { textEn: 'High-accuracy Geofences (Circle & Polygon)', textAr: 'سياج جغرافي متقدم (دوائر ومضلعات)', textPs: 'پرمختللي جغرافیایي حدود (ګرد او څو ضلعي)', included: true },
      { textEn: 'Gemini AI Multilingual Driver Voice Reports', textAr: 'تقارير السائقين الصوتية التلقائية بالذكاء الاصطناعي', textPs: 'د ډرایورانو اتوماتیک غږیز راپورونه په څو ژبو', included: true },
      { textEn: 'Automated Iqama & Fleet Email Reminders', textAr: 'إرسال تنبيهات الإقامات والوثائق التلقائية', textPs: 'د اقامې او اسنادو اتومات بریښنالیک خبرتیاوې', included: true },
      { textEn: 'Google Workspace & Chat Webhooks sync', textAr: 'الربط مع Google Workspace و Google Chat', textPs: 'د ګوګل ورکسپیس او ګوګل چټ سره یوځای کول', included: true },
      { textEn: 'Dedicated multi-role dispatch accounts (Up to 15)', textAr: 'حسابات إدارة متعددة الصلاحيات (حتى ۱۵)', textPs: 'تر ۱۵ پورې د مدیرانو او څارونکو جلا حسابونه', included: true },
      { textEn: 'TGA Wasl Transport Authority regulatory API', textAr: 'الربط المباشر مع منصة وصل وهيئة النقل', textPs: 'د سعودي ټرانسپورټ ادارې (وصل) مستقیم اتصال', included: false }
    ]
  },
  {
    id: 'ENTERPRISE',
    nameEn: 'Enterprise Kingdom Fleet',
    nameAr: 'أسطول المؤسسات الكبرى',
    namePs: 'د لویو تصدیو بشپړه بیړۍ',
    monthlyPriceSar: 1999,
    yearlyPriceSar: 19990, // Save 17%
    vehicleLimit: -1, // Unlimited
    workerLimit: -1, // Unlimited
    descriptionEn: 'Full-spectrum enterprise solution with unlimited assets, official TGA Wasl API connector, custom ERP hooks, and dedicated SLA.',
    descriptionAr: 'حل شامل للأساطيل الكبرى مع عدد غير محدود من المركبات، ربط معتمد مع وصل وهيئة النقل، وتكامل كامل مع أنظمة ERP.',
    descriptionPs: 'د لویو باروړونکو سازمانونو لپاره بې حده موټر، د وصل دولتي پلیټفارم اتصال، او ۲۴/۷ ځانګړی تخنیکي ملاتړ.',
    features: [
      { textEn: 'Unlimited commercial vehicles & trailers', textAr: 'مركبات وشاحنات غير محدودة', textPs: 'نامحدود موټر، ټریلرونه او تجهیزات', included: true },
      { textEn: 'Unlimited drivers, technicians & staff', textAr: 'عدد غير محدود من السائقين وفريق العمل', textPs: 'نامحدود موټرچلوونکي او کارمندان', included: true },
      { textEn: 'Live GPS real-time map with unlimited history', textAr: 'تتبع فوري مع أرشيف مسارات غير محدود', textPs: 'بې حده تاریخي GPS ریکارډ او لاره کتنه', included: true },
      { textEn: 'Direct TGA Wasl Regulatory Platform API Gateway', textAr: 'بوابة الربط المباشر المعتمدة مع هيئة النقل (وصل)', textPs: 'د سعودي ترانسپورټ ادارې (وصل) رسمي تایید شوی اتصال', included: true },
      { textEn: 'Unlimited Custom ERP & Webhook Integrations', textAr: 'تكامل غير محدود مع أنظمة ERP و Webhooks مخصصة', textPs: 'د هر ډول داخلي ERP او ویب هوک نامحدود ادغام', included: true },
      { textEn: 'ZATCA Phase 2 E-Invoicing B2B Integration', textAr: 'ربط مباشر مع فوترة زاتكا الإلكترونية المرحلة الثانية', textPs: 'د زکات او عایداتو ادارې دوهم پړاو برېښنایي فکتور', included: true },
      { textEn: '24/7 Priority Support & Dedicated Account Director', textAr: 'دعم فني مخصص على مدار الساعة ومدير حساب تنفيذي', textPs: '۲۴/۷ ځانګړی انجینر او اکاونټ مدیر', included: true },
      { textEn: '99.95% Enterprise Uptime SLA Guarantee', textAr: 'اتفاقية مستوى خدمة SLA بنسبة ۹۹.۹۵٪', textPs: 'د ۹۹.۹۵ سلنه لوړ فعالیت او ثبات تضمین', included: true }
    ]
  }
];

export const SUBSCRIPTION_ADDONS: SubscriptionAddon[] = [
  {
    id: 'addon-gps-sim',
    nameEn: 'Saudi Multi-Telco M2M GPS SIM Card',
    nameAr: 'شريحة بيانات M2M لأجهزة التتبع (STC/موبايلي/زين)',
    namePs: 'د موټرو د GPS لپاره سعودي M2M ډیټا سیمکارټ',
    pricePerMonthSar: 45,
    pricePerYearSar: 450,
    billingType: 'PER_VEHICLE',
    descriptionEn: 'High-frequency telemetry data SIM with roaming fallback between STC, Mobily, and Zain for zero blindspots.',
    descriptionAr: 'شريحة اتصالات مخصصة لإنترنت الأشياء مع تبديل تلقائي بين شبكات الاتصالات لضمان تغطية كاملة في كل مدن المملكة.',
    descriptionPs: 'د موټرو د تتبع لوړ فریکونسي سیمکارټ چې په ټولو ښارونو او لویو لارو کې بې ځنډه انټرنیټ برابروي.',
    badge: 'Hardware & Data'
  },
  {
    id: 'addon-voice-ai',
    nameEn: 'Gemini Speech & Multilingual Voice Pack',
    nameAr: 'باقة الذكاء الاصطناعي الصوتي المتقدمة',
    namePs: 'د غږیز AI اضافي پیکج',
    pricePerMonthSar: 150,
    pricePerYearSar: 1500,
    billingType: 'FLAT',
    descriptionEn: 'Uncapped Gemini speech transcription and smart extraction for driver logs in Arabic, Pashto, Urdu, and English.',
    descriptionAr: 'معالجة صوتية فورية بلا حدود لمذكرات السائقين واستخراج تلقائي لأسماء المدن ومصروفات الوقود بدقة عالية.',
    descriptionPs: 'د ډرایورانو د غږیزو خبرو بې حده پیژندنه او د لګښتونو اتومات تحلیل په څلورو ژبو.',
    badge: 'AI Powered'
  },
  {
    id: 'addon-tga-wasl',
    nameEn: 'Official TGA / Wasl Transport Compliance Link',
    nameAr: 'بوابة الامتثال النظامي لهيئة النقل ومنصة وصل',
    namePs: 'د سعودي وصل ټرانسپورټ رسمي ډیټا پیوستون',
    pricePerMonthSar: 290,
    pricePerYearSar: 2900,
    billingType: 'FLAT',
    descriptionEn: 'Direct API pipeline pushing live coordinates, driver identities, and trip waybills to the Transport General Authority.',
    descriptionAr: 'إرسال آلي وتلقائي لبيانات التتبع ووثائق بيان إلى هيئة النقل العام لتفادي المخالفات التشغيلية.',
    descriptionPs: 'د بارونو او موټرچلوونکو رسمي معلومات په اتومات ډول د ترانسپورټ وزارت ته سپارل.',
    badge: 'Regulatory'
  },
  {
    id: 'addon-whatsapp-dispatch',
    nameEn: 'Automated WhatsApp Fleet Notifications',
    nameAr: 'باقة تنبيهات الواتساب الفورية للسائقين والإدارة',
    namePs: 'د واټساپ اتومات خبرتیاوې',
    pricePerMonthSar: 120,
    pricePerYearSar: 1200,
    billingType: 'FLAT',
    descriptionEn: 'Up to 5,000 WhatsApp alerts per month for speeding, zone entries, maintenance orders, and dispatch notices.',
    descriptionAr: 'إرسال ما يصل إلى ۵،۰۰۰ رسالة واتساب شهرية للتنبيه بالسرعة الزائدة وأوامر الشحن ومواعيد الصيانة.',
    descriptionPs: 'په میاشت کې تر ۵۰۰۰ پورې اتوماتیک واټساپ پیغامونه ډرایورانو او مدیرانو ته.',
    badge: 'Messaging'
  }
];

export function getInitialSubscription(activeVehiclesCount: number, activeWorkersCount: number): SubscriptionState {
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  return {
    planId: 'PROFESSIONAL',
    billingCycle: 'MONTHLY',
    status: 'ACTIVE',
    startDate: now.toISOString(),
    currentPeriodEnd: nextMonth.toISOString(),
    autoRenew: true,
    activeAddons: ['addon-voice-ai'],
    paymentMethod: {
      type: 'MADA',
      lastFour: '4821',
      cardBrand: 'Mada / Al Rajhi Bank',
      expiry: '09/28',
      accountHolder: 'Khyber Logistics Co.'
    },
    sadadBillerCode: '144',
    sadadBillNumber: '820491823',
    vehicleUsage: {
      current: activeVehiclesCount,
      limit: 50
    },
    workerUsage: {
      current: activeWorkersCount,
      limit: 75
    }
  };
}

export function getInitialInvoices(compProfile?: any): BillingInvoice[] {
  const now = new Date();
  const issueDate1 = new Date(now.getTime() - 12 * 24 * 3600 * 1000).toISOString();
  const dueDate1 = new Date(now.getTime() + 18 * 24 * 3600 * 1000).toISOString();

  const sellerName = compProfile?.name || 'Khyber Logistics services';
  const sellerVat = compProfile?.vatNumber || '310000000000003';
  const customerName = 'Khyber Logistics services Ltd.';
  const customerCr = '1010894523';
  const customerVat = '310245892100003';

  const subtotal1 = 899 + 150; // Plan + Addon
  const vat1 = subtotal1 * 0.15;
  const total1 = subtotal1 + vat1;

  const qrData1 = generateZatcaTlvQr(sellerName, sellerVat, issueDate1, total1, vat1);

  return [
    {
      id: 'inv-2026-0091',
      invoiceNumber: 'KHYBER-INV-2026-0091',
      zatcaUuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      issueDate: issueDate1,
      dueDate: dueDate1,
      planId: 'PROFESSIONAL',
      planName: 'Professional Logistics Plan (Monthly)',
      billingCycle: 'MONTHLY',
      subtotalSar: subtotal1,
      vatRatePercent: 15,
      vatAmountSar: parseFloat(vat1.toFixed(2)),
      totalSar: parseFloat(total1.toFixed(2)),
      status: 'PAID',
      paymentMethod: 'MADA',
      paymentReference: 'TXN-MADA-891048',
      paidAt: issueDate1,
      customerName,
      customerCr,
      customerVat,
      items: [
        {
          description: 'Professional Fleet Subscription - Up to 50 Vehicles (Monthly)',
          descriptionAr: 'اشتراك أسطول لوجستي متقدم - حتى ٥۰ مركبة (شهري)',
          qty: 1,
          unitPriceSar: 899,
          totalSar: 899
        },
        {
          description: 'Gemini Speech & Multilingual Voice Pack (Monthly)',
          descriptionAr: 'باقة الذكاء الاصطناعي الصوتي وتفريغ مذكرات السائقين (شهري)',
          qty: 1,
          unitPriceSar: 150,
          totalSar: 150
        }
      ],
      zatcaQrCodeData: qrData1
    }
  ];
}

export function getCurrentSubscription(): SubscriptionState {
  const db = getDb();
  const vCount = db.vehicles?.length || 0;
  const wCount = db.workers?.length || 0;

  if (!db.subscription) {
    db.subscription = getInitialSubscription(vCount, wCount);
    saveDatabase();
  }

  // Update dynamic usage
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === db.subscription!.planId) || SUBSCRIPTION_PLANS[1];
  db.subscription.vehicleUsage = {
    current: vCount,
    limit: plan.vehicleLimit
  };
  db.subscription.workerUsage = {
    current: wCount,
    limit: plan.workerLimit
  };

  return db.subscription;
}

export function getCurrentInvoices(): BillingInvoice[] {
  const db = getDb();
  if (!Array.isArray(db.invoices) || db.invoices.length === 0) {
    db.invoices = getInitialInvoices(db.companyProfile);
    saveDatabase();
  }
  return db.invoices;
}

export function updatePlanSubscription(
  planId: PlanTier,
  billingCycle: BillingCycle,
  paymentMethodType: PaymentMethodType = 'MADA'
): { subscription: SubscriptionState; newInvoice?: BillingInvoice } {
  const db = getDb();
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) throw new Error('Invalid plan selected');

  const now = new Date();
  const periodDays = billingCycle === 'YEARLY' ? 365 : 30;
  const nextEnd = new Date(now.getTime() + periodDays * 24 * 3600 * 1000);

  const sub = getCurrentSubscription();
  sub.planId = planId;
  sub.billingCycle = billingCycle;
  sub.status = 'ACTIVE';
  sub.startDate = now.toISOString();
  sub.currentPeriodEnd = nextEnd.toISOString();
  sub.paymentMethod.type = paymentMethodType;

  // Calculate pricing
  const basePrice = billingCycle === 'YEARLY' ? plan.yearlyPriceSar : plan.monthlyPriceSar;
  let addonsTotal = 0;

  const items: Array<{ description: string; descriptionAr?: string; qty: number; unitPriceSar: number; totalSar: number }> = [
    {
      description: `${plan.nameEn} Plan (${billingCycle === 'YEARLY' ? 'Annual' : 'Monthly'})`,
      descriptionAr: `${plan.nameAr} (${billingCycle === 'YEARLY' ? 'سنوي' : 'شهري'})`,
      qty: 1,
      unitPriceSar: basePrice,
      totalSar: basePrice
    }
  ];

  for (const addonId of sub.activeAddons) {
    const addon = SUBSCRIPTION_ADDONS.find(a => a.id === addonId);
    if (addon) {
      const price = billingCycle === 'YEARLY' ? addon.pricePerYearSar : addon.pricePerMonthSar;
      addonsTotal += price;
      items.push({
        description: addon.nameEn,
        descriptionAr: addon.nameAr,
        qty: 1,
        unitPriceSar: price,
        totalSar: price
      });
    }
  }

  const subtotal = basePrice + addonsTotal;
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  // Generate tax invoice
  const invSeq = ((db.invoices?.length || 0) + 92).toString().padStart(4, '0');
  const invNumber = `KHYBER-INV-2026-${invSeq}`;
  const nowIso = now.toISOString();

  const sellerName = db.companyProfile?.name || 'Khyber Logistics services';
  const sellerVat = db.companyProfile?.vatNumber || '310000000000003';
  const zatcaQr = generateZatcaTlvQr(sellerName, sellerVat, nowIso, total, vat);

  const newInvoice: BillingInvoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber: invNumber,
    zatcaUuid: `zatca-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    issueDate: nowIso,
    dueDate: nowIso,
    planId,
    planName: `${plan.nameEn} (${billingCycle})`,
    billingCycle,
    subtotalSar: subtotal,
    vatRatePercent: 15,
    vatAmountSar: parseFloat(vat.toFixed(2)),
    totalSar: parseFloat(total.toFixed(2)),
    status: 'PAID',
    paymentMethod: paymentMethodType,
    paymentReference: `TXN-${paymentMethodType}-${Math.floor(100000 + Math.random() * 900000)}`,
    paidAt: nowIso,
    customerName: db.companyProfile?.name || 'Khyber Logistics services',
    customerCr: db.companyProfile?.crNumber || '1010000000',
    customerVat: db.companyProfile?.vatNumber || '310000000000003',
    items,
    zatcaQrCodeData: zatcaQr
  };

  if (!Array.isArray(db.invoices)) {
    db.invoices = [];
  }
  db.invoices.unshift(newInvoice);

  // Log Audit
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: 'usr-admin',
    userName: 'Authorized Account Manager',
    userRole: 'ADMIN',
    action: 'UPDATE',
    entityType: 'SUBSCRIPTION',
    entityId: planId,
    description: `Upgraded subscription plan to ${plan.nameEn} (${billingCycle}) via ${paymentMethodType}. Generated invoice ${invNumber}.`,
    ipAddress: '127.0.0.1',
    timestamp: nowIso
  });

  saveDatabase();

  return { subscription: sub, newInvoice };
}

export function toggleSubscriptionAddon(addonId: string, enabled: boolean): SubscriptionState {
  const db = getDb();
  const sub = getCurrentSubscription();

  const exists = sub.activeAddons.includes(addonId);
  if (enabled && !exists) {
    sub.activeAddons.push(addonId);
  } else if (!enabled && exists) {
    sub.activeAddons = sub.activeAddons.filter(id => id !== addonId);
  }

  saveDatabase();
  return sub;
}
