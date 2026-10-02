import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  MapPin,
  Compass,
  AlertTriangle,
  Plus,
  Radio,
  Building2,
  Check,
  Mail,
  Bell,
  Sliders,
  Eye,
  Send,
  HelpCircle,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAuthHeaders } from '../../utils/api';
import { Geofence } from '../../types';

export interface DrawnShapeInitialData {
  type: 'POLYGON' | 'CIRCLE';
  center?: { lat: number; lng: number };
  radiusMeters?: number;
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
}

interface AddGeofenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (geofence: Geofence) => void;
  initialShape?: DrawnShapeInitialData | null;
}

const SAUDI_PRESETS = [
  { name: 'Riyadh Central Logistics Dry Port', nameAr: 'الميناء الجاف اللوجستي بالرياض', lat: 24.6333, lng: 46.7167, radius: 2500, color: '#10B981' },
  { name: 'King Abdulaziz Port Dammam', nameAr: 'ميناء الملك عبدالعزيز بالدمام', lat: 26.4450, lng: 50.1800, radius: 3000, color: '#3B82F6' },
  { name: 'Jeddah Islamic Seaport', nameAr: 'ميناء جدة الإسلامي', lat: 21.4650, lng: 39.1850, radius: 3500, color: '#06B6D4' },
  { name: 'NEOM Commercial Gateway Depot', nameAr: 'مستودع بوابة نيوم التجارية', lat: 28.0000, lng: 35.2000, radius: 5000, color: '#8B5CF6' },
  { name: 'Medina Highway Distribution Center', nameAr: 'مركز توزيع طريق المدينة المنورة', lat: 24.4700, lng: 39.6100, radius: 2000, color: '#F59E0B' }
];

