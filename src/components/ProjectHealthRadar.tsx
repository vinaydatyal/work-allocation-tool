import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  X
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

export type HealthTier = 'thriving' | 'attention' | 'at_risk' | 'critical';

export interface HealthRiskFactor {
  id: string;
  category: 'burn_rate' | 'payment' | 'access' | 'stagnant' | 'leadership';
  label: string;
  impact: number; // e.g. -25
  severity: 'critical' | 'warning' | 'info';
  recommendation: string;
}

export interface ProjectHealthAnalysis {
  score: number; // 0 - 100
  tier: HealthTier;
  badgeText: string;
  badgeShort: string;
  color: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  riskFactors: HealthRiskFactor[];
  positiveFactors: string[];
}

/**
 * Multi-factor algorithmic risk scoring engine
 */
export function computeProjectHealthScore(project: any): ProjectHealthAnalysis {
  let score = 100;
  const riskFactors: HealthRiskFactor[] = [];
  const positiveFactors: string[] = [];

  const totalHours = project.totalHours || 20;
  const activeHours = project.activeHours || 0;
  const hoursRatio = totalHours > 0 ? activeHours / totalHours : 0;

  const deliverables = project.taskBreakdown || [];
  const totalDeliv = deliverables.length;
  const completedDeliv = deliverables.filter(
    (d: any) =>
      d.status === 'Completed' ||
      ['done', 'complete', 'completed', 'closed', 'resolved', 'delivered'].includes(
        (d.clickUpStatus || '').toLowerCase().trim()
      )
  ).length;
  const delivRatio = totalDeliv > 0 ? completedDeliv / totalDeliv : 1;

  // 1. Burn Rate vs Deliverable Velocity Check
  if (hoursRatio >= 0.85 && delivRatio < 0.5) {
    score -= 28;
    riskFactors.push({
      id: 'burn-high-slow-deliv',
      category: 'burn_rate',
      label: `High hour consumption (${Math.round(hoursRatio * 100)}%) with only ${completedDeliv}/${totalDeliv} deliverables completed`,
      impact: -28,
      severity: 'critical',
      recommendation: 'Audit time logs, streamline deliverable scope, or request an hours top-up.'
    });
  } else if (hoursRatio >= 0.70 && delivRatio < 0.25) {
    score -= 15;
    riskFactors.push({
      id: 'burn-moderate-slow',
      category: 'burn_rate',
      label: `Hours burning faster than milestone velocity (${Math.round(hoursRatio * 100)}% used vs ${Math.round(delivRatio * 100)}% done)`,
      impact: -15,
      severity: 'warning',
      recommendation: 'Check if lead specialist is bottlenecked or waiting for client feedback.'
    });
  } else if (delivRatio >= 0.75) {
    positiveFactors.push(`Strong deliverable velocity (${completedDeliv}/${totalDeliv} tasks completed)`);
  } else {
    positiveFactors.push('Hour burn rate aligns with expected milestone pace');
  }

  // 2. Financial & Payment Health Check
  if (project.paymentStatus === 'Overdue') {
    score -= 25;
    riskFactors.push({
      id: 'payment-overdue',
      category: 'payment',
      label: `Retainer invoice is OVERDUE (Due date: ${project.paymentDueDate || 'Past Due'})`,
      impact: -25,
      severity: 'critical',
      recommendation: 'Notify account executive immediately to secure payment before next sprint dispatch.'
    });
  } else if (project.paymentStatus === 'Pending') {
    score -= 10;
    riskFactors.push({
      id: 'payment-pending',
      category: 'payment',
      label: `Payment status pending clearance (Due: ${project.paymentDueDate || 'Soon'})`,
      impact: -10,
      severity: 'info',
      recommendation: 'Send friendly reminder before milestone delivery.'
    });
  } else if (project.paymentStatus === 'Paid') {
    positiveFactors.push('Retainer contract fully settled & current');
  }

  // 3. Operational & Analytics Access Credentials Check
  const missingAccess: string[] = [];
  if (project.ga4Access === 'Missing' || project.ga4Access === 'Pending') missingAccess.push('GA4');
  if (project.gscAccess === 'Missing' || project.gscAccess === 'Pending') missingAccess.push('GSC');
  if (project.gbpAccess === 'Missing' || project.gbpAccess === 'Pending') missingAccess.push('GBP');

  if (missingAccess.length > 0) {
    const accessPenalty = Math.min(20, missingAccess.length * 8);
    score -= accessPenalty;
    riskFactors.push({
      id: 'access-missing',
      category: 'access',
      label: `Missing vital analytics credentials: ${missingAccess.join(', ')} access not verified`,
      impact: -accessPenalty,
      severity: missingAccess.length >= 2 ? 'critical' : 'warning',
      recommendation: 'Request client admin invitation to avoid blinded monthly reporting.'
    });
  } else {
    positiveFactors.push('Full analytics stack verified (GA4, GSC, GBP connected)');
  }

  // 4. ClickUp Blockers / Stalled Tasks Check
  const blockedTasks = deliverables.filter((d: any) =>
    ['blocked', 'stuck', 'waiting on client', 'hold', 'issue'].includes(
      (d.clickUpStatus || '').toLowerCase().trim()
    )
  );
  if (blockedTasks.length > 0) {
    score -= 15;
    riskFactors.push({
      id: 'clickup-blocked',
      category: 'stagnant',
      label: `${blockedTasks.length} deliverable task(s) flagged as Blocked/Waiting in ClickUp`,
      impact: -15,
      severity: 'warning',
      recommendation: 'Unblock dependencies or re-assign tasks to clear bottlenecks.'
    });
  }

  // 5. Leadership Assignment Check
  if (!project.projectLeadId) {
    score -= 10;
    riskFactors.push({
      id: 'unassigned-lead',
      category: 'leadership',
      label: 'Account lacks a designated Team Lead (Unassigned)',
      impact: -10,
      severity: 'warning',
      recommendation: 'Assign an experienced Team Lead to maintain client accountability.'
    });
  } else {
    positiveFactors.push('Designated project lead actively steering deliverables');
  }

  // Final Clamp
  score = Math.max(12, Math.min(100, score));

  // Determine Tier
  let tier: HealthTier = 'thriving';
  let badgeText = '🟢 Thriving Account';
  let badgeShort = '95% Thriving';
  let color = '#10b981';
  let borderClass = 'border-emerald-500/40';
  let bgClass = 'bg-emerald-500/15';
  let textClass = 'text-emerald-400';

  if (score < 45) {
    tier = 'critical';
    badgeText = '🚨 Critical Churn Risk';
    badgeShort = `${score}% Critical`;
    color = '#f43f5e';
    borderClass = 'border-rose-500/60';
    bgClass = 'bg-rose-500/20';
    textClass = 'text-rose-400';
  } else if (score < 65) {
    tier = 'at_risk';
    badgeText = '🟠 At Risk (Action Needed)';
    badgeShort = `${score}% At Risk`;
    color = '#f97316';
    borderClass = 'border-orange-500/50';
    bgClass = 'bg-orange-500/20';
    textClass = 'text-orange-400';
  } else if (score < 85) {
    tier = 'attention';
    badgeText = '🟡 Attention Required';
    badgeShort = `${score}% Attention`;
    color = '#eab308';
    borderClass = 'border-amber-500/50';
    bgClass = 'bg-amber-500/20';
    textClass = 'text-amber-400';
  } else {
    tier = 'thriving';
    badgeText = '🟢 Thriving Account';
    badgeShort = `${score}% Thriving`;
    color = '#10b981';
    borderClass = 'border-emerald-500/40';
    bgClass = 'bg-emerald-500/15';
    textClass = 'text-emerald-400';
  }

  return {
    score,
    tier,
    badgeText,
    badgeShort,
    color,
    borderClass,
    bgClass,
    textClass,
    riskFactors,
    positiveFactors
  };
}

