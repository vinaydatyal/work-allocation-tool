import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, Undo2, ShieldAlert, Sparkles, TrendingUp, Plus, RefreshCw, Sun, Moon, ArrowUp, Keyboard } from 'lucide-react';
import type { ClientTier } from '../types';
import { CLIENT_TIER_CONFIG } from '../types';

/* ============================================================================
 * 1. SPOTLIGHT CARD (Linear / Vercel Mouse Tracking Glow)
 * ============================================================================ */
interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  onClick?: () => void;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(168, 85, 247, 0.15)',
  onClick
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -500, y: -500 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl transition-all duration-300 hover:border-slate-700/80 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(450px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/* ============================================================================
 * 2. ANIMATED COUNTER (Tabular Numbers & Spring Counter)
 * ============================================================================ */
interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 800; // ms
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(end);
      }
    };

    requestAnimationFrame(update);
  // Animate only when the target changes; the displayed value is the animation's internal state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={`font-mono tabular-nums tracking-tight ${className}`}>
      {prefix}
      {displayValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
};

/* ============================================================================
 * 3. MINI SPARKLINE (Interactive Trend Graph)
 * ============================================================================ */
interface MiniSparklineProps {
  data?: number[];
  color?: 'purple' | 'emerald' | 'cyan' | 'amber';
  height?: number;
  className?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data = [40, 52, 45, 61, 58, 68, 72, 85, 80, 94],
  color = 'purple',
  height = 36,
  className = ''
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const colorMap = {
    purple: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.2)' },
    emerald: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.2)' },
    cyan: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.2)' },
    amber: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.2)' }
  };

  const selectedColor = colorMap[color] || colorMap.purple;

  // Build SVG Points
  const width = 120;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={selectedColor.stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={selectedColor.stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.polygon
          points={areaPoints}
          fill={`url(#grad-${color})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.polyline
          fill="none"
          stroke={selectedColor.stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
};

/* ============================================================================
 * 4. SONNER-STYLE FLOATING TOAST SYSTEM
 * ============================================================================ */
export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'warning' | 'info';
  onUndo?: () => void;
}

interface ToastContextType {
  toast: (title: string, options?: { description?: string; type?: 'success' | 'warning' | 'info'; onUndo?: () => void }) => void;
}

export const ToastContext = React.createContext<ToastContextType>({
  toast: () => {}
});

export const useToast = () => React.useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (
    title: string,
    options?: { description?: string; type?: 'success' | 'warning' | 'info'; onUndo?: () => void }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = {
      id,
      title,
      description: options?.description,
      type: options?.type || 'success',
      onUndo: options?.onUndo
    };

    setToasts((prev) => [...prev.slice(-3), newToast]); // keep max 4 visible

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-2xl bg-slate-900/95 border border-slate-700/90 shadow-2xl backdrop-blur-2xl text-white relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-400 to-cyan-500" />
              
              <div className="flex items-start gap-3 pl-1.5 min-w-0 flex-1">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-extrabold text-white leading-tight">{t.title}</h4>
                  {t.description && (
                    <p className="text-[11px] text-slate-300 font-medium mt-1 leading-normal">{t.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {t.onUndo && (
                  <button
                    type="button"
                    onClick={() => {
                      t.onUndo?.();
                      removeToast(t.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-emerald-300 border border-slate-600 transition-all cursor-pointer shadow-sm"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

/* ============================================================================
 * 5. GRAPHIC SECTION HEADER (Clean Icon Badge & Visual Stat Chips without Text Walls)
 * ============================================================================ */
interface GraphicSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  badgeText?: string;
  badgeColor?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose' | 'indigo';
  rightElement?: React.ReactNode;
  className?: string;
}

export const GraphicSectionHeader: React.FC<GraphicSectionHeaderProps> = ({
  icon,
  title,
  badgeText,
  badgeColor = 'emerald',
  rightElement,
  className = ''
}) => {
  const colorStyles = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-cyan-500/10',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-purple-500/10',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-500/10',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-rose-500/10',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-indigo-500/10',
  }[badgeColor];

  const iconBoxStyles = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  }[badgeColor];

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent p-3 rounded-xl border border-slate-800/80 shadow-md ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className={`p-2 rounded-lg border flex items-center justify-center shrink-0 ${iconBoxStyles}`}>
          {icon}
        </span>
        <span className="text-sm sm:text-base font-black text-white tracking-tight">{title}</span>
        {badgeText && (
          <span className={`px-2.5 py-0.5 rounded-md border text-xs font-extrabold shadow-sm ${colorStyles}`}>
            {badgeText}
          </span>
        )}
      </div>
      {rightElement && (
        <div className="flex items-center gap-2">
          {rightElement}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 6. VISUAL INFO CHUNK (Bite-Sized Graphical Data Tile with Optional Progress Bar)
 * ============================================================================ */
interface VisualInfoChunkProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  color?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose' | 'indigo' | 'slate';
  progress?: number; // 0 to 100
}

export const VisualInfoChunk: React.FC<VisualInfoChunkProps> = ({
  label,
  value,
  subValue,
  icon,
  color = 'slate',
  progress
}) => {
  const barColors = {
    emerald: 'bg-emerald-400',
    cyan: 'bg-cyan-400',
    purple: 'bg-purple-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    indigo: 'bg-indigo-400',
    slate: 'bg-slate-400'
  }[color];

  return (
    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between gap-1 shadow-sm">
      <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <span className="truncate">{label}</span>
        {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
      </div>
      <div className="flex items-baseline justify-between gap-1 mt-0.5">
        <span className="text-sm sm:text-base font-black text-white tracking-tight truncate">{value}</span>
        {subValue && <span className="text-[11px] font-extrabold text-slate-400 shrink-0">{subValue}</span>}
      </div>
      {typeof progress === 'number' && (
        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 rounded-full ${barColors}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 7. MINI RADIAL PROGRESS (SVG Circular Progress with Glow)
 * ============================================================================ */
interface MiniRadialProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple';
  className?: string;
}

export const MiniRadialProgress: React.FC<MiniRadialProgressProps> = ({
  progress,
  size = 44,
  strokeWidth = 4,
  color = 'emerald',
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colorMap = {
    emerald: '#34d399',
    cyan: '#22d3ee',
    amber: '#fbbf24',
    rose: '#fb7185',
    purple: '#c084fc'
  };

  const selectedColor = colorMap[color] || colorMap.emerald;

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Background Circle */}
      <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={selectedColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${selectedColor}80)` }}
        />
      </svg>
      {/* Inner Text overlay for percentage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-black text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{ message: string; submessage?: string; icon?: React.ReactNode }> = ({ message, submessage, icon }) => (
  <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2 border-slate-700/50 hover:border-cyan-500/30 transition-all group">
    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-cyan-400/50 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 mb-2 shadow-inner border border-slate-700 transition-all duration-300">
      {icon || (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
        </svg>
      )}
    </div>
    <div>
      <h3 className="text-sm font-black text-slate-200">{message}</h3>
      {submessage && <p className="text-xs text-slate-400 mt-1 font-medium">{submessage}</p>}
    </div>
  </div>
);

/* ============================================================================
 * PHASE 4 UI COMPONENTS
 * ============================================================================ */

/* --- Ripple Button --- */
interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const RippleButton: React.FC<RippleButtonProps> = ({ children, className = '', onClick, ...props }) => {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { x, y, id: Date.now() };
      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }
    if (onClick) onClick(e);
  };

  return (
    <button ref={buttonRef} onClick={handleClick} className={`ripple-btn ${className}`} {...props}>
      {ripples.map((r) => (
        <span key={r.id} className="ripple-wave" style={{ left: r.x, top: r.y }} />
      ))}
      {children}
    </button>
  );
};

