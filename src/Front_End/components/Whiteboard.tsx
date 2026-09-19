import { useEffect, useRef, useCallback, useState } from 'react';
import { Eraser, Trash2, Pencil } from 'lucide-react';
import type { DrawSegment } from '@/hooks/useSignaling';

type Props = {
  subscribe: (fn: (msg: any) => void) => () => void;
  onDraw: (segment: DrawSegment) => void;
  onClear: () => void;
  color: string;
  setColor: (c: string) => void;
  brushWidth: number;
  setBrushWidth: (w: number) => void;
};

const CANVAS_W = 800;
const CANVAS_H = 500;
const BG_COLOR = '#0f172a';
const ERASER_SCALE = 4;

type Tool = 'draw' | 'erase';

export function Whiteboard({ subscribe, onDraw, onClear, color, setColor, brushWidth, setBrushWidth }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [tool, setTool] = useState<Tool>('draw');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  const drawSegment = useCallback((seg: DrawSegment) => {
    const ctx = ctxRef.current;
    if (!ctx || seg.points.length < 2) return;
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = seg.width;
    ctx.beginPath();
    ctx.moveTo(seg.points[0].x, seg.points[0].y);
    for (let i = 1; i < seg.points.length; i++) {
      ctx.lineTo(seg.points[i].x, seg.points[i].y);
    }
    ctx.stroke();
  }, []);

  // Subscribe to remote draw events
  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'draw' && msg.segment) {
        drawSegment(msg.segment);
      } else if (msg.type === 'clear-board') {
        const ctx = ctxRef.current;
        if (ctx) {
          ctx.fillStyle = BG_COLOR;
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }
      }
    });
    return unsub;
  }, [subscribe, drawSegment]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const activeColor = tool === 'erase' ? BG_COLOR : color;
  const activeWidth = tool === 'erase' ? brushWidth * ERASER_SCALE : brushWidth;

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    currentPointsRef.current = [getPos(e)];
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pos = getPos(e);
    const points = currentPointsRef.current;
    points.push(pos);

    const ctx = ctxRef.current;
    if (ctx && points.length >= 2) {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeWidth;
      ctx.beginPath();
      ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const points = currentPointsRef.current;
    if (points.length >= 2) {
      onDraw({ points, color: activeColor, width: activeWidth });
    }
    currentPointsRef.current = [];
  };

  const clearBoard = () => {
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    onClear();
  };

  const colors = ['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-700/50 bg-slate-800/40 flex-wrap">
        {/* Tool toggle */}
        <div className="flex gap-1 p-0.5 bg-slate-900/60 rounded-lg">
          <button
            onClick={() => setTool('draw')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              tool === 'draw'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            Draw
          </button>
          <button
            onClick={() => setTool('erase')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              tool === 'erase'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            Erase
          </button>
        </div>

        {/* Color picker — only relevant in draw mode */}
        <div
          className={`flex gap-1.5 transition-opacity ${
            tool === 'draw' ? 'opacity-100' : 'opacity-30 pointer-events-none'
          }`}
        >
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('draw'); }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                color === c && tool === 'draw'
                  ? 'border-white scale-110'
                  : 'border-slate-600 hover:border-slate-400'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-2 ml-1">
          <span className="text-xs text-slate-400">
            {tool === 'erase' ? 'Eraser' : 'Brush'}
          </span>
          <input
            type="range"
            min="1"
            max="12"
            value={brushWidth}
            onChange={(e) => setBrushWidth(Number(e.target.value))}
            className="w-20 accent-blue-500"
          />
        </div>

        <button
          onClick={clearBoard}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All
        </button>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center p-3 bg-slate-900/60">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          className={`max-w-full max-h-full rounded-lg border border-slate-700/50 touch-none ${
            tool === 'erase' ? 'cursor-cell' : 'cursor-crosshair'
          }`}
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        />
      </div>
    </div>
  );
}