/**
 * Compact Health Badge clickable on project cards
 */
export const ProjectHealthBadge: React.FC<{
  project: any;
  onClick?: () => void;
  size?: 'sm' | 'md';
}> = ({ project, onClick, size = 'sm' }) => {
  const analysis = computeProjectHealthScore(project);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={`Health Score: ${analysis.score}/100 — ${analysis.riskFactors.length} Risk Factors. Click for diagnosis.`}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-black transition-all cursor-pointer shadow-sm hover:scale-[1.03] active:scale-95 ${
        analysis.bgClass
      } ${analysis.borderClass} ${analysis.textClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          backgroundColor: analysis.color,
          boxShadow: `0 0 8px ${analysis.color}`
        }}
      />
      <span>{analysis.badgeShort}</span>
    </button>
  );
};

/**
 * Top-level Executive Radar Filter Capsule Bar
 */
export const ProjectHealthRadarFilterBar: React.FC<{
  projects: any[];
  currentFilter: 'all' | HealthTier;
  onSelectFilter: (filter: 'all' | HealthTier) => void;
}> = ({ projects, currentFilter, onSelectFilter }) => {
  const counts = projects.reduce(
    (acc, p) => {
      const { tier } = computeProjectHealthScore(p);
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    },
    { thriving: 0, attention: 0, at_risk: 0, critical: 0 } as Record<string, number>
  );

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onSelectFilter('all')}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
          currentFilter === 'all'
            ? 'bg-slate-800 text-white border-slate-600 shadow-md'
            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        Radar: All ({projects.length})
      </button>

      <button
        type="button"
        onClick={() => onSelectFilter('critical')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
          currentFilter === 'critical'
            ? 'bg-rose-950/80 text-rose-200 border-rose-500 shadow-md ring-1 ring-rose-500/50'
            : 'bg-rose-950/30 text-rose-400 border-rose-900/50 hover:bg-rose-950/60'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span>🚨 Critical ({counts.critical})</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFilter('at_risk')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
          currentFilter === 'at_risk'
            ? 'bg-orange-950/80 text-orange-200 border-orange-500 shadow-md'
            : 'bg-orange-950/30 text-orange-400 border-orange-900/50 hover:bg-orange-950/60'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-orange-500" />
        <span>🟠 At Risk ({counts.at_risk})</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFilter('attention')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
          currentFilter === 'attention'
            ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow-md'
            : 'bg-amber-950/30 text-amber-400 border-amber-900/50 hover:bg-amber-950/60'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>🟡 Attention ({counts.attention})</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFilter('thriving')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
          currentFilter === 'thriving'
            ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500 shadow-md'
            : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50 hover:bg-emerald-950/60'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>🟢 Thriving ({counts.thriving})</span>
      </button>
    </div>
  );
};