export const AddGeofenceModal: React.FC<AddGeofenceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialShape
}) => {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<'CIRCLE' | 'POLYGON'>('CIRCLE');
  const [lat, setLat] = useState('24.7136');
  const [lng, setLng] = useState('46.6753');
  const [radiusMeters, setRadiusMeters] = useState('2500');
  const [polygonCoords, setPolygonCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [speedLimitKmh, setSpeedLimitKmh] = useState('80');
  const [color, setColor] = useState('#10B981');
  const [alertOnEnter, setAlertOnEnter] = useState(true);
  const [alertOnExit, setAlertOnExit] = useState(true);
  const [alertOnSpeeding, setAlertOnSpeeding] = useState(true);

  // Email and Push Notification States
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [emailInput, setEmailInput] = useState('abdulwahabmangal777@gmail.com');
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(true);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from drawn shape if provided
  useEffect(() => {
    if (initialShape) {
      setType(initialShape.type);
      if (initialShape.type === 'POLYGON' && initialShape.polygonCoordinates && initialShape.polygonCoordinates.length >= 3) {
        setPolygonCoords(initialShape.polygonCoordinates);
        // Calculate centroid for center
        const lats = initialShape.polygonCoordinates.map(p => p.lat);
        const lngs = initialShape.polygonCoordinates.map(p => p.lng);
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        setLat(avgLat.toFixed(6));
        setLng(avgLng.toFixed(6));
        setName(`Custom Zone (${initialShape.polygonCoordinates.length} vertices)`);
        setNameAr(`منطقة مخصصة (${initialShape.polygonCoordinates.length} نقاط)`);
      } else if (initialShape.center) {
        setLat(initialShape.center.lat.toFixed(6));
        setLng(initialShape.center.lng.toFixed(6));
        if (initialShape.radiusMeters) {
          setRadiusMeters(Math.round(initialShape.radiusMeters).toString());
        }
        setName('Custom Drawn Radial Zone');
        setNameAr('منطقة دائرية مرسومة');
      }
    }
  }, [initialShape]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof SAUDI_PRESETS[0]) => {
    setName(preset.name);
    setNameAr(preset.nameAr);
    setType('CIRCLE');
    setLat(preset.lat.toString());
    setLng(preset.lng.toString());
    setRadiusMeters(preset.radius.toString());
    setColor(preset.color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Geofence name is required.');
      return;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = parseFloat(radiusMeters);

    if (isNaN(latitude) || isNaN(longitude)) {
      setError('Center coordinates must be valid numbers.');
      return;
    }

    if (type === 'CIRCLE' && (isNaN(radius) || radius <= 0)) {
      setError('Radius must be a positive number.');
      return;
    }

    if (type === 'POLYGON' && polygonCoords.length < 3) {
      setError('A polygon geofence requires at least 3 perimeter vertices.');
      return;
    }

    // Parse notification emails
    const emails = emailInput
      .split(/[,;\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.includes('@'));

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
        type,
        center: { lat: latitude, lng: longitude },
        radiusMeters: radius,
        color,
        speedLimitKmh: speedLimitKmh ? parseFloat(speedLimitKmh) : undefined,
        alertOnEnter,
        alertOnExit,
        alertOnSpeeding,
        emailAlertsEnabled,
        notificationEmails: emails.length > 0 ? emails : ['abdulwahabmangal777@gmail.com'],
        pushAlertsEnabled
      };

      if (type === 'POLYGON' && polygonCoords.length >= 3) {
        payload.polygonCoordinates = polygonCoords;
      }

      const res = await fetch('/api/geofences', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create geofence');
      }

      const created = await res.json();
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating geofence');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-white my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {initialShape ? 'Configure Drawn Geofence Zone' : 'Create Virtual Geofence Zone'}
              </h3>
              <p className="text-xs text-slate-400">
                Define perimeter boundaries, dispatch rules, and automated alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Bar (only if not pre-filled from drawing) */}
        {!initialShape && (
          <div className="p-3 bg-slate-850/60 border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
              Quick Saudi Logistics Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAUDI_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                >
                  {p.name.split(' ')[0]} {p.name.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Boundary Geometry Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('CIRCLE')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  type === 'CIRCLE'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Radial Circle (Radius)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('POLYGON')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  type === 'POLYGON'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Custom Polygon Boundary</span>
              </button>
            </div>
          </div>

          {/* Polygon Coordinates Summary if Polygon */}
          {type === 'POLYGON' && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-4 h-4" />
                  Polygon Perimeter ({polygonCoords.length} Vertices Captured)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Min 3 vertices required
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {polygonCoords.map((pt, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-slate-400">
                    <span className="text-amber-400 font-bold">P{i + 1}</span>
                    <span>Lat: {pt.lat.toFixed(5)}</span>
                    <span>Lng: {pt.lng.toFixed(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Zone Name (EN) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Riyadh Logistics Dry Port"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Zone Name (AR)
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={e => setNameAr(e.target.value)}
                placeholder="مثال: الميناء الجاف بالرياض"
                dir="rtl"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden"
              />
            </div>
          </div>

          {/* Center Coordinates & Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {type === 'POLYGON' ? 'Centroid Latitude' : 'Center Latitude'}
              </label>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={e => setLat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {type === 'POLYGON' ? 'Centroid Longitude' : 'Center Longitude'}
              </label>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={e => setLng(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {type === 'CIRCLE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={radiusMeters}
                  onChange={e => setRadiusMeters(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Speed Limit (km/h)</label>
              <input
                type="number"
                min="10"
                max="160"
                value={speedLimitKmh}
                onChange={e => setSpeedLimitKmh(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Zone Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono text-slate-400">{color}</span>
              </div>
            </div>
          </div>

          {/* Trigger Alert Checkboxes */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
            <span className="text-xs font-bold text-slate-300 block">Automated Telematics Triggers</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertOnEnter}
                  onChange={e => setAlertOnEnter(e.target.checked)}
                  className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-300">Ingress (Enter)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertOnExit}
                  onChange={e => setAlertOnExit(e.target.checked)}
                  className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-300">Egress (Exit)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertOnSpeeding}
                  onChange={e => setAlertOnSpeeding(e.target.checked)}
                  className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-300">Over-Speed</span>
              </label>
            </div>
          </div>

          {/* Email & Push Notification Dispatch Settings */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Automated Notification Dispatch</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showEmailPreview ? 'Hide Preview' : 'Preview Bilingual Email'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={emailAlertsEnabled}
                    onChange={e => setEmailAlertsEnabled(e.target.checked)}
                    className="rounded border-slate-600 text-amber-500 focus:ring-amber-400"
                  />
                  <span>Dispatch Instant HTML Email Alerts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={pushAlertsEnabled}
                    onChange={e => setPushAlertsEnabled(e.target.checked)}
                    className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Push In-App Notifications</span>
                </label>
              </div>

              {emailAlertsEnabled && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Notification Recipient Email(s)
                  </label>
                  <input
                    type="text"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="abdulwahabmangal777@gmail.com, dispatch@khyber.sa"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Comma-separated email addresses. Default: Khyber Logistics Admin.
                  </span>
                </div>
              )}
            </div>

            {/* Bilingual Email Template Preview Box */}
            {showEmailPreview && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    Bilingual Email Dispatch Sample
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">From: alerts@khyberlogistics.sa</span>
                </div>
                <div className="bg-white text-slate-900 rounded-lg p-3 space-y-2 font-sans text-[11px] shadow-sm">
                  <div className="flex justify-between items-center border-b pb-1 text-[10px] text-slate-600">
                    <span className="font-bold text-emerald-700">KHYBER LOGISTICS SERVICES</span>
                    <span>شركة خيبر للخدمات اللوجستية</span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs">
                    🚨 Geofence Alert: Vehicle entering {name || 'Zone'}
                  </div>
                  <div className="text-slate-600 text-[10px]" dir="rtl">
                    تنبيه سياج جغرافي: دخول مركبة أسطول إلى منطقة {nameAr || name || 'المنطقة'}
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[10px] grid grid-cols-2 gap-1">
                    <div><strong>Vehicle:</strong> TRK-101 (Volvo FH16)</div>
                    <div><strong>Driver:</strong> Tariq Al-Ghamdi</div>
                    <div><strong>Location:</strong> Riyadh Corridor</div>
                    <div><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Creating Zone...' : 'Save Geofence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
