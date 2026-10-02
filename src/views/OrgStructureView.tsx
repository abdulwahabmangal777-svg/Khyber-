import React, { useState, useMemo } from 'react';
import {
  Building2,
  GitFork,
  Layers,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Truck,
  Compass,
  Award,
  CheckCircle2,
  FileText,
  Users,
  ExternalLink,
  Printer,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronUp,
  Bookmark,
  Check,
  Copy,
  LayoutGrid,
  ListTree,
  Table
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  TGA_ORG_STRUCTURE,
  OrgUnit,
  OrgLevel,
  getAllOrgUnits,
  findOrgUnitById
} from '../data/tgaOrgStructure';

export const OrgStructureView: React.FC = () => {
  const { language, dir } = useLanguage();
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'TREE' | 'GRID' | 'TABLE'>('TREE');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'org-presidency': true,
    'org-sector-regulatory': true,
    'org-sector-ops-digital': true,
    'org-presidents-office': true,
    'org-agency-passenger': true,
    'org-agency-freight-logistics': true,
    'org-agency-maritime': true,
    'org-agency-enablement': true,
    'org-agency-railway': true,
    'org-agency-operations': true,
    'org-agency-digital-it': true,
    'org-agency-legal': true,
    'org-agency-shared-services': true
  });

  const [selectedUnit, setSelectedUnit] = useState<OrgUnit | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allUnits = useMemo(() => getAllOrgUnits(TGA_ORG_STRUCTURE), []);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    allUnits.forEach(u => {
      next[u.id] = true;
    });
    setExpandedNodes(next);
  };

  const collapseAll = () => {
    setExpandedNodes({ 'org-presidency': true });
  };

  const filteredFlatUnits = useMemo(() => {
    return allUnits.filter(u => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNameAr = u.nameAr.toLowerCase().includes(q);
        const matchesNameEn = u.nameEn.toLowerCase().includes(q);
        const matchesCode = u.code.toLowerCase().includes(q);
        const matchesDesc = u.descriptionAr.toLowerCase().includes(q) || u.descriptionEn.toLowerCase().includes(q);
        const matchesResp = u.responsibilitiesAr.some(r => r.toLowerCase().includes(q)) ||
          u.responsibilitiesEn.some(r => r.toLowerCase().includes(q));
        if (!matchesNameAr && !matchesNameEn && !matchesCode && !matchesDesc && !matchesResp) {
          return false;
        }
      }

      // Level
      if (selectedLevel !== 'ALL' && u.level !== selectedLevel) {
        return false;
      }

      // Sector
      if (selectedSector !== 'ALL') {
        if (selectedSector === 'PRESIDENCY_DIRECT') {
          const isDirect = u.parentId === 'org-presidency' && u.level !== 'SECTOR';
          const isChildOfDirect = u.parentId === 'org-presidents-office';
          if (!isDirect && !isChildOfDirect && u.id !== 'org-presidency') return false;
        } else if (selectedSector === 'REGULATORY') {
          if (u.id !== 'org-sector-regulatory' && u.sectorId !== 'org-sector-regulatory' && u.parentId !== 'org-sector-regulatory') {
            const isDescendant = (u.id.startsWith('org-dir-') || u.id.startsWith('org-agency-')) &&
              ['org-agency-passenger', 'org-agency-freight-logistics', 'org-agency-maritime', 'org-agency-enablement', 'org-agency-railway'].includes(u.deputyshipId || u.id);
            if (!isDescendant) return false;
          }
        } else if (selectedSector === 'OPERATIONS') {
          if (u.id !== 'org-sector-ops-digital' && u.sectorId !== 'org-sector-ops-digital' && u.parentId !== 'org-sector-ops-digital') {
            const isDescendant = (u.id.startsWith('org-dir-') || u.id.startsWith('org-agency-')) &&
              ['org-agency-operations', 'org-agency-digital-it', 'org-agency-legal', 'org-agency-shared-services'].includes(u.deputyshipId || u.id);
            if (!isDescendant) return false;
          }
        }
      }

      return true;
    });
  }, [allUnits, searchQuery, selectedLevel, selectedSector]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stats = useMemo(() => {
    return {
      total: allUnits.length,
      sectors: allUnits.filter(u => u.level === 'SECTOR').length,
      deputyships: allUnits.filter(u => u.level === 'DEPUTYSHIP').length,
      directorates: allUnits.filter(u => u.level === 'DIRECTORATE').length,
      officesAndOthers: allUnits.filter(u => ['COMMITTEE', 'OFFICE', 'DELEGATION'].includes(u.level)).length
    };
  }, [allUnits]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: OrgUnit, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedNodes[node.id];

    // Filter match status for search highlighting
    const isSearchMatch = searchQuery.trim() !== '' && (
      node.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply sector filter to tree
    let isVisibleInSector = true;
    if (selectedSector !== 'ALL') {
      if (selectedSector === 'REGULATORY' && node.id === 'org-sector-ops-digital') isVisibleInSector = false;
      if (selectedSector === 'OPERATIONS' && node.id === 'org-sector-regulatory') isVisibleInSector = false;
      if (selectedSector === 'PRESIDENCY_DIRECT' && (node.id === 'org-sector-regulatory' || node.id === 'org-sector-ops-digital')) isVisibleInSector = false;
    }

    if (!isVisibleInSector) return null;

    return (
      <div key={node.id} className="relative flex flex-col items-center">
        {/* Node Card */}
        <div
          id={`org-node-${node.id}`}
          onClick={() => setSelectedUnit(node)}
          className={`group cursor-pointer transition-all duration-200 rounded-xl border p-4 shadow-sm hover:shadow-md ${
            isSearchMatch
              ? 'ring-2 ring-amber-500 bg-amber-50/90 border-amber-300'
              : selectedUnit?.id === node.id
              ? 'ring-2 ring-emerald-600 bg-emerald-50 border-emerald-500'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          } ${
            node.level === 'PRESIDENCY'
              ? 'w-80 md:w-96 border-emerald-800 bg-emerald-950 text-white shadow-emerald-950/20'
              : node.level === 'SECTOR'
              ? 'w-72 md:w-80 border-slate-300 bg-slate-900 text-white'
              : node.level === 'DEPUTYSHIP'
              ? 'w-64 md:w-72 border-emerald-200 bg-gradient-to-b from-white to-emerald-50/40 text-slate-900'
              : 'w-60 md:w-64 bg-white text-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  node.level === 'PRESIDENCY'
                    ? 'bg-emerald-800 text-emerald-100'
                    : node.level === 'SECTOR'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {node.code}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  node.level === 'PRESIDENCY'
                    ? 'bg-emerald-700/50 text-emerald-200'
                    : node.level === 'SECTOR'
                    ? 'bg-slate-700/50 text-slate-300'
                    : node.level === 'DEPUTYSHIP'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isAr ? node.levelLabelAr : node.levelLabelEn}
              </span>
            </div>

            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className={`p-1 rounded-md transition-colors ${
                  node.level === 'PRESIDENCY' || node.level === 'SECTOR'
                    ? 'hover:bg-white/20 text-white'
                    : 'hover:bg-slate-200 text-slate-600'
                }`}
                title={isExpanded ? (isAr ? 'طي الفرع' : 'Collapse branch') : (isAr ? 'توسيع الفرع' : 'Expand branch')}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Title */}
          <div className="mt-2.5">
            <h4
              className={`font-bold leading-tight ${
                node.level === 'PRESIDENCY'
                  ? 'text-lg text-emerald-100'
                  : node.level === 'SECTOR'
                  ? 'text-base text-slate-100'
                  : node.level === 'DEPUTYSHIP'
                  ? 'text-sm text-emerald-950'
                  : 'text-xs text-slate-900'
              }`}
            >
              {isAr ? node.nameAr : node.nameEn}
            </h4>
            <p
              className={`text-[11px] mt-1 line-clamp-1 ${
                node.level === 'PRESIDENCY' || node.level === 'SECTOR'
                  ? 'text-slate-300'
                  : 'text-slate-500'
              }`}
            >
              {isAr ? node.nameEn : node.nameAr}
            </p>
          </div>

          {/* Micro Stats / Indicators */}
          <div
            className={`mt-3 pt-2.5 flex items-center justify-between border-t text-[11px] ${
              node.level === 'PRESIDENCY' || node.level === 'SECTOR'
                ? 'border-white/15 text-slate-300'
                : 'border-slate-100 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3 h-3 opacity-70" />
              <span>{hasChildren ? `${node.children?.length} ${isAr ? 'وحدات فرعية' : 'sub-units'}` : (isAr ? 'وحدة تنفيذية' : 'Executive Unit')}</span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-emerald-600">
              <span className="text-[10px] underline group-hover:text-emerald-700">
                {isAr ? 'التفاصيل' : 'View Details'}
              </span>
            </div>
          </div>
        </div>

        {/* Child Connector & Branches */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col items-center mt-3 w-full">
            {/* Vertical stem down */}
            <div className="w-0.5 h-6 bg-slate-300"></div>

            {/* Horizontal bar across children if more than one */}
            <div className="relative flex justify-center items-start gap-4 pt-2">
              {node.children!.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-6 md:p-8 shadow-xl border border-emerald-900/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'المملكة العربية السعودية • الهيئة العامة للنقل' : 'Kingdom of Saudi Arabia • Transport General Authority'}</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <GitFork className="w-7 h-7 text-emerald-400" />
              <span>{isAr ? 'الهيكل التنظيمي المعتمد للهيئة العامة للنقل' : 'Official TGA Organizational Structure'}</span>
            </h1>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              {isAr
                ? 'الهيكل التنظيمي الرسمي الشامل بكافة مستوياته: القيادة العليا، اللجان والمكاتب المستقلة، قطاع التنظيم (وكالات النقل البري والبحري والسككي والتمكين)، وقطاع العمليات والتحول الرقمي (العمليات، التحول الرقمي، الشؤون القانونية، والخدمات المشتركة).'
                : 'Comprehensive organizational hierarchy of the Transport General Authority across executive leadership, independent committees & offices, regulatory sectors (Land, Freight, Maritime, Rail, Enablement), and operations & digital transformation sectors.'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={expandAll}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              <ChevronDown className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'توسيع الكل' : 'Expand All'}</span>
            </button>

            <button
              type="button"
              onClick={collapseAll}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              <ChevronUp className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'طي الكل' : 'Collapse All'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة الهيكل' : 'Print Chart'}</span>
            </button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">{isAr ? 'إجمالي الوحدات التنظيمية' : 'Total Org Units'}</p>
            <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{stats.total}</p>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">{isAr ? 'القطاعات الرئيسية' : 'Key Sectors'}</p>
            <p className="text-xl font-bold text-white font-mono mt-0.5">{stats.sectors}</p>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">{isAr ? 'الوكالات المتخصصة' : 'Deputyships'}</p>
            <p className="text-xl font-bold text-teal-300 font-mono mt-0.5">{stats.deputyships}</p>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">{isAr ? 'الإدارات العامة' : 'General Directorates'}</p>
            <p className="text-xl font-bold text-amber-300 font-mono mt-0.5">{stats.directorates}</p>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 col-span-2 sm:col-span-1">
            <p className="text-[11px] text-slate-400 font-medium">{isAr ? 'اللجان والمكاتب المستقلة' : 'Committees & Offices'}</p>
            <p className="text-xl font-bold text-indigo-300 font-mono mt-0.5">{stats.officesAndOthers}</p>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter & View Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'}`} />
            <input
              id="org-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث باسم الإدارة أو الوكالة (مثال: النقل الثقيل، الحافلات، الامتثال، البحري، التأجير)...'
                  : 'Search by directorate or agency (e.g. Heavy Transport, Bus, Compliance, Maritime, Rental)...'
              }
              className={`w-full h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all ${
                dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold px-2 ${
                  dir === 'rtl' ? 'left-3' : 'right-3'
                }`}
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('TREE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'TREE'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>{isAr ? 'مخطط شجري' : 'Tree View'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{isAr ? 'دليل البطاقات' : 'Cards Grid'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{isAr ? 'جدول الاختصاصات' : 'Matrix Table'}</span>
            </button>
          </div>
        </div>

        {/* Filters: Sector & Level Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isAr ? 'التصفية حسب القطاع:' : 'Sector Filter:'}</span>
          </span>

          {[
            { id: 'ALL', labelAr: 'كافة القطاعات', labelEn: 'All Sectors' },
            { id: 'REGULATORY', labelAr: 'قطاع التنظيم', labelEn: 'Regulatory Sector' },
            { id: 'OPERATIONS', labelAr: 'قطاع العمليات والتحول الرقمي', labelEn: 'Operations & Digital' },
            { id: 'PRESIDENCY_DIRECT', labelAr: 'رئاسة الهيئة واللجان', labelEn: 'Presidency & Offices' }
          ].map(sec => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSelectedSector(sec.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedSector === sec.id
                  ? 'bg-emerald-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isAr ? sec.labelAr : sec.labelEn}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <span className="text-xs font-semibold text-slate-500 ml-1">
            {isAr ? 'المستوى التنظيمي:' : 'Level:'}
          </span>

          {[
            { id: 'ALL', labelAr: 'الكل', labelEn: 'All' },
            { id: 'SECTOR', labelAr: 'قطاع', labelEn: 'Sector' },
            { id: 'DEPUTYSHIP', labelAr: 'وكالة', labelEn: 'Deputyship' },
            { id: 'DIRECTORATE', labelAr: 'إدارة عامة', labelEn: 'Directorate' },
            { id: 'COMMITTEE', labelAr: 'لجان ومكاتب', labelEn: 'Committees' }
          ].map(lvl => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setSelectedLevel(lvl.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedLevel === lvl.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isAr ? lvl.labelAr : lvl.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Views */}
      {viewMode === 'TREE' && (
        <div className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-6 md:p-10 overflow-x-auto shadow-inner min-h-[500px]">
          <div className="inline-block min-w-full pb-8">
            <div className="flex justify-center">
              {renderTreeNode(TGA_ORG_STRUCTURE)}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'GRID' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFlatUnits.map(unit => {
            const hasChildren = unit.children && unit.children.length > 0;
            return (
              <div
                key={unit.id}
                onClick={() => setSelectedUnit(unit)}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {unit.code}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${unit.badgeBg} ${unit.badgeText}`}>
                      {isAr ? unit.levelLabelAr : unit.levelLabelEn}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-3 group-hover:text-emerald-800 transition-colors">
                    {isAr ? unit.nameAr : unit.nameEn}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr ? unit.nameEn : unit.nameAr}
                  </p>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {isAr ? unit.descriptionAr : unit.descriptionEn}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{hasChildren ? `${unit.children?.length} ${isAr ? 'وحدات فرعية' : 'Sub-units'}` : (isAr ? 'إدارة عامة تنفيذية' : 'Executive Directorate')}</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <span>{isAr ? 'عرض المهام' : 'View Mandate'}</span>
                    <ChevronRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 text-start font-mono">{isAr ? 'الرمز' : 'Code'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'الوحدة التنظيمية' : 'Organizational Unit'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'المستوى' : 'Level'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'الوصف والاختصاص' : 'Mandate & Scope'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFlatUnits.map(unit => (
                  <tr
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {unit.code}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{isAr ? unit.nameAr : unit.nameEn}</div>
                      <div className="text-[11px] text-slate-500">{isAr ? unit.nameEn : unit.nameAr}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${unit.badgeBg} ${unit.badgeText}`}>
                        {isAr ? unit.levelLabelAr : unit.levelLabelEn}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md line-clamp-2">
                      {isAr ? unit.descriptionAr : unit.descriptionEn}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUnit(unit);
                        }}
                        className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] transition-colors"
                      >
                        {isAr ? 'عرض التفاصيل' : 'Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Unit Details Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative p-6 bg-gradient-to-r from-emerald-950 to-slate-900 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold text-xs bg-emerald-800 text-emerald-100 px-2.5 py-0.5 rounded-full">
                      {selectedUnit.code}
                    </span>
                    <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                      {isAr ? selectedUnit.levelLabelAr : selectedUnit.levelLabelEn}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {isAr ? selectedUnit.nameAr : selectedUnit.nameEn}
                  </h3>
                  <p className="text-slate-300 text-xs mt-1">
                    {isAr ? selectedUnit.nameEn : selectedUnit.nameAr}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUnit(null)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isAr ? 'الوصف والاختصاص العام' : 'General Mandate & Scope'}</span>
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                  {isAr ? selectedUnit.descriptionAr : selectedUnit.descriptionEn}
                </p>
              </div>

              {/* Responsibilities list */}
              {selectedUnit.responsibilitiesAr && selectedUnit.responsibilitiesAr.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isAr ? 'المهام والاختصاصات النظامية' : 'Statutory Responsibilities'}</span>
                  </h4>
                  <ul className="space-y-2">
                    {(isAr ? selectedUnit.responsibilitiesAr : selectedUnit.responsibilitiesEn).map((resp, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-2 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0"></span>
                        <span className="leading-relaxed">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sub-departments if any */}
              {selectedUnit.children && selectedUnit.children.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isAr ? `الوحدات والإدارات العامة التابعة (${selectedUnit.children.length})` : `Subordinate Units (${selectedUnit.children.length})`}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedUnit.children.map(child => (
                      <div
                        key={child.id}
                        onClick={() => setSelectedUnit(child)}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{isAr ? child.nameAr : child.nameEn}</p>
                          <span className="text-[10px] font-mono text-slate-500">{child.code} • {isAr ? child.levelLabelAr : child.levelLabelEn}</span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Operational & Regulatory Statistics */}
              {selectedUnit.stats && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isAr ? 'المؤشرات والبيانات الإحصائية التقديرية' : 'Operational & Regulatory Indicators'}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500">{isAr ? 'الكادر الوظيفي' : 'Staff Count'}</p>
                      <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">{selectedUnit.stats.staffCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500">{isAr ? 'التراخيص النشطة' : 'Active Licenses'}</p>
                      <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">{selectedUnit.stats.activeLicenses.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500">{isAr ? 'المركبات المشرفة' : 'Supervised Fleets'}</p>
                      <p className="text-sm font-bold text-teal-700 font-mono mt-0.5">{selectedUnit.stats.supervisedFleets.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500">{isAr ? 'نسبة الامتثال' : 'Compliance Rate'}</p>
                      <p className="text-sm font-bold text-indigo-700 font-mono mt-0.5">{selectedUnit.stats.complianceScore}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopy(selectedUnit.id, `${selectedUnit.nameAr} (${selectedUnit.code})`)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                {copiedId === selectedUnit.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === selectedUnit.id ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المسمى' : 'Copy Name')}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedUnit(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