/**
 * Diagnostic Modal explaining all risk factors and offering 1-click Slack/Client alert
 */
export const ProjectHealthDiagnosticModal: React.FC<{
  isOpen: boolean;
  project: any;
  onClose: () => void;
}> = ({ isOpen, project, onClose }) => {
  const [copiedAlert, setCopiedAlert] = useState(false);

  if (!isOpen || !project) return null;

  const analysis = computeProjectHealthScore(project);

  const handleCopyAlertMessage = () => {
    const lines = [
      `🚨 [Agency Project Health Radar] Client Account Alert`,
      `Client: ${project.client} | Project: ${project.name}`,
      `Health Score: ${analysis.score}/100 (${analysis.badgeText})`,
      `Retainer: ${project.price} (${project.billingType})`,
      ``,
      `⚠️ Active Risk Factors:`,
      ...analysis.riskFactors.map(
        (rf, idx) => `  ${idx + 1}. ${rf.label}\n     Action: ${rf.recommendation}`
      ),
      ``,
      `✅ Positive Indicators:`,
      ...analysis.positiveFactors.map((pf) => `  • ${pf}`),
      ``,
      `Generated by Visual Agency Hub • Urgent lead follow-up advised.`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAlert(true);
    sonnerToast.success('Diagnostic alert message copied to clipboard!');
    setTimeout(() => setCopiedAlert(false), 2500);
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
      style={{ zIndex: 99999 }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        style={{ zIndex: 1 }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0c1427] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ zIndex: 10 }}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-black uppercase ${analysis.bgClass} ${analysis.borderClass} ${analysis.textClass}`}>
                {analysis.badgeText}
              </span>
              <span className="text-slate-400 text-xs font-bold">Health Index</span>
            </div>
            <h2 className="text-xl font-black text-white">{project.name}</h2>
            <p className="text-xs text-slate-400">
              Client: <strong className="text-slate-200">{project.client}</strong> • Tier:{' '}
              <strong className="text-cyan-400">{project.clientTier || 'Standard'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Health Radial Gauge */}
            <div
              className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center border shadow-inner"
              style={{
                backgroundColor: `${analysis.color}15`,
                borderColor: `${analysis.color}50`
              }}
            >
              <span className="text-lg font-black" style={{ color: analysis.color }}>
                {analysis.score}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">/ 100</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {/* Active Risk Factors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Detected Risk Drivers ({analysis.riskFactors.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Automatic multi-factor diagnosis</span>
            </div>

            {analysis.riskFactors.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero high-priority risks detected! This account is performing in the top tier.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {analysis.riskFactors.map((rf) => (
                  <div
                    key={rf.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/30 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-black shrink-0">
                          {rf.impact} pts
                        </span>
                        <h4 className="text-xs font-extrabold text-white leading-snug">{rf.label}</h4>
                      </div>
                    </div>
                    <div className="pl-8 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <strong className="text-amber-400 font-bold">Recommended Action:</strong>
                      <span>{rf.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Positive Health Factors */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Positive Health Indicators ({analysis.positiveFactors.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.positiveFactors.map((pf, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/40 border border-emerald-500/20 text-[11px] text-slate-300 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{pf}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Hours Burn</span>
              <span className="text-xs font-black text-cyan-400">
                {project.activeHours} / {project.totalHours}h ({Math.round(((project.activeHours || 0) / (project.totalHours || 1)) * 100)}%)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Deliverables</span>
              <span className="text-xs font-black text-purple-400">
                {project.milestonesCompleted} / {project.milestonesTotal} Done
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment</span>
              <span className={`text-xs font-black ${project.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {project.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer with 1-Click Copy Alert */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Copy diagnosis to dispatch instant team alerts via Slack or Email.
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyAlertMessage}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/50 text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              {copiedAlert ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAlert ? 'Copied Alert!' : '🚨 Copy Lead Diagnostic Alert'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
