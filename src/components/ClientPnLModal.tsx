import React from 'react';
import type { TeamMember } from '../types';
import {
  calculateProjectFinancials,
  getMemberCostPerHour,
  type ProjectFinancialAnalysis
} from '../utils/projectFinancials';
import {
  DollarSign,
  AlertTriangle,
  Users,
  X,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

interface ClientPnLModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  allMembers: TeamMember[];
  onOptimizeSquad?: (projectId: string, oldMemberId: string, newMemberId: string) => void;
}

export const ClientPnLModal: React.FC<ClientPnLModalProps> = ({
  isOpen,
  onClose,
  project,
  allMembers,
  onOptimizeSquad
}) => {
  if (!isOpen || !project) return null;

  const fin: ProjectFinancialAnalysis = calculateProjectFinancials(project, allMembers);

  // Find candidate junior/mid replacement for seniority mismatch if present
  const candidateReplacements = allMembers
    .filter((m) => getMemberCostPerHour(m) <= 36)
    .filter((m) => (project.members || []).every((pm: any) => (typeof pm === 'string' ? pm !== m.id : pm.id !== m.id)));

  const recommendedJunior = candidateReplacements.length > 0 ? candidateReplacements[0] : null;

  const handleApplyOptimization = () => {
    if (!recommendedJunior || !fin.seniorityMismatch.seniorMemberName) {
      sonnerToast.info('No replacement candidate available.');
      return;
    }

    const seniorMember = allMembers.find((m) => m.name === fin.seniorityMismatch.seniorMemberName);
    if (seniorMember && onOptimizeSquad) {
      onOptimizeSquad(project.id, seniorMember.id, recommendedJunior.id);
      sonnerToast.success(`⚡ Staffing Optimized! Swapped ${seniorMember.name} with ${recommendedJunior.name}`, {
        description: `Project margin boosted by +${fin.seniorityMismatch.potentialMarginGainPercent}%, saving $${fin.seniorityMismatch.marginLeakDollars}/mo.`
      });
      onClose();
    } else {
      sonnerToast.success('Staffing optimization calculated and copied to clipboard.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <DollarSign className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  Client Financial Anatomy & P&L
                </h2>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                  {project.clientTier || 'Standard'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {project.name || project.client} • Monthly Retainer Margin Breakdown
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Monthly Retainer</div>
            <div className="text-xl font-black text-white mt-1 font-mono">
              ${fin.monthlyRetainerRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Contracted Revenue</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Loaded Squad Cost</div>
            <div className="text-xl font-black text-rose-300 mt-1 font-mono">
              ${fin.totalMonthlySquadCost.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Specialist Hourly Payroll</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Gross Margin</div>
            <div className={`text-xl font-black mt-1 font-mono ${
              fin.marginTier === 'high' ? 'text-emerald-400' : fin.marginTier === 'standard' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {fin.grossMarginPercent}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              +${fin.grossProfitDollars.toLocaleString()} profit/mo
            </div>
          </div>
        </div>

        {/* Seniority Misalignment Warning (If detected) */}
        {fin.seniorityMismatch.hasMismatch && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Seniority Misalignment Detected (-${fin.seniorityMismatch.marginLeakDollars}/mo leak)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[10px] font-bold">
                +{fin.seniorityMismatch.potentialMarginGainPercent}% Margin Opportunity
              </span>
            </div>

            <p className="text-xs text-amber-200/90 leading-relaxed">
              {fin.seniorityMismatch.recommendation}
            </p>

            {recommendedJunior && (
              <div className="pt-2 flex items-center justify-between border-t border-amber-500/20">
                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Recommended Swap:</span>
                  <span className="font-bold text-white">{recommendedJunior.name}</span>
                  <span className="text-slate-400 text-[11px]">({recommendedJunior.seniority} • $28/h avg)</span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyOptimization}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-950" />
                  <span>Optimize Staffing</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Assigned Specialists Payroll Breakdown Table */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Assigned Squad Cost Distribution</span>
          </div>

          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Specialist</th>
                  <th className="py-2.5 px-3">Seniority</th>
                  <th className="py-2.5 px-3 text-right">Hours</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Cost/Mo</th>
                  <th className="py-2.5 px-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {fin.specialistBreakdown.map((item) => (
                  <tr key={item.member.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2 font-sans">
                      <img
                        src={item.member.avatar}
                        alt={item.member.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span>{item.member.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{item.member.seniority}</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{item.hours}h</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">${item.hourlyCost}/h</td>
                    <td className="py-2.5 px-3 text-right text-rose-300 font-bold">
                      ${item.totalMonthlyCost}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-400">{item.sharePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Agency Gross Margin: 60%+</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close P&L
          </button>
        </div>
      </div>
    </div>
  );
};
