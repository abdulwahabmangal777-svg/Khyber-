export interface OrgUnitServer {
  id: string;
  nameAr: string;
  nameEn: string;
  level: string;
  levelLabelAr: string;
  levelLabelEn: string;
  parentId: string | null;
  code: string;
  sectorId?: string;
  deputyshipId?: string;
  descriptionAr: string;
  descriptionEn: string;
  responsibilitiesAr: string[];
  responsibilitiesEn: string[];
  color: string;
  stats: {
    staffCount: number;
    activeLicenses: number;
    supervisedFleets: number;
    complianceScore: number;
  };
  children?: OrgUnitServer[];
}

export const TGA_ORG_CHART: OrgUnitServer = {
  id: 'org-presidency',
  nameAr: 'الـرئـيـس',
  nameEn: 'The President of the Authority',
  level: 'PRESIDENCY',
  levelLabelAr: 'الرئاسة',
  levelLabelEn: 'Presidency',
  parentId: null,
  code: 'PRES',
  descriptionAr: 'القيادة العليا للهيئة العامة للنقل، والمسؤولة عن وضع السياسات العامة والإشراف الاستراتيجي على كافة أنماط النقل في المملكة العربية السعودية.',
  descriptionEn: 'Executive leadership of the Transport General Authority (TGA), overseeing strategic policies across all transport modes in the Kingdom.',
  responsibilitiesAr: [
    'الإشراف العام على تنظيم وتطوير أنشطة النقل البري والبحري والسككي',
    'اعتماد الخطط الاستراتيجية والتشغيلية الوطنية لمنظومة النقل',
    'تمثيل المملكة في المحافل والمنظمات الإقليمية والدولية ذات العلاقة',
    'رفع مشاريع الأنظمة واللوائح والسياسات لمجلس الإدارة'
  ],
  responsibilitiesEn: [
    'Overall supervision of land, maritime, and railway transport regulations',
    'Approval of national strategic and operational transport initiatives',
    'Representation of Saudi Arabia in regional and international forums',
    'Submission of statutory drafts and policies to the Board of Directors'
  ],
  color: '#064e3b',
  stats: {
    staffCount: 1450,
    activeLicenses: 48920,
    supervisedFleets: 320000,
    complianceScore: 98.4
  },
  children: [
    {
      id: 'org-audit-committee',
      nameAr: 'لجنة المراجعة',
      nameEn: 'Audit Committee',
      level: 'COMMITTEE',
      levelLabelAr: 'لجنة',
      levelLabelEn: 'Committee',
      parentId: 'org-presidency',
      code: 'AC',
      descriptionAr: 'لجنة مستقلة منبثقة من مجلس الإدارة تعنى بالإشراف على أنظمة الرقابة الداخلية والتقارير المالية والمحاسبية.',
      descriptionEn: 'Independent board committee overseeing internal control systems, audit integrity, and financial governance.',
      responsibilitiesAr: [
        'مراقبة أعمال المراجعة الداخلية والتحقق من فاعلية أنظمة الرقابة',
        'مراجعة القوائم والتقارير المالية والسياسات المحاسبية',
        'الإشراف على التزام الهيئة بالأنظمة واللوائح المعمول بها'
      ],
      responsibilitiesEn: [
        'Oversee internal audit operations and internal control effectiveness',
        'Review financial statements and accounting principles',
        'Ensure institutional adherence to laws and regulations'
      ],
      color: '#7c2d12',
      stats: { staffCount: 12, activeLicenses: 0, supervisedFleets: 0, complianceScore: 100 }
    },
    {
      id: 'org-internal-audit',
      nameAr: 'الإدارة العامة للمراجعة الداخلية',
      nameEn: 'General Directorate of Internal Audit',
      level: 'DIRECTORATE',
      levelLabelAr: 'إدارة عامة',
      levelLabelEn: 'General Directorate',
      parentId: 'org-presidency',
      code: 'IA',
      descriptionAr: 'إدارة رقابية تقدم تأكيدات واستشارات موضوعية مستقلة لتقييم وتحسين فاعلية عمليات الحوكمة وإدارة المخاطر.',
      descriptionEn: 'Provides independent, objective assurance and consulting to evaluate and enhance governance and internal risk controls.',
      responsibilitiesAr: [
        'تنفيذ خطط المراجعة المالية والتشغيلية وتقنية المعلومات السنوية',
        'تقييم مدى كفاية وكفاءة نظم الرقابة الداخلية وسياسات الهيئة',
        'متابعة تصحيح الملاحظات الرقابية مع الإدارات المختصة'
      ],
      responsibilitiesEn: [
        'Execute annual operational, financial, and IT internal audits',
        'Assess the adequacy of operational control procedures',
        'Monitor corrective action plans across directorates'
      ],
      color: '#991b1b',
      stats: { staffCount: 24, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.2 }
    },
    {
      id: 'org-presidents-office',
      nameAr: 'الإدارة العامة لمكتب الرئيس',
      nameEn: "General Directorate of the President's Office",
      level: 'OFFICE',
      levelLabelAr: 'مكتب / إدارة عامة',
      levelLabelEn: "Office / Directorate",
      parentId: 'org-presidency',
      code: 'PO',
      descriptionAr: 'تتولى إدارة ومتابعة الأعمال التنفيذية ومراسلات وقرارات معالي الرئيس، والتنسيق الدبلوماسي والدولي.',
      descriptionEn: "Manages executive affairs, correspondences, high-level decisions, and diplomatic liaison for the President.",
      responsibilitiesAr: [
        'إدارة جداول أعمال الرئيس والتنسيق مع الجهات الحكومية والخاصة',
        'متابعة تنفيذ التوجيهات والقرارات الصادرة من الرئاسة',
        'التنسيق الدبلوماسي مع المنظمات والهيئات النظيرة'
      ],
      responsibilitiesEn: [
        'Manage presidential schedules and executive communications',
        'Follow up on executive directives and strategic decisions',
        'Diplomatic coordination with foreign and domestic counterpart bodies'
      ],
      color: '#1e3a8a',
      stats: { staffCount: 38, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.0 },
      children: [
        {
          id: 'org-imo-delegation',
          nameAr: 'المندوبية لدى المنظمة البحرية الدولية',
          nameEn: 'Permanent Delegation to the International Maritime Organization (IMO)',
          level: 'DELEGATION',
          levelLabelAr: 'مندوبية',
          levelLabelEn: 'Delegation',
          parentId: 'org-presidents-office',
          code: 'IMO-DEL',
          descriptionAr: 'تمثيل المملكة العربية السعودية الدائم لدى المنظمة البحرية الدولية (IMO) في لندن والدفاع عن مصالح المملكة البحرية.',
          descriptionEn: 'Permanent diplomatic representation of Saudi Arabia at the IMO headquarters in London, UK.',
          responsibilitiesAr: [
            'المشاركة في اجتماعات الجمعية العامة ومجلس المنظمة ولجانها الفنية',
            'متابعة الاتفاقيات والمعاهدات البحرية الدولية ومواءمتها مع اللوائح الوطنية',
            'تعزيز مكانة المملكة القيادية في قطاع النقل والملاحة البحرية الدولية'
          ],
          responsibilitiesEn: [
            'Represent the Kingdom in IMO general assemblies and maritime committees',
            'Align international maritime treaties with Saudi national bylaws',
            'Champion Saudi leadership in global maritime logistics and safe seas'
          ],
          color: '#0369a1',
          stats: { staffCount: 14, activeLicenses: 0, supervisedFleets: 0, complianceScore: 100 }
        }
      ]
    },
    {
      id: 'org-corporate-communication',
      nameAr: 'الإدارة العامة للتواصل',
      nameEn: 'General Directorate of Corporate Communication',
      level: 'DIRECTORATE',
      levelLabelAr: 'إدارة عامة',
      levelLabelEn: 'General Directorate',
      parentId: 'org-presidency',
      code: 'COMM',
      descriptionAr: 'إدارة الصورة الذهنية للهيئة، والاتصال الإعلامي والرقمي، وحملات التوعية بنظام النقل واللوائح المحدثة.',
      descriptionEn: 'Oversees public affairs, media campaigns, institutional branding, and community awareness across the Kingdom.',
      responsibilitiesAr: [
        'إعداد وتنفيذ الاستراتيجيات الإعلامية وحملات التوعية المجتمعية بالسلامة',
        'إدارة القنوات الإعلامية الرسمية ومنصات التواصل الاجتماعي والتفاعل',
        'تنظيم المؤتمرات والفعاليات والمعارض المحلية والدولية'
      ],
      responsibilitiesEn: [
        'Execute public awareness campaigns on road safety and transport regulations',
        'Manage corporate media presence, press releases, and public inquiries',
        'Organize international transport summits and local logistics exhibitions'
      ],
      color: '#4c1d95',
      stats: { staffCount: 32, activeLicenses: 0, supervisedFleets: 0, complianceScore: 98.0 }
    },
    {
      id: 'org-strategy-excellence',
      nameAr: 'الإدارة العامة للإدارة الاستراتيجية والتميز المؤسسي',
      nameEn: 'General Directorate of Strategic Management & Institutional Excellence',
      level: 'DIRECTORATE',
      levelLabelAr: 'إدارة عامة',
      levelLabelEn: 'General Directorate',
      parentId: 'org-presidency',
      code: 'STRAT',
      descriptionAr: 'قيادة التخطيط الاستراتيجي المتوافق مع رؤية المملكة 2030 وبرامج تطوير القطاع وتطبيق معايير التميز.',
      descriptionEn: 'Aligns TGA strategies with Saudi Vision 2030, drives organizational excellence programs, and monitors national KPIs.',
      responsibilitiesAr: [
        'صياغة ومتابعة الاستراتيجية الوطنية للنقل والخدمات اللوجستية',
        'قياس ومراقبة مؤشرات الأداء الرئيسية (KPIs) لقطاعات الهيئة',
        'تطبيق وتأهيل الهيئة لجوائز ومعايير التميز المؤسسي العالمية والمحلية'
      ],
      responsibilitiesEn: [
        'Formulate and track the National Transport & Logistics Strategy',
        'Monitor authority-wide strategic KPIs and performance milestones',
        'Implement international standards of institutional excellence'
      ],
      color: '#134e4a',
      stats: { staffCount: 28, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.1 }
    },
    {
      id: 'org-governance-risk',
      nameAr: 'الإدارة العامة للحوكمة والمخاطر والالتزام',
      nameEn: 'General Directorate of Governance, Risk & Compliance (GRC)',
      level: 'DIRECTORATE',
      levelLabelAr: 'إدارة عامة',
      levelLabelEn: 'General Directorate',
      parentId: 'org-presidency',
      code: 'GRC',
      descriptionAr: 'بناء وتطبيق أطر الحوكمة المؤسسية وتحديد وتقييم وإدارة المخاطر التشغيلية والاستراتيجية والالتزام بالأنظمة.',
      descriptionEn: 'Develops governance frameworks, institutional risk management registers, and regulatory compliance oversight.',
      responsibilitiesAr: [
        'تحديد وتقييم سجل المخاطر الاستراتيجية والتشغيلية ووضع خطط التخفيف',
        'حوكمة السياسات والإجراءات وتفويض الصلاحيات المؤسسية',
        'التأكد من التزام قطاعات الهيئة بالضوابط الرقابية والحكومية'
      ],
      responsibilitiesEn: [
        'Maintain enterprise risk registers and mitigation protocols',
        'Govern internal operating policies and delegation of authority matrices',
        'Ensure continuous regulatory alignment across all deputyships'
      ],
      color: '#701a75',
      stats: { staffCount: 26, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.5 }
    },

    // SECTOR 1: نائب الرئيس لقطاع التنظيم
    {
      id: 'org-sector-regulatory',
      nameAr: 'نائب الرئيس لقطاع التنظيم',
      nameEn: 'Vice President for Regulatory Sector',
      level: 'SECTOR',
      levelLabelAr: 'قطاع',
      levelLabelEn: 'Sector',
      parentId: 'org-presidency',
      code: 'SEC-REG',
      descriptionAr: 'قيادة القطاع التنظيمي المسؤول عن صياغة التشريعات والمعايير لجميع أنشطة النقل البري (ركاب وبضائع)، البحري، السككي، وتمكين النقل في المملكة.',
      descriptionEn: 'Leads the regulatory domain responsible for setting transport standards, legislative frameworks, and economic bylaws for land, sea, rail, and future mobility.',
      responsibilitiesAr: [
        'الإشراف على الوكالات التنظيمية للنقل البري والبحري والسككي والتمكين',
        'إصدار وتحديث اللوائح التنفيذية والتنظيمية لأنشطة النقل التجاري',
        'حماية مصالح المستفيدين وضمان جودة وسلامة خدمات النقل بالمملكة',
        'تحفيز الاستثمار وتعزيز المنافسة العادلة في قطاع النقل والخدمات اللوجستية'
      ],
      responsibilitiesEn: [
        'Direct deputyships for Passenger Land, Freight Land, Maritime, Railway, and Enablement',
        'Enact and update commercial transport regulatory frameworks',
        'Safeguard customer rights and enforce safety standards',
        'Foster investment and fair competition in logistics'
      ],
      color: '#065f46',
      stats: {
        staffCount: 680,
        activeLicenses: 34200,
        supervisedFleets: 280000,
        complianceScore: 96.5
      },
      children: [
        {
          id: 'org-agency-passenger',
          nameAr: 'وكالة الهيئة للنقل البري للركاب',
          nameEn: 'Deputyship for Passenger Land Transport',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-regulatory',
          sectorId: 'org-sector-regulatory',
          code: 'AG-PASS',
          descriptionAr: 'تنظيم وتطوير كافة أنشطة نقل الركاب بالحافلات، وتأجير السيارات، وسيارات الأجرة، والنقل بالتوجيه في مدن ومناطق المملكة.',
          descriptionEn: 'Regulates passenger transport including intercity/urban buses, car rental agencies, taxis, and app-based ride-hailing.',
          responsibilitiesAr: [
            'تنظيم شبكات النقل العام بالحافلات بين المدن وداخلها',
            'وضع معايير واشتراطات منشآت تأجير السيارات والعقود الإلكترونية الموحدة',
            'تنظيم أنشطة الأجرة وتطبيقات توجيه المركبات وضوابط السعودة'
          ],
          responsibilitiesEn: [
            'Regulate intercity and urban public bus transit networks',
            'Enforce car rental bylaws and unified electronic lease contracts (Tajeer)',
            'Govern taxi fleets, digital ride-hailing apps, and localization policies'
          ],
          color: '#047857',
          stats: { staffCount: 160, activeLicenses: 12500, supervisedFleets: 95000, complianceScore: 95.8 },
          children: [
            {
              id: 'org-dir-bus-transport',
              nameAr: 'الإدارة العامة للنقل بالحافلات',
              nameEn: 'General Directorate of Bus Transport',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-passenger',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-passenger',
              code: 'DIR-BUS',
              descriptionAr: 'تنظيم الحافلات المدرسية والجامعية، النقل السياحي، النقل المتخصص، والنقل الدولي وبين المدن بالحافلات.',
              descriptionEn: 'Regulates school buses, tourist transit, specialized transport, intercity and international coach lines.',
              responsibilitiesAr: [
                'إصدار بطاقات التشغيل لحافلات النقل العام والمتخصص والسياحي',
                'متابعة التزام المشغلين باشتراطات السلامة والراحة والأنظمة الذكية',
                'تخطيط ومراقبة خطوط النقل بين المدن ومحطات الركاب الرئيسية'
              ],
              responsibilitiesEn: [
                'Issue operating cards for public, chartered, and educational coaches',
                'Ensure compliance with safety standards and passenger tracking devices',
                'Design intercity routes and monitor passenger transit terminals'
              ],
              color: '#059669',
              stats: { staffCount: 52, activeLicenses: 2100, supervisedFleets: 32000, complianceScore: 96.2 }
            },
            {
              id: 'org-dir-car-rental',
              nameAr: 'الإدارة العامة للتأجير',
              nameEn: 'General Directorate of Vehicle Rental',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-passenger',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-passenger',
              code: 'DIR-RENT',
              descriptionAr: 'تنظيم مكاتب وشركات تأجير السيارات، والربط التقني مع منصة (تأجير) وإلزامية العقد الإلكتروني الموحد.',
              descriptionEn: 'Regulates vehicle rental companies, technical integration with the national Tajeer platform, and electronic unified contracts.',
              responsibilitiesAr: [
                'إصدار وتجديد تراخيص مكاتب وشركات تأجير السيارات فئات (أ، ب، ج، د)',
                'مراقبة تطبيق العقد الموحد لتأجير السيارات وحماية حقوق المؤجر والمستأجر',
                'الرقابة الميدانية على أسطول التأجير وعمر المركبات التشغيلي'
              ],
              responsibilitiesEn: [
                'License car rental agencies across statutory categories (A, B, C, D)',
                'Enforce the mandatory unified digital contract via Tajeer',
                'Audit rental fleet condition and operational vehicle age limits'
              ],
              color: '#059669',
              stats: { staffCount: 48, activeLicenses: 6800, supervisedFleets: 45000, complianceScore: 97.0 }
            },
            {
              id: 'org-dir-taxi-ridehailing',
              nameAr: 'الإدارة العامة للنقل بالأجرة والتوجيه',
              nameEn: 'General Directorate of Taxi & Ride-Hailing Transport',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-passenger',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-passenger',
              code: 'DIR-TAXI',
              descriptionAr: 'تنظيم خدمات سيارات الأجرة العامة والعائلية والمطار، وتطبيقات توجيه المركبات الذكية وبرامج دعم التوطين.',
              descriptionEn: 'Regulates public taxis, airport limousines, ride-hailing application providers, and driver localization programs.',
              responsibilitiesAr: [
                'تنظيم وتأهيل تطبيقات توجيه المركبات والربط التقني مع منصة (وصل)',
                'متابعة تطبيق الهوية الموحدة لسيارات الأجرة وأجهزة الدفع الإلكتروني',
                'مراقبة نسب التوطين ودعم السائقين المستقلين بالتعاون مع صندوق الموارد البشرية'
              ],
              responsibilitiesEn: [
                'Qualify digital ride-hailing apps with Wasl platform telemetry',
                'Enforce unified taxi liveries and mandatory in-vehicle POS terminals',
                'Audit driver Saudization and manage independent driver incentives'
              ],
              color: '#059669',
              stats: { staffCount: 60, activeLicenses: 3600, supervisedFleets: 18000, complianceScore: 94.2 }
            }
          ]
        },
        {
          id: 'org-agency-freight-logistics',
          nameAr: 'وكالة الهيئة للنقل البري للبضائع والخدمات اللوجستية',
          nameEn: 'Deputyship for Freight Land Transport & Logistics Services',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-regulatory',
          sectorId: 'org-sector-regulatory',
          code: 'AG-FRT',
          descriptionAr: 'الجهة المنظمة لعمليات النقل الثقيل، ونقل البضائع، والشاحنات، والنقل الخفيف وتوصيل الطلبات، ونقل البريد، والمراكز اللوجستية في المملكة.',
          descriptionEn: 'Regulates heavy freight haulage, light commercial delivery, courier/postal services, and integrated logistics zones.',
          responsibilitiesAr: [
            'تنظيم قطاع شاحنات النقل الثقيل ونقل المواد الخطرة والسلع المبردة',
            'تنظيم تطبيقات توصيل الطلبات والنقل الخفيف وضوابط تشغيل الدراجات والمركبات',
            'إصدار تراخيص نقل الطرود والبريد السريع والمستودعات والمناطق اللوجستية'
          ],
          responsibilitiesEn: [
            'Govern heavy trucking, hazardous materials carriage, and reefer cargo transport',
            'Regulate last-mile delivery applications and light courier mobility',
            'License postal, parcel distribution, and bonded logistics park operations'
          ],
          color: '#15803d',
          stats: { staffCount: 220, activeLicenses: 15800, supervisedFleets: 145000, complianceScore: 96.8 },
          children: [
            {
              id: 'org-dir-heavy-transport',
              nameAr: 'الإدارة العامة للنقل الثقيل',
              nameEn: 'General Directorate of Heavy Transport',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-freight-logistics',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-freight-logistics',
              code: 'DIR-HVY',
              descriptionAr: 'تنظيم شاحنات نقل البضائع العامة والمهمات الثقيلة، ونقل المواد البترولية والكيماوية، ومراقبة الأوزان والأبعاد القانونية.',
              descriptionEn: 'Regulates general heavy freight carriers, petrochemical/hazardous haulers, and axle-weight compliance.',
              responsibilitiesAr: [
                'إصدار بطاقات التشغيل ووثائق النقل للشاحنات الثقيلة والمقطورات',
                'تنظيم ومراقبة محطات وزن الشاحنات وحماية البنية التحتية للطرق',
                'إلزامية تركيب حواجز الحماية وربط الشاحنات بأجهزة التتبع في منصة (وصل)'
              ],
              responsibilitiesEn: [
                'Issue operating cards and consignment documents for heavy trailers',
                'Operate weight stations and prevent highway pavement overload',
                'Mandate underrun protection and tracking integration into Wasl'
              ],
              color: '#16a34a',
              stats: { staffCount: 75, activeLicenses: 6200, supervisedFleets: 82000, complianceScore: 97.4 }
            },
            {
              id: 'org-dir-light-delivery',
              nameAr: 'الإدارة العامة للنقل الخفيف وتوصيل الطلبات',
              nameEn: 'General Directorate of Light Transport & Last-Mile Delivery',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-freight-logistics',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-freight-logistics',
              code: 'DIR-DELIV',
              descriptionAr: 'تنظيم أنشطة النقل الخفيف للمهمات التجارية وتطبيقات توصيل الطلبات الاستهلاكية وضوابط قائدي المركبات والدراجات.',
              descriptionEn: 'Regulates commercial light freight, on-demand meal and parcel delivery platforms, and courier driver licensing.',
              responsibilitiesAr: [
                'تأهيل منصات وتطبيقات توصيل الطلبات الإلكترونية وضوابط العمل الحر',
                'تنظيم متطلبات السلامة للدراجات النارية المخصصة للتوصيل وصناديق الحفظ',
                'الرقابة على وثيقة العمل الحر ونسب إشراك المواطنين في التوصيل'
              ],
              responsibilitiesEn: [
                'Authorize digital delivery aggregators and freelance couriers',
                'Mandate safety gear, temperature-controlled delivery boxes, and motorcycle standards',
                'Enforce freelance transport permit validations and national driver quotas'
              ],
              color: '#16a34a',
              stats: { staffCount: 58, activeLicenses: 4900, supervisedFleets: 41000, complianceScore: 95.1 }
            },
            {
              id: 'org-dir-postal-transport',
              nameAr: 'الإدارة العامة لنقل البريد',
              nameEn: 'General Directorate of Postal Transport',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-freight-logistics',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-freight-logistics',
              code: 'DIR-POST',
              descriptionAr: 'تنظيم وتطوير نقل الطرود والرسائل البريدية والبريد السريع وفق المعايير البريدية واللوجستية العالمية.',
              descriptionEn: 'Regulates parcel shipping, express couriers, and national mail transit logistics in compliance with international postal standards.',
              responsibilitiesAr: [
                'ترخيص شركات النقل والبريد السريع المحلي والدولي',
                'وضع معايير حماية سرية وسلامة الإرساليات والطرود البريدية',
                'التنسيق مع هيئة الاتصالات والفضاء والتقنية والجهات الجمركية'
              ],
              responsibilitiesEn: [
                'License domestic and international express parcel logistics operators',
                'Set consumer rights charters for parcel tracking, damage compensation, and delivery times',
                'Coordinate with customs and communications regulators for cross-border transit'
              ],
              color: '#16a34a',
              stats: { staffCount: 38, activeLicenses: 1200, supervisedFleets: 12000, complianceScore: 98.2 }
            },
            {
              id: 'org-dir-logistics-zones',
              nameAr: 'الإدارة العامة للخدمات والمناطق اللوجستية',
              nameEn: 'General Directorate of Logistics Zones & Services',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-freight-logistics',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-freight-logistics',
              code: 'DIR-LOGZ',
              descriptionAr: 'تنظيم وترخيص المناطق والمراكز اللوجستية الخاصة والحرة ومستودعات التخزين الجاف والمبرد وإعادة التصدير.',
              descriptionEn: 'Regulates, master-plans, and licenses special integrated logistics zones, warehousing parks, and freight terminals.',
              responsibilitiesAr: [
                'ترخيص المناطق اللوجستية الخاصة وتحديد معايير البنية التحتية',
                'تنظيم أنشطة وسيط الشحن وتخزين وتفريغ وتجميع البضائع',
                'تحفيز الشراكات الاستراتيجية مع كبرى شركات سلاسل الإمداد العالمية'
              ],
              responsibilitiesEn: [
                'License special logistics zones and set world-class park benchmarks',
                'Regulate freight forwarders, cargo consolidating hubs, and cold storage parks',
                'Attract global multimodal supply chain operators into the Kingdom'
              ],
              color: '#16a34a',
              stats: { staffCount: 49, activeLicenses: 3500, supervisedFleets: 10000, complianceScore: 97.9 }
            }
          ]
        },
        {
          id: 'org-agency-maritime',
          nameAr: 'وكالة الهيئة للنقل البحري',
          nameEn: 'Deputyship for Maritime Transport',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-regulatory',
          sectorId: 'org-sector-regulatory',
          code: 'AG-MAR',
          descriptionAr: 'تنظيم القطاع البحري، وتسجيل السفن تحت العلم السعودي، والسلامة والبيئة البحرية، وتأهيل وترخيص البحارة.',
          descriptionEn: 'Regulates maritime shipping, vessel registration under the Saudi Flag, maritime environmental safety, and mariner qualifications.',
          responsibilitiesAr: [
            'إدارة السجل البحري للسفن ورفع العلم السعودي على السفن والناقلات',
            'تطبيق الاتفاقيات البحرية الدولية (SOLAS, MARPOL, STCW)',
            'حماية البيئة البحرية والتفتيش على السفن واليخوت وقوارب الصيد والنزهة'
          ],
          responsibilitiesEn: [
            'Administer vessel registries and expand the Saudi Flag commercial fleet',
            'Enforce international safety conventions (SOLAS, MARPOL, STCW)',
            'Protect coastal ecosystems, inspect vessels, and certify leisure yachts'
          ],
          color: '#0284c7',
          stats: { staffCount: 110, activeLicenses: 1900, supervisedFleets: 420, complianceScore: 98.6 },
          children: [
            {
              id: 'org-dir-maritime-policies',
              nameAr: 'الإدارة العامة لسياسات النقل البحري وشؤون المنظمات الدولية',
              nameEn: 'General Directorate of Maritime Policies & International Affairs',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-maritime',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-maritime',
              code: 'DIR-MARPOL',
              descriptionAr: 'صياغة السياسات البحرية ومتابعة التطورات في المنظمات الدولية البحرية وتطوير الاتفاقيات الثنائية.',
              descriptionEn: 'Formulates maritime shipping policies and oversees compliance with international treaties and agreements.',
              responsibilitiesAr: [
                'تطوير التشريعات البحرية الوطنية وتحديثها وفق المتغيرات العالمية',
                'متابعة تنفيذ قرارات المنظمة البحرية الدولية (IMO) ومذكرات التفاهم الإقليمية',
                'تمثيل المملكة في اللجان الفنية البحرية والاتفاقيات الثنائية للملاحة'
              ],
              responsibilitiesEn: [
                'Draft modern maritime statutes according to world best practices',
                'Implement IMO resolutions and regional port state control MoUs',
                'Coordinate bilateral navigation accords with key trading partner states'
              ],
              color: '#0369a1',
              stats: { staffCount: 32, activeLicenses: 320, supervisedFleets: 180, complianceScore: 99.0 }
            },
            {
              id: 'org-dir-maritime-safety-env',
              nameAr: 'الإدارة العامة للبيئة والسلامة البحرية',
              nameEn: 'General Directorate of Maritime Environment & Safety',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-maritime',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-maritime',
              code: 'DIR-MARENV',
              descriptionAr: 'التفتيش والرقابة على سلامة السفن والموانئ البحرية، ومنع التلوث البحري وإدارة الكوارث البحرية.',
              descriptionEn: 'Inspects vessel safety standards, prevents marine environmental pollution, and audits emergency plans.',
              responsibilitiesAr: [
                'تنفيذ رقابة دولة الميناء ودولة العلم على السفن التجارية',
                'التفتيش الدوري على معدات الإنقاذ والسلامة ومكافحة التلوث على متن السفن',
                'التحقيق في الحوادث البحرية وتطبيق خطط الطوارئ البيئية في المياه السعودية'
              ],
              responsibilitiesEn: [
                'Execute Port State Control and Flag State inspections on foreign and local vessels',
                'Audit onboard life-saving, firefighting, and pollution prevention systems',
                'Investigate maritime casualties and enforce environmental oil spill contingency plans'
              ],
              color: '#0369a1',
              stats: { staffCount: 44, activeLicenses: 890, supervisedFleets: 240, complianceScore: 98.4 }
            },
            {
              id: 'org-dir-seafarers-qualification',
              nameAr: 'الإدارة العامة لاعتماد التأهيل البحري وشؤون البحارة',
              nameEn: 'General Directorate of Maritime Qualification Accreditation & Seafarers Affairs',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-maritime',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-maritime',
              code: 'DIR-SEAFAR',
              descriptionAr: 'إصدار الجوازات والشهادات البحرية للربابنة والضباط والمهندسين والبحارة واعتماد المعاهد البحرية.',
              descriptionEn: 'Certifies marine officers, engineers, and seafarers under STCW convention, and accredits maritime training academies.',
              responsibilitiesAr: [
                'إصدار شهادات الكفاءة والجوازات البحرية للبحارة السعوديين والدوليين',
                'اعتماد وتقييم الأكاديميات والمعاهد ومراكز التدريب والتعليم البحري',
                'ضمان حقوق البحارة والالتزام باتفاقية العمل البحري (MLC 2006)'
              ],
              responsibilitiesEn: [
                'Issue Certificates of Competency and Seaman discharge books',
                'Accredit and audit maritime colleges, simulators, and training academies',
                'Safeguard seafarer labor rights according to MLC 2006 convention'
              ],
              color: '#0369a1',
              stats: { staffCount: 34, activeLicenses: 690, supervisedFleets: 0, complianceScore: 98.8 }
            }
          ]
        },
        {
          id: 'org-agency-enablement',
          nameAr: 'وكالة الهيئة لتمكين النقل',
          nameEn: 'Deputyship for Transport Enablement',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-regulatory',
          sectorId: 'org-sector-regulatory',
          code: 'AG-ENBL',
          descriptionAr: 'تمكين صناعة النقل عبر الدراسات والتخطيط الاستراتيجي، والتنظيم الاقتصادي والتعريفات، وتبني حلول التنقل الحديث والمستقبلي.',
          descriptionEn: 'Enables the transport ecosystem through economic regulation, modal master planning, modern autonomous mobility, and innovation.',
          responsibilitiesAr: [
            'إعداد الدراسات الشاملة لتخطيط شبكات النقل وسلاسل الإمداد الوطنية',
            'التنظيم الاقتصادي للتسعير والتعريفات وحماية المنافسة والعدالة السوقية',
            'تنظيم وتجربة أنماط التنقل الحديث (المركبات ذاتية القيادة، التنقل الكهربائي، الطائرات بدون طيار)'
          ],
          responsibilitiesEn: [
            'Conduct nationwide transport capacity modeling and strategic network planning',
            'Regulate tariffs, fair economic access, and market contestability',
            'Enable autonomous vehicles, EV transit ecosystems, and smart urban mobility'
          ],
          color: '#4338ca',
          stats: { staffCount: 95, activeLicenses: 1800, supervisedFleets: 3500, complianceScore: 97.5 },
          children: [
            {
              id: 'org-dir-studies-planning',
              nameAr: 'الإدارة العامة للدراسات وتخطيط النقل',
              nameEn: 'General Directorate of Transport Studies & Planning',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-enablement',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-enablement',
              code: 'DIR-PLAN',
              descriptionAr: 'دراسة وتخطيط الطلب على النقل، والمخططات الهيكلية للنقل الإقليمي والحضري بالمملكة.',
              descriptionEn: 'Forecasts freight and passenger demand, formulates regional master plans, and designs integrated corridor networks.',
              responsibilitiesAr: [
                'بناء وتحديث النماذج الرياضية للتنبؤ بحركة النقل والمسافرين والبضائع',
                'تقييم الجدوى الفنية والاقتصادية لمشاريع البنية التحتية للنقل',
                'التنسيق التخطيطي مع هيئات تطوير المدن والمناطق وأمانات المناطق'
              ],
              responsibilitiesEn: [
                'Maintain national transport demand forecasting models',
                'Assess techno-economic feasibility for major transport corridors',
                'Align infrastructure planning with regional urban development commissions'
              ],
              color: '#4f46e5',
              stats: { staffCount: 35, activeLicenses: 0, supervisedFleets: 0, complianceScore: 98.0 }
            },
            {
              id: 'org-dir-economic-regulation',
              nameAr: 'الإدارة العامة للتنظيم الاقتصادي',
              nameEn: 'General Directorate of Economic Regulation',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-enablement',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-enablement',
              code: 'DIR-ECON',
              descriptionAr: 'وضع الضوابط الاقتصادية للأسعار ومراقبة الممارسات الاحتكارية وتشجيع الاستثمار المحلي والأجنبي في النقل.',
              descriptionEn: 'Sets economic guidelines, monitors market tariffs, prevents monopolistic lock-ins, and stimulates logistics investments.',
              responsibilitiesAr: [
                'وضع أطر تحديد ومراجعة أسعار وتعريفات خدمات النقل العام والتجاري',
                'مكافحة الإغراق والممارسات المخلة بالمنافسة في أنشطة النقل',
                'تصميم الحوافز الاستثمارية لزيادة تدفق رؤوس الأموال لقطاع اللوجستيات'
              ],
              responsibilitiesEn: [
                'Formulate fare structures and pricing transparency guidelines',
                'Safeguard competitive equity and prevent anti-competitive mergers',
                'Structure investor incentive packages for transport infrastructure'
              ],
              color: '#4f46e5',
              stats: { staffCount: 28, activeLicenses: 0, supervisedFleets: 0, complianceScore: 97.2 }
            },
            {
              id: 'org-dir-modern-mobility',
              nameAr: 'الإدارة العامة للتنقل الحديث',
              nameEn: 'General Directorate of Modern Mobility',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-enablement',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-enablement',
              code: 'DIR-FUTM',
              descriptionAr: 'تنظيم الابتكارات في قطاع النقل كالمركبات ذاتية القيادة، والتنقل المصغر، والنقل التشاركي، والشحن الكهربائي والهيدروجيني.',
              descriptionEn: 'Regulates disruptive mobility, autonomous pods, micro-mobility, hyperloop concepts, and zero-emission vehicle transit.',
              responsibilitiesAr: [
                'إصدار التراخيص التجريبية للبيئة الرملية (Regulatory Sandbox) للتقنيات الحديثة',
                'وضع معايير تشغيل المركبات ذاتية القيادة والروبوتات الميدانية للتوصيل',
                'تنظيم وتشجيع وسائل النقل النظيفة والكهربائية وخفض الانبعاثات الكربونية'
              ],
              responsibilitiesEn: [
                'Operate regulatory sandbox frameworks for emerging transit technologies',
                'Establish operating standards for autonomous vehicles and delivery robotics',
                'Promote green fleet conversions and transport decarbonization protocols'
              ],
              color: '#4f46e5',
              stats: { staffCount: 32, activeLicenses: 1800, supervisedFleets: 3500, complianceScore: 97.8 }
            }
          ]
        },
        {
          id: 'org-agency-railway',
          nameAr: 'وكالة الهيئة للنقل السككي',
          nameEn: 'Deputyship for Railway Transport',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-regulatory',
          sectorId: 'org-sector-regulatory',
          code: 'AG-RAIL',
          descriptionAr: 'تنظيم قطار الحرمين السريع، قطار الشمال والشرق، المترو والترام، وإصدار شهادات السلامة السككية والرقابة الفنية.',
          descriptionEn: 'Regulates national passenger/mineral rail networks (SAR, Haramain High-Speed Rail), urban metros, light rail, and railway safety.',
          responsibilitiesAr: [
            'إصدار شهادات السلامة السككية لمشغلي شبكات القطارات والمترو',
            'التأكد من التزام المشغلين بأعلى معايير السلامة والجودة والصيانة',
            'المواءمة والربط السككي الدولي ضمن مشروع قطار دول مجلس التعاون الخليجي'
          ],
          responsibilitiesEn: [
            'Grant railway safety certificates for high-speed, freight, and urban metro operators',
            'Enforce track maintenance rigor, rolling stock specs, and signaling standards',
            'Coordinate GCC Railway interoperability and cross-border connectivity'
          ],
          color: '#b45309',
          stats: { staffCount: 95, activeLicenses: 2200, supervisedFleets: 180, complianceScore: 99.2 },
          children: [
            {
              id: 'org-dir-railway-policies',
              nameAr: 'الإدارة العامة لسياسات ومواصفات النقل السككي وشؤون المنظمات الدولية',
              nameEn: 'General Directorate of Railway Policies, Specifications & International Affairs',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-railway',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-railway',
              code: 'DIR-RAILPOL',
              descriptionAr: 'إعداد اللوائح والمواصفات الفنية الوطنية لسكك الحديد ومحطات القطارات والتمثيل بالمنظمات الدولية (UIC).',
              descriptionEn: 'Develops national railway technical specifications, station design standards, and coordinates with the International Union of Railways (UIC).',
              responsibilitiesAr: [
                'وضع وتحديث كود ومواصفات السكك الحديدية للمسارات وعربات القطار والإشارات',
                'مواءمة الأنظمة السككية مع المنظمات الدولية ومعايير الاتحاد الدولي للسكك الحديدية',
                'صياغة لوائح تراخيص قائدي القطارات والفنيين ومشغلي المحطات'
              ],
              responsibilitiesEn: [
                'Maintain the Saudi Railway Code covering tracks, rolling stock, and signaling',
                'Harmonize standards with UIC guidelines and GCC technical specifications',
                'Regulate train driver licensing, conductor certifications, and dispatch operations'
              ],
              color: '#d97706',
              stats: { staffCount: 28, activeLicenses: 450, supervisedFleets: 60, complianceScore: 99.4 }
            },
            {
              id: 'org-dir-railway-safety',
              nameAr: 'الإدارة العامة لسلامة وكفاءة النقل السككي',
              nameEn: 'General Directorate of Railway Safety & Efficiency',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-railway',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-railway',
              code: 'DIR-RAILSAF',
              descriptionAr: 'التحقق الدوري من سلامة الشبكات، تقييم كفاءة وموثوقية التشغيل، والتحقيق في الحوادث السككية.',
              descriptionEn: 'Audits network operating safety, measures line efficiency and punctuality, and oversees accident investigations.',
              responsibilitiesAr: [
                'التفتيش الدوري الميداني على سلامة الخطوط السككية وأنظمة الإشارات والمحطات',
                'إجراء التحقيقات الفنية في الحوادث والأعطال السككية لرفع التوصيات الملزمة',
                'مراقبة مؤشرات كفاءة الأداء السككي ومواعيد الرحلات وتجربة الركاب'
              ],
              responsibilitiesEn: [
                'Conduct systematic safety audits on railway tracks, grade crossings, and signaling',
                'Investigate railway incidents and enforce mandatory preventive measures',
                'Monitor on-time performance, rolling stock availability, and passenger comfort'
              ],
              color: '#d97706',
              stats: { staffCount: 38, activeLicenses: 950, supervisedFleets: 70, complianceScore: 99.1 }
            },
            {
              id: 'org-dir-railway-planning-dev',
              nameAr: 'الإدارة العامة لتخطيط وتطوير النقل السككي',
              nameEn: 'General Directorate of Railway Planning & Development',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-railway',
              sectorId: 'org-sector-regulatory',
              deputyshipId: 'org-agency-railway',
              code: 'DIR-RAILPLAN',
              descriptionAr: 'تخطيط توسعات شبكة السكك الحديدية بين المدن، والمترو والقطارات الخفيفة داخل المدن، وتطوير الموانئ الجافة.',
              descriptionEn: 'Plans future intercity rail corridors, urban metro developments, dry ports connections, and freight rail terminals.',
              responsibilitiesAr: [
                'تخطيط مسارات السكك الحديدية الاستراتيجية وربط الموانئ والمناطق الصناعية والتعدينية',
                'دراسة تكامل السكك الحديدية مع وسائط النقل الأخرى (Multimodal Integration)',
                'تطوير وتأهيل محطات النقل التبادلي ومحطات الشحن السككي للبضائع'
              ],
              responsibilitiesEn: [
                'Master-plan national rail expansions linking ports, mining, and industrial hubs',
                'Design multimodal passenger interchanges and dry port freight sidings',
                'Evaluate railway concessions, public-private partnerships, and operational contracts'
              ],
              color: '#d97706',
              stats: { staffCount: 29, activeLicenses: 800, supervisedFleets: 50, complianceScore: 99.0 }
            }
          ]
        }
      ]
    },

    // SECTOR 2: نائب الرئيس لقطاع العمليات والتحول الرقمي
    {
      id: 'org-sector-ops-digital',
      nameAr: 'نائب الرئيس لقطاع العمليات والتحول الرقمي',
      nameEn: 'Vice President for Operations & Digital Transformation',
      level: 'SECTOR',
      levelLabelAr: 'قطاع',
      levelLabelEn: 'Sector',
      parentId: 'org-presidency',
      code: 'SEC-OPS',
      descriptionAr: 'قيادة القطاع المسؤول عن العمليات الميدانية، والتراخيص، والفروع، والرقابة والامتثال، والتحول الرقمي والتقني، والشؤون القانونية والخدمات المشتركة.',
      descriptionEn: 'Leads operational enforcement, licensing, branch offices, smart compliance monitoring, digital enterprise platforms, legal, and shared corporate services.',
      responsibilitiesAr: [
        'الإشراف على وكالات العمليات، والتحول الرقمي، والأنظمة والشؤون القانونية، والخدمات المشتركة',
        'قيادة التحول الرقمي وأتمتة كافة خدمات التراخيص والتصاريح والربط الحكومي الموحد',
        'متابعة أعمال الرقابة والتفتيش الميداني والذكي في جميع مناطق المملكة',
        'تعزيز الكفاءة التشغيلية والمالية ورأس المال البشري لمنظومة النقل'
      ],
      responsibilitiesEn: [
        'Direct deputyships for Operations, Digital Transformation, Legal Affairs, and Shared Services',
        'Lead enterprise digital transformation and seamless integration with government platforms',
        'Oversee comprehensive field and automated compliance inspections across all 13 provinces',
        'Elevate institutional operational efficiency, financial sustainability, and talent development'
      ],
      color: '#1e293b',
      stats: {
        staffCount: 770,
        activeLicenses: 14720,
        supervisedFleets: 40000,
        complianceScore: 97.8
      },
      children: [
        {
          id: 'org-agency-operations',
          nameAr: 'وكالة الهيئة للعمليات',
          nameEn: 'Deputyship for Operations',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-ops-digital',
          sectorId: 'org-sector-ops-digital',
          code: 'AG-OPS',
          descriptionAr: 'المسؤولة عن التنفيذ الميداني للتراخيص وتفعيل الأصول والرقابة والتفتيش وفروع الهيئة في جميع مناطق ومحافظات المملكة.',
          descriptionEn: 'Oversees operational field deployment, transport assets, licensing branches, and nationwide inspection checkpoints.',
          responsibilitiesAr: [
            'إدارة فروع الهيئة ومراكز الخدمة الشاملة في مناطق المملكة',
            'إصدار وتجديد وتعديل التراخيص وبطاقات التشغيل لممارسي أنشطة النقل',
            'تنفيذ الحملات التفتيشية الميدانية والرقابة الذكية بالتعاون مع الجهات الأمنية'
          ],
          responsibilitiesEn: [
            'Manage regional TGA branch networks and customer care branches across Saudi provinces',
            'Issue, renew, and modify commercial transport permits and operational vehicle cards',
            'Execute field inspections and automated smart surveillance alongside security forces'
          ],
          color: '#334155',
          stats: { staffCount: 380, activeLicenses: 48920, supervisedFleets: 320000, complianceScore: 96.0 },
          children: [
            {
              id: 'org-dir-asset-activation',
              nameAr: 'الإدارة العامة لتفعيل أصول النقل',
              nameEn: 'General Directorate of Transport Asset Activation',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-operations',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-operations',
              code: 'DIR-ASSET',
              descriptionAr: 'إدارة وتفعيل محطات النقل، والمراكز اللوجستية، والأصول العقارية والتشغيلية التابعة للهيئة العامة للنقل.',
              descriptionEn: 'Manages and monetizes transport terminals, public depots, and operational state assets assigned to the authority.',
              responsibilitiesAr: [
                'حصر وإدارة وتأهيل الأصول العقارية والمحطات ومرافق النقل التابعة للهيئة',
                'طرح الفرص الاستثمارية في الأصول والمرافق لتعظيم العوائد وتحسين تجربة المستفيد',
                'متابعة الصيانة الوقائية والتشغيلية للمحطات والمرافق التشغيلية'
              ],
              responsibilitiesEn: [
                'Inventory and manage terminals, stations, and transport real estate assets',
                'Float commercial investment concessions on transport hubs and depots',
                'Oversee technical maintenance and public readiness of transport infrastructure'
              ],
              color: '#475569',
              stats: { staffCount: 45, activeLicenses: 0, supervisedFleets: 0, complianceScore: 98.1 }
            },
            {
              id: 'org-dir-compliance',
              nameAr: 'الإدارة العامة للامتثال',
              nameEn: 'General Directorate of Compliance',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-operations',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-operations',
              code: 'DIR-COMPL',
              descriptionAr: 'الرقابة والتفتيش الميداني والذكي لضبط المخالفات وضمان التزام المنشآت والسائقين بأنظمة ولوائح النقل في كافة مناطق المملكة.',
              descriptionEn: 'Leads field and smart digital compliance inspections, enforces regulatory bylaws, and levies administrative penalties.',
              responsibilitiesAr: [
                'تشغيل مركبات الرصد الذكي لرصد لوائح النقل والمخالفات آلياً عبر الكاميرات',
                'إجراء جولات التفتيش على منشآت النقل ومكاتب التأجير والشاحنات والحافلات',
                'تحرير وضبط مخالفات أنشطة النقل وتطبيق الجزاءات والغرامات النظامية'
              ],
              responsibilitiesEn: [
                'Operate automated camera vehicles for smart real-time license and permit scanning',
                'Conduct unannounced audits on car rental outlets, trucking centers, and depots',
                'Issue citations for regulatory violations and oversee fine settlements'
              ],
              color: '#475569',
              stats: { staffCount: 220, activeLicenses: 0, supervisedFleets: 320000, complianceScore: 94.8 }
            },
            {
              id: 'org-dir-licensing-branches',
              nameAr: 'الإدارة العامة للتراخيص والفروع',
              nameEn: 'General Directorate of Licensing & Regional Branches',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-operations',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-operations',
              code: 'DIR-LICBR',
              descriptionAr: 'الإشراف على فروع الهيئة الإقليمية الـ13، وإصدار وتجديد التراخيص لمنشآت النقل وتسهيل خدمة المستفيدين.',
              descriptionEn: 'Directs the 13 regional administrative branches, issues transport business permits, and oversees customer service centers.',
              responsibilitiesAr: [
                'الإشراف المباشر على فروع الهيئة في (الرياض، مكة، الشرقية، عسير، المدينة، وباقي المناطق)',
                'مراجعة واعتماد طلبات التراخيص للمنشآت التجارية وشركات النقل والخدمات المساندة',
                'تحسين تجربة العميل وتسريع فترات إنجاز المعاملات والتراخيص الرقمية'
              ],
              responsibilitiesEn: [
                'Direct regional authority branches across Riyadh, Makkah, Eastern Province, etc.',
                'Process commercial transport enterprise licenses and fleet additions',
                'Streamline user satisfaction and reduce licensing turnaround times'
              ],
              color: '#475569',
              stats: { staffCount: 115, activeLicenses: 48920, supervisedFleets: 0, complianceScore: 97.2 }
            }
          ]
        },
        {
          id: 'org-agency-digital-it',
          nameAr: 'وكالة الهيئة للتحول الرقمي وتقنية المعلومات',
          nameEn: 'Deputyship for Digital Transformation & IT',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-ops-digital',
          sectorId: 'org-sector-ops-digital',
          code: 'AG-DIGIT',
          descriptionAr: 'قيادة البنية الرقمية للهيئة، وتشغيل وتطوير المنصات الوطنية الكبرى (منصة وصل، بوابة نقل، منصة تأجير، بيئة الرصد الذكي).',
          descriptionEn: 'Drives national digital platforms, cloud infrastructure, AI solutions, data lake, and integrations (Naql, Wasl, Tajeer, Smart Camera Monitoring).',
          responsibilitiesAr: [
            'تشغيل وتطوير البنية التحتية السحابية والأنظمة الرقمية للهيئة',
            'إدارة المنصات الوطنية الكبرى (بوابة نقل، منصة وصل، منصة تأجير)',
            'تطوير حلول الأعمال والذكاء الاصطناعي وذكاء الأعمال والربط مع المنصات الحكومية'
          ],
          responsibilitiesEn: [
            'Maintain sovereign cloud architectures and high-availability digital infrastructures',
            'Develop national enterprise platforms: Naql portal, Wasl tracking, Tajeer rental registry',
            'Deploy enterprise AI, big data analytics, and seamless cross-governmental APIs'
          ],
          color: '#0f766e',
          stats: { staffCount: 130, activeLicenses: 0, supervisedFleets: 320000, complianceScore: 99.5 },
          children: [
            {
              id: 'org-dir-information-technology',
              nameAr: 'الإدارة العامة لتقنية المعلومات',
              nameEn: 'General Directorate of Information Technology',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-digital-it',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-digital-it',
              code: 'DIR-IT',
              descriptionAr: 'إدارة الخوادم، والشبكات، ومراكز البيانات، والأمن السيبراني، والدعم الفني لمنسوبي الهيئة والمتعاملين.',
              descriptionEn: 'Manages enterprise data centers, hybrid cloud networks, cybersecurity compliance (NCA), and tier-3 IT infrastructure support.',
              responsibilitiesAr: [
                'إدارة وصيانة مراكز البيانات السحابية وضمان استمرارية الأعمال بنسبة 99.99%',
                'تطبيق ضوابط الأمن السيبراني الصادرة من الهيئة الوطنية للأمن السيبراني (NCA)',
                'توفير الدعم الفني والأجهزة والبرمجيات لمنسوبي الهيئة وفروعها'
              ],
              responsibilitiesEn: [
                'Manage secure cloud data centers and ensure 99.99% high-availability uptime',
                'Implement mandatory National Cybersecurity Authority (NCA) controls',
                'Provide end-user IT support and hardware infrastructure across all branches'
              ],
              color: '#14b8a6',
              stats: { staffCount: 65, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.8 }
            },
            {
              id: 'org-dir-business-solutions',
              nameAr: 'الإدارة العامة لحلول الأعمال',
              nameEn: 'General Directorate of Business Solutions',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-digital-it',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-digital-it',
              code: 'DIR-BIZSOL',
              descriptionAr: 'هندسة البرمجيات، وتطوير المنتجات الرقمية (بوابة نقل، تطبيق الهيئة، لوحات التحكم التنفيذية)، والربط الحكومي.',
              descriptionEn: 'Architects enterprise software, digital customer products, Naql portal modules, and executive analytics dashboards.',
              responsibilitiesAr: [
                'تحليل وتطوير تطبيقات وبوابات الهيئة الرقمية وأتمتة مسارات العمل',
                'إدارة واجهات برمجة التطبيقات (APIs) والتكامل مع (أبشر، يقين، واثق، سداد، شموس)',
                'بناء لوحات المؤشرات الرقمية التفاعلية لمتخذي القرار وفرق الرقابة'
              ],
              responsibilitiesEn: [
                'Analyze and program customer-facing digital services and automated workflows',
                'Manage government API integrations: Absher, Yakeen, Wathiq, SADAD, and Shamoos',
                'Engineer executive business intelligence dashboards and predictive analytics'
              ],
              color: '#14b8a6',
              stats: { staffCount: 65, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.2 }
            }
          ]
        },
        {
          id: 'org-agency-legal',
          nameAr: 'وكالة الهيئة للأنظمة والشؤون القانونية',
          nameEn: 'Deputyship for Regulations & Legal Affairs',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-ops-digital',
          sectorId: 'org-sector-ops-digital',
          code: 'AG-LEGAL',
          descriptionAr: 'صياغة الأنظمة واللوائح والقرارات التنفيذية، وإدارة التقاضي والدفاع عن الهيئة أمام المحاكم، ومراجعة العقود والاتفاقيات.',
          descriptionEn: 'Formulates transport bylaws and executive decrees, handles litigation before administrative courts, and audits agreements.',
          responsibilitiesAr: [
            'صياغة ومراجعة مشاريع الأنظمة واللوائح والقرارات التنظيمية للهيئة',
            'تمثيل الهيئة أمام ديوان المظالم والمحاكم واللجان شبه القضائية',
            'دراسة اعتراضات المستفيدين على مخالفات النقل والغرامات المحررة ومراجعة العقود'
          ],
          responsibilitiesEn: [
            'Draft statutory legislations, executive bylaws, and board resolutions',
            'Represent the authority before the Administrative Judiciary (Board of Grievances)',
            'Adjudicate violation objections, examine commercial disputes, and vet agreements'
          ],
          color: '#831843',
          stats: { staffCount: 90, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.4 },
          children: [
            {
              id: 'org-dir-regulations',
              nameAr: 'الإدارة العامة للأنظمة واللوائح',
              nameEn: 'General Directorate of Regulations & By-laws',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-legal',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-legal',
              code: 'DIR-REGS',
              descriptionAr: 'الصياغة التشريعية للأنظمة، ومواءمة اللوائح مع التزامات المملكة الدولية، وتحديث جداول المخالفات.',
              descriptionEn: 'Conducts legislative drafting, aligns regulatory codes with national legal reforms, and updates infraction schedules.',
              responsibilitiesAr: [
                'إعداد الصياغة القانونية للوائح النقل التنفيذية والتنظيمية وجداول الغرامات',
                'المراجعة الدورية للوائح لضمان عدم تعارضها مع الأنظمة الوطنية السيادية',
                'نشر اللوائح على منصة (استطلاع) واستطلاع مرئيات العموم والمشغلين'
              ],
              responsibilitiesEn: [
                'Draft executive regulations, technical standards, and violation penalty schedules',
                'Conduct legislative reviews ensuring harmony with Saudi supreme statutes',
                'Publish draft bylaws on the national Istitlaa platform for public feedback'
              ],
              color: '#9d174d',
              stats: { staffCount: 26, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.6 }
            },
            {
              id: 'org-dir-legal-affairs',
              nameAr: 'الإدارة العامة للشؤون القانونية',
              nameEn: 'General Directorate of Legal Affairs',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-legal',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-legal',
              code: 'DIR-LEGAFF',
              descriptionAr: 'تقديم الاستشارات والفتاوى القانونية لكافة قطاعات الهيئة، ومراجعة العقود والاتفاقيات ومذكرات التفاهم.',
              descriptionEn: 'Provides authoritative legal opinions across all authority departments, and vets commercial contracts and MoUs.',
              responsibilitiesAr: [
                'تقديم الفتاوى والرأي القانوني في المسائل التنظيمية والإدارية والمالية',
                'مراجعة العقود الحكومية وعقود المشتريات ومذكرات التفاهم وملاحقها',
                'المشاركة في لجان التحقيق الإداري والمنافسات والشراء الحكومي'
              ],
              responsibilitiesEn: [
                'Provide legal advisory opinions on administrative, financial, and regulatory questions',
                'Review state procurement contracts, vendor tenders, and inter-agency MoUs',
                'Participate in internal administrative inquiries and tender committees'
              ],
              color: '#9d174d',
              stats: { staffCount: 32, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.3 }
            },
            {
              id: 'org-dir-litigation-objections',
              nameAr: 'الإدارة العامة للتقاضي والاعتراضات',
              nameEn: 'General Directorate of Litigation & Objections',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-legal',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-legal',
              code: 'DIR-LITIG',
              descriptionAr: 'الدفاع عن قرارات الهيئة أمام ديوان المظالم، ودراسة والبت في اعتراضات المخالفات المحررة على المنشآت والأفراد.',
              descriptionEn: 'Defends administrative decisions before courts, and adjudicates stakeholder objections on transport fines.',
              responsibilitiesAr: [
                'إعداد المذكرات الجوابية والترافع أمام المحاكم الإدارية والمحاكم العمالية',
                'دراسة الاعتراضات الإلكترونية المقدمة عبر منصة الهيئة على مخالفات النقل',
                'تنفيذ الأحكام القضائية الصادرة لصالح أو ضد الهيئة والتنسيق مع وزارة العدل'
              ],
              responsibilitiesEn: [
                'Draft defense briefs and appear before administrative and appellate courts',
                'Review and adjudicate electronic violation appeals submitted by transport operators',
                'Coordinate enforcement of judicial rulings with the Ministry of Justice'
              ],
              color: '#9d174d',
              stats: { staffCount: 32, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.3 }
            }
          ]
        },
        {
          id: 'org-agency-shared-services',
          nameAr: 'وكالة الهيئة للخدمات المشتركة',
          nameEn: 'Deputyship for Shared Services',
          level: 'DEPUTYSHIP',
          levelLabelAr: 'وكالة',
          levelLabelEn: 'Deputyship',
          parentId: 'org-sector-ops-digital',
          sectorId: 'org-sector-ops-digital',
          code: 'AG-SHARED',
          descriptionAr: 'إدارة الموارد البشرية، والميزانية والشؤون المالية والمحاسبية، والمشتريات والمستودعات والخدمات الإدارية والمرافق.',
          descriptionEn: 'Administers human capital, corporate budgeting and finance, government procurement, facilities, and general administrative affairs.',
          responsibilitiesAr: [
            'تطوير واستقطاب رأس المال البشري وإدارة التعويضات والتدريب والمواهب',
            'إدارة الميزانية السنوية، والتحصيل المالي، والحسابات والتقارير المالية الحكومية',
            'إدارة سلاسل الإمداد الداخلية والمشتريات والخدمات الإدارية ومباني الهيئة'
          ],
          responsibilitiesEn: [
            'Attract, develop, and retain human capital, compensation, and talent programs',
            'Manage annual state budgets, revenue collection, financial ledgers, and audits',
            'Supervise corporate procurement, facility operations, and internal supply stores'
          ],
          color: '#854d0e',
          stats: { staffCount: 170, activeLicenses: 0, supervisedFleets: 0, complianceScore: 98.7 },
          children: [
            {
              id: 'org-dir-human-capital',
              nameAr: 'الإدارة العامة لرأس المال البشري',
              nameEn: 'General Directorate of Human Capital',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-shared-services',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-shared-services',
              code: 'DIR-HR',
              descriptionAr: 'استقطاب الكفاءات الوطنية، وتطوير المهارات القيادية، وإدارة الأداء الوظيفي، وتطبيق لوائح الموارد البشرية.',
              descriptionEn: 'Executes talent acquisition, leadership development, employee performance appraisals, and civil service compliance.',
              responsibilitiesAr: [
                'تخطيط القوى العاملة واستقطاب الكوادر التخصصية في النقل وسلاسل الإمداد',
                'إدارة برامج التدريب والتطوير المستمر والابتعاث لبرامج النقل العالمية',
                'متابعة تقييم الأداء السنوي، والترقيات، وسلم الرواتب والمزايا'
              ],
              responsibilitiesEn: [
                'Conduct workforce planning and recruit specialized transport engineers and economists',
                'Administer corporate training programs and international specialized transport fellowships',
                'Manage performance reviews, promotions, and compensation structures'
              ],
              color: '#a16207',
              stats: { staffCount: 52, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.0 }
            },
            {
              id: 'org-dir-administrative-affairs',
              nameAr: 'الإدارة العامة للشؤون الإدارية',
              nameEn: 'General Directorate of Administrative Affairs',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-shared-services',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-shared-services',
              code: 'DIR-ADMIN',
              descriptionAr: 'إدارة المشتريات والمنافسات الحكومية عبر منصة (اعتماد)، وإدارة العقود والمستودعات والخدمات اللوجستية الداخلية والمرافق.',
              descriptionEn: 'Manages government tenders via Etimad platform, facilities, warehousing, corporate fleet, and office logistics.',
              responsibilitiesAr: [
                'طرح وإدارة المنافسات والمشتريات الحكومية عبر منصة (اعتماد)',
                'إدارة مباني الهيئة ومرافقها ومتابعة عقود الصيانة والنظافة والأمن والسلامة',
                'إدارة أسطول المركبات الإدارية الداخلية وحركة السيارات الميدانية'
              ],
              responsibilitiesEn: [
                'Execute state tenders and vendor procurements through Etimad',
                'Maintain corporate facilities, janitorial services, physical security, and safety',
                'Manage the authority internal administrative vehicle fleet and dispatch'
              ],
              color: '#a16207',
              stats: { staffCount: 64, activeLicenses: 0, supervisedFleets: 0, complianceScore: 98.4 }
            },
            {
              id: 'org-dir-financial-affairs',
              nameAr: 'الإدارة العامة للشؤون المالية',
              nameEn: 'General Directorate of Financial Affairs',
              level: 'DIRECTORATE',
              levelLabelAr: 'إدارة عامة',
              levelLabelEn: 'General Directorate',
              parentId: 'org-agency-shared-services',
              sectorId: 'org-sector-ops-digital',
              deputyshipId: 'org-agency-shared-services',
              code: 'DIR-FIN',
              descriptionAr: 'إدارة الحسابات، وصرف الرواتب والمستحقات، وإعداد الميزانية التقديرية، والتحصيل المالي لرسوم التراخيص والغرامات عبر (سداد).',
              descriptionEn: 'Oversees corporate treasury, budget allocations, payroll, accounting ledgers, and revenue collections via SADAD.',
              responsibilitiesAr: [
                'إعداد ومتابعة تنفيذ الميزانية السنوية بالتنسيق مع وزارة المالية',
                'إدارة عمليات التحصيل المالي الإلكتروني عبر نظام (سداد) وتدقيق الإيرادات',
                'إعداد الحساب الختامي والتقارير المالية الدورية ومطابقة الدفاتر المحاسبية'
              ],
              responsibilitiesEn: [
                'Formulate and execute annual budgets in coordination with Ministry of Finance',
                'Manage digital fee reconciliation and fine collections via SADAD payment gateway',
                'Prepare annual closing statements and ensure rigorous financial audit compliance'
              ],
              color: '#a16207',
              stats: { staffCount: 54, activeLicenses: 0, supervisedFleets: 0, complianceScore: 99.2 }
            }
          ]
        }
      ]
    }
  ]
};

export function flattenOrgUnits(node: OrgUnitServer = TGA_ORG_CHART): OrgUnitServer[] {
  let list: OrgUnitServer[] = [node];
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      list = list.concat(flattenOrgUnits(child));
    }
  }
  return list;
}
