import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Trash2, Check, PenTool, ShieldCheck, Download } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface DigitalSignaturePadProps {
  onSignatureChange?: (signatureDataUrl: string | null, isEmpty: boolean) => void;
  signerName?: string;
  signerRole?: string;
  signerIdNumber?: string;
  height?: number;
  className?: string;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  onSignatureChange,
  signerName = '',
  signerRole = 'Signer / Employee',
  signerIdNumber = '',
  height = 180,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [penColor, setPenColor] = useState<string>('#1e3a8a'); // Deep Ink Blue by default
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  // Available ink colors
  const inkColors = [
    { label: 'Ink Blue', value: '#1e3a8a', bgClass: 'bg-blue-900' },
    { label: 'Deep Navy', value: '#0f172a', bgClass: 'bg-slate-900' },
    { label: 'Saudi Emerald', value: '#064e3b', bgClass: 'bg-emerald-900' },
    { label: 'Charcoal', value: '#18181b', bgClass: 'bg-zinc-900' }
  ];

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Draw baseline guide and watermark
    const dpr = window.devicePixelRatio || 1;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]);

    const lineY = canvas.height - 36 * dpr;
    ctx.beginPath();
    ctx.moveTo(16 * dpr, lineY);
    ctx.lineTo(canvas.width - 16 * dpr, lineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw "X" signature indicator mark
    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold ${14 * dpr}px sans-serif`;
    ctx.fillText('✕', 20 * dpr, lineY - 8 * dpr);

    ctx.font = `${10 * dpr}px sans-serif`;
    ctx.fillText('Sign on the line (وقّع هنا على الخط)', 38 * dpr, lineY - 8 * dpr);

    // Render all saved strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x * dpr, stroke.points[0].y * dpr);
      for (let i = 1; i < stroke.points.length; i++) {
        const p1 = stroke.points[i - 1];
        const p2 = stroke.points[i];
        // Midpoint quadratic curve for smoother lines
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x * dpr, p1.y * dpr, midX * dpr, midY * dpr);
      }
      ctx.stroke();
    });

    // Render currently active stroke
    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(currentStroke[0].x * dpr, currentStroke[0].y * dpr);
      for (let i = 1; i < currentStroke.length; i++) {
        const p1 = currentStroke[i - 1];
        const p2 = currentStroke[i];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x * dpr, p1.y * dpr, midX * dpr, midY * dpr);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [strokes, currentStroke, penColor, penWidth]);

  // Handle canvas sizing with devicePixelRatio for Retina/Mobile displays
  const setupCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(rect.width);
    const displayHeight = height;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    redrawCanvas();
  }, [height, redrawCanvas]);

  useEffect(() => {
    setupCanvasSize();
    window.addEventListener('resize', setupCanvasSize);
    return () => window.removeEventListener('resize', setupCanvasSize);
  }, [setupCanvasSize]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Export signature data URL when strokes change
  useEffect(() => {
    const isEmpty = strokes.length === 0;
    setHasSignature(!isEmpty);

    if (onSignatureChange) {
      if (isEmpty) {
        onSignatureChange(null, true);
      } else {
        const canvas = canvasRef.current;
        if (canvas) {
          onSignatureChange(canvas.toDataURL('image/png'), false);
        }
      }
    }
  }, [strokes, onSignatureChange]);

  // Helper to extract canvas relative coordinate
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | PointerEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as PointerEvent | React.PointerEvent).clientX;
      clientY = (e as PointerEvent | React.PointerEvent).clientY;
    } else {
      return null;
    }

    return {
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top))
    };
  };

  // Drawing event handlers with Pointer / Touch events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasCoordinates(e);
    if (!pt) return;
    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasCoordinates(e);
    if (!pt) return;

    // Prevent identical adjacent points
    setCurrentStroke(prev => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
        if (dist < 1.5) return prev;
      }
      return [...prev, pt];
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, { points: currentStroke, color: penColor, width: penWidth }]);
      setCurrentStroke([]);
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setHasSignature(false);
    if (onSignatureChange) {
      onSignatureChange(null, true);
    }
  };

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, prev.length - 1));
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Signature Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2">
        {/* Ink Colors */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <PenTool className="w-3 h-3 text-slate-400" />
            <span>Ink:</span>
          </span>
          {inkColors.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setPenColor(c.value)}
              title={c.label}
              className={`w-5 h-5 rounded-full ${c.bgClass} transition-transform ${
                penColor === c.value
                  ? 'ring-2 ring-emerald-500 ring-offset-1 scale-110 shadow-xs'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              }`}
            />
          ))}

          {/* Stroke Width Selector */}
          <div className="flex items-center ml-2 border-l border-slate-200 pl-2 gap-1">
            <button
              type="button"
              onClick={() => setPenWidth(1.8)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                penWidth === 1.8 ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Fine
            </button>
            <button
              type="button"
              onClick={() => setPenWidth(2.8)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                penWidth === 2.8 ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Med
            </button>
            <button
              type="button"
              onClick={() => setPenWidth(4.2)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                penWidth === 4.2 ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bold
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-700 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Touch Canvas Container */}
      <div
        ref={containerRef}
        className="relative bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden shadow-inner cursor-crosshair select-none touch-none"
        style={{ height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full block touch-none"
          style={{ touchAction: 'none' }}
        />

        {/* Helper Badge */}
        <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 pointer-events-none">
          {hasSignature ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs animate-in fade-in">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Signature Captured (تم التوقيع)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
              <PenTool className="w-3 h-3 text-slate-400" />
              <span>Touch / Stylus / Mouse Ready</span>
            </span>
          )}
        </div>

        {/* Signer watermark at bottom right */}
        {signerName && (
          <div className="absolute bottom-1.5 right-3 rtl:right-auto rtl:left-3 pointer-events-none text-[10px] font-semibold text-slate-400">
            {signerName} {signerIdNumber ? `(${signerIdNumber})` : ''} • {signerRole}
          </div>
        )}
      </div>

      {/* Legal & Compliance Notice */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span>
          Digital Signature conforms with the Saudi Electronic Transactions Law & Corporate Fleet Accountability Framework.
        </span>
      </div>
    </div>
  );
};