/* --- Stagger List --- */
interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  delayOffset?: number; // ms
}

export const StaggerList: React.FC<StaggerListProps> = ({ children, className = '', delayOffset = 50 }) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        const childProps = (child.props || {}) as { className?: string; style?: React.CSSProperties };
        return React.cloneElement(child, {
          className: `${childProps.className || ''} stagger-item`,
          style: { ...(childProps.style as object), '--stagger-delay': `${index * delayOffset}ms` }
        } as React.HTMLAttributes<HTMLElement>);
      })}
    </div>
  );
};

/* --- Ambient Glow --- */
export const AmbientGlow: React.FC<{ color?: string; className?: string }> = ({ color = 'rgba(16, 185, 129, 0.5)', className = '' }) => {
  return (
    <div className={`ambient-glow ${className}`} style={{ backgroundColor: color }} />
  );
};

/* --- Animated Progress Bar --- */
interface AnimatedProgressBarProps {
  value: number;
  max?: number;
  colorClass?: string;
  className?: string;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({ value, max = 100, colorClass = 'bg-cyan-500', className = '' }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={`w-full bg-slate-800 rounded-full h-1.5 overflow-hidden ${className}`}>
      <div 
        className={`h-full ${colorClass} animated-bar rounded-full`}
        style={{ '--target-width': `${percentage}%` } as React.CSSProperties}
      />
    </div>
  );
};

/* --- Donut Chart --- */
interface DonutChartProps {
  value: number;
  max?: number;
  color?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple';
  size?: number;
  label?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({ value, max = 100, color = 'emerald', size = 80, label }) => {
  const [currentValue, setCurrentValue] = useState(0);
  
  useEffect(() => {
    let start = currentValue;
    const end = value;
    if (start === end) return;

    const duration = 800; // ms
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCurrentValue(start + (end - start) * easeProgress);

      if (progress < 1) requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  // Animate only when the target changes; the current value is the animation's internal state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const percentage = Math.min(100, Math.max(0, (currentValue / max) * 100));
  const strokeWidth = size * 0.12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    emerald: 'text-emerald-500',
    cyan: 'text-cyan-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    purple: 'text-purple-500'
  };

  return (
    <div className="relative inline-flex items-center justify-center flex-col" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-slate-800" />
        <circle 
          cx={size/2} cy={size/2} r={radius} 
          stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
          className={`${colorMap[color]} transition-all duration-300 ease-in-out`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xs font-black text-white">{Math.round(currentValue)}</span>
        {label && <span className="text-[9px] font-bold text-slate-400 -mt-1">{label}</span>}
      </div>
    </div>
  );
};

/* --- Heatmap Calendar --- */
export const HeatmapCalendar: React.FC<{ data?: { date: string; value: number }[]; className?: string }> = ({ data = [], className = '' }) => {
  // Mocking 12 weeks of data (7 days * 12 weeks = 84 days)
  const days = Array.from({ length: 84 }).map((_, i) => {
    // just random mockup logic for aesthetic if no data passed
    const intensity = data.length ? (data[i]?.value || 0) : Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0;
    return intensity;
  });

  const getColor = (val: number) => {
    if (val === 0) return 'bg-slate-800/50';
    if (val === 1) return 'bg-emerald-900/50';
    if (val === 2) return 'bg-emerald-700/60';
    if (val === 3) return 'bg-emerald-500/80';
    return 'bg-emerald-400';
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex gap-1 text-[9px] font-medium text-slate-500 mb-1">
        <span className="w-6">Mon</span>
        <span className="w-6">Wed</span>
        <span className="w-6">Fri</span>
      </div>
      <div className="grid grid-cols-[repeat(12,minmax(0,1fr))] grid-rows-7 gap-1 w-full max-w-[200px] grid-flow-col">
        {days.map((val, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${getColor(val)} transition-colors hover:ring-1 hover:ring-white/30`} />
        ))}
      </div>
    </div>
  );
};

/* --- Glass Tooltip --- */
export const GlassTooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 5 }} 
            transition={{ duration: 0.15 }}
            className="glass-tooltip"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* --- Status Dot --- */
export const StatusDot: React.FC<{ status: 'active' | 'warning' | 'error' | 'neutral'; label: string; className?: string }> = ({ status, label, className = '' }) => {
  const colorMap = {
    active: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    warning: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    error: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]',
    neutral: 'bg-slate-400'
  };
  
  const textMap = {
    active: 'text-emerald-300',
    warning: 'text-amber-300',
    error: 'text-rose-300',
    neutral: 'text-slate-300'
  };

  return (
    <span className={`status-dot ${textMap[status]} ${className}`}>
      <span className={`status-dot-indicator ${colorMap[status]} animate-pulse`} />
      {label}
    </span>
  );
};

/* ============================================================================
 * 8. CLIENT TIER BADGE (VIP / Agency / Local Luxury Pill)
 * ============================================================================ */
interface ClientTierBadgeProps {
  tier?: ClientTier;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const ClientTierBadge: React.FC<ClientTierBadgeProps> = ({
  tier = 'TIER_B_LOCAL',
  showIcon = true,
  size = 'md',
  className = '',
  onClick
}) => {
  const config = CLIENT_TIER_CONFIG[tier] || CLIENT_TIER_CONFIG.TIER_B_LOCAL;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2'
  }[size];

  return (
    <span
      onClick={onClick}
      title={`${config.label} • SLA: ${config.targetSla}`}
      className={`inline-flex items-center font-black rounded-lg border backdrop-blur-md transition-all duration-300 ${config.badgeClass} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
    >
      {showIcon && <span className="shrink-0 leading-none">{config.icon}</span>}
      <span className="truncate tracking-wide">{config.shortLabel}</span>
    </span>
  );
};

/* ============================================================================
 * 9. YIELD GAUGE (Effective Hourly Rate $/hr)
 * ============================================================================ */
interface YieldGaugeProps {
  amount: number;
  hours: number;
  className?: string;
  showLabel?: boolean;
}

export const YieldGauge: React.FC<YieldGaugeProps> = ({
  amount,
  hours,
  className = '',
  showLabel = true
}) => {
  const safeHours = Math.max(1, hours);
  const yieldRate = Math.round(amount / safeHours);

  // Determine Yield Tier
  let yieldColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';
  let yieldTag = 'Elite Margin';

  if (yieldRate >= 120) {
    yieldColor = 'text-purple-300 border-purple-500/40 bg-purple-950/50 shadow-[0_0_10px_rgba(168,85,247,0.25)]';
    yieldTag = '💎 VIP Yield';
  } else if (yieldRate >= 70) {
    yieldColor = 'text-cyan-300 border-cyan-500/30 bg-cyan-950/40';
    yieldTag = 'Strong Rate';
  } else if (yieldRate >= 35) {
    yieldColor = 'text-amber-300 border-amber-500/30 bg-amber-950/40';
    yieldTag = 'Standard Margin';
  } else {
    yieldColor = 'text-rose-300 border-rose-500/40 bg-rose-950/50 animate-pulse';
    yieldTag = '⚠️ Over-serviced';
  }

  return (
    <div
      title={`Yield: $${yieldRate}/hr based on $${amount.toLocaleString()} for ${hours}h logged`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold ${yieldColor} ${className}`}
    >
      <TrendingUp className="w-3 h-3 shrink-0" />
      <span className="font-extrabold text-white">${yieldRate}<span className="text-[10px] text-slate-400 font-normal">/hr</span></span>
      {showLabel && <span className="text-[9px] uppercase tracking-wider opacity-80 pl-1 border-l border-white/10 hidden sm:inline">{yieldTag}</span>}
    </div>
  );
};

/* ============================================================================
 * 10. VIP PRIORITY BANNER (Top Alert for High-Ticket Bottlenecks)
 * ============================================================================ */
interface VIPPriorityBannerProps {
  vipCount: number;
  atRiskCount: number;
  vipMonthlyRevenue: number;
  onFilterVIP?: () => void;
}

export const VIPPriorityBanner: React.FC<VIPPriorityBannerProps> = ({
  vipCount,
  atRiskCount,
  vipMonthlyRevenue,
  onFilterVIP
}) => {
  if (vipCount === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-cyan-950/80 p-4 shadow-[0_0_25px_rgba(168,85,247,0.2)] backdrop-blur-xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center gap-3.5 z-10">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)] shrink-0">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-purple-300">VIP Talent Guard Active</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-[10px] font-bold border border-purple-400/30">
              ${vipMonthlyRevenue.toLocaleString()}/mo Portfolio
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            <strong className="text-white font-bold">{vipCount} High-Ticket Accounts</strong> prioritized for Tier-1 Senior staffing.
            {atRiskCount > 0 ? (
              <span className="text-rose-300 font-bold ml-1.5 inline-flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 inline" /> {atRiskCount} VIP account(s) nearing capacity or overdue.
              </span>
            ) : (
              <span className="text-emerald-300 font-medium ml-1.5">All VIP delivery schedules on track.</span>
            )}
          </p>
        </div>
      </div>

      {onFilterVIP && (
        <button
          onClick={onFilterVIP}
          className="z-10 shrink-0 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-1.5"
        >
          <span>Focus VIP Retainers</span>
          <span className="px-1.5 py-0.2 bg-purple-950/60 rounded text-[10px] font-extrabold">{vipCount}</span>
        </button>
      )}
    </div>
  );
};

/* ============================================================================
 * 11. QUICK FLOATING ACTION BUTTON (QuickFAB)
 * ============================================================================ */
interface QuickFABProps {
  onAddProject?: () => void;
  onSyncClickUp?: () => void;
  onToggleTheme?: () => void;
  isWhiteTheme?: boolean;
  onOpenShortcuts?: () => void;
}

export const QuickFAB: React.FC<QuickFABProps> = ({
  onAddProject,
  onSyncClickUp,
  onToggleTheme,
  isWhiteTheme,
  onOpenShortcuts
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5 select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-end gap-2 mb-1"
          >
            {/* Scroll To Top */}
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105"
            >
              <span>Scroll to Top</span>
              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400">
                <ArrowUp className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Keyboard Shortcuts Guide */}
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={() => { onOpenShortcuts(); setIsOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-indigo-500/40 text-indigo-200 text-xs font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105"
              >
                <span>Keyboard Shortcuts</span>
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <Keyboard className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {/* Toggle White/Dark Theme */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={() => { onToggleTheme(); setIsOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-amber-500/40 text-amber-200 text-xs font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105"
              >
                <span>{isWhiteTheme ? 'Switch to Dark Mode' : 'Switch to White Theme'}</span>
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  {isWhiteTheme ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </div>
              </button>
            )}

            {/* ClickUp Live Sync */}
            {onSyncClickUp && (
              <button
                type="button"
                onClick={() => { onSyncClickUp(); setIsOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-purple-950/95 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105"
              >
                <span>ClickUp API Sync</span>
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {/* Add Active Project */}
            {onAddProject && (
              <button
                type="button"
                onClick={() => { onAddProject(); setIsOpen(false); }}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-black shadow-xl shadow-cyan-500/20 transition-all hover:scale-105"
              >
                <span>+ Add Active Project</span>
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        title="Quick Actions (Click to expand)"
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-300 border backdrop-blur-xl ${
          isOpen
            ? 'bg-rose-600 border-rose-400 text-white rotate-45'
            : 'bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 border-cyan-400/40 text-white'
        }`}
      >
        <Plus className="w-6 h-6 transition-transform duration-300" />
      </motion.button>
    </div>
  );
};

/* ============================================================================
 * 12. KEYBOARD SHORTCUTS MODAL
 * ============================================================================ */
interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      group: 'Global & Power Actions',
      items: [
        { key: 'Ctrl + K', label: 'Universal Command Palette', desc: 'Search projects, team members, actions & quick jump' },
        { key: '?', label: 'Shortcuts Guide & Cheatsheet', desc: 'Open this interactive keyboard shortcuts reference' },
        { key: 'N', label: 'Create New Project', desc: 'Open new project creation wizard from anywhere' },
        { key: 'D', label: 'Toggle Dark / Light Theme', desc: 'Switch between dark workspace and crisp white theme' },
        { key: 'Esc', label: 'Close Active Modal / Overlay', desc: 'Dismiss any open dialog, modal, or drawer' }
      ]
    },
    {
      group: 'Instant Tab Navigation (1–9)',
      items: [
        { key: '1', label: 'Active Projects Dashboard', desc: 'All client retainers, health status & squads' },
        { key: '2', label: 'Activity & Sprint Calendar', desc: 'Sprint timeline, deliverables & milestones' },
        { key: '3', label: 'Employee Workload & Capacity', desc: 'Weekly allocations, utilization % & capacity caps' },
        { key: '4', label: 'DSR Daily Status Reports', desc: 'Daily logs, blockers, plans & hours' },
        { key: '5', label: 'Employee Skills Matrix', desc: 'Competency radar, test scores & skill calibration' },
        { key: '6', label: 'Job Delivery Bot', desc: 'Automated ClickUp task & client delivery pack' },
        { key: '7', label: 'Finances & Retainer Billing', desc: 'Invoices, margins, yields & payment status' },
        { key: '8', label: 'Notifications Hub', desc: 'ClickUp logs, budget alerts & delivery pings' },
        { key: '9', label: 'Project Brief Analyzer', desc: 'Claude AI brief parsing & work slice estimator' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#111827] border border-indigo-500/40 p-6 sm:p-7 shadow-2xl shadow-indigo-500/20 text-white space-y-5">
        {/* Glowing Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-t-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">Executive Keyboard Shortcuts Guide</h3>
              <p className="text-xs text-slate-400">High-speed keyboard navigation and instant productivity commands</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                {group.group}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {group.items.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <span className="text-xs font-bold text-white block">{s.label}</span>
                      <span className="text-[11px] text-slate-400 truncate block">{s.desc}</span>
                    </div>
                    <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs font-black shadow-inner shrink-0">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800 flex items-center justify-between">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">Ctrl+K</kbd> anytime for Command Palette.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
