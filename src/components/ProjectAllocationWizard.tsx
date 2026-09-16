import React, { useState, useMemo } from 'react';
import type {
  TeamMember,
  Task,
  SkillCategory,
  PriorityLevel,
  ProjectIntakeRequest,
  ProjectResourceBlock,
  AppUserProfile
} from '../types';
import { generateProjectProposal, formatClickUpExport } from '../utils/projectAllocationEngine';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Send,
  Award,
  ChevronDown
} from 'lucide-react';

interface ProjectAllocationWizardProps {
  teamMembers: TeamMember[];
  tasks: Task[];
  currentProfile: AppUserProfile;
  onConfirmProjectAllocation: (projectTitle: string, clientName: string, items: { block: ProjectResourceBlock; memberId: string }[]) => void;
}

const ALL_SKILLS: SkillCategory[] = [
  'Technical SEO',
  'Content Writing',
  'On-Page Optimization',
  'Link Building',
  'Core Web Vitals',
  'Site Architecture',
  'UI/UX Design',
  'Client Strategy'
];

export const ProjectAllocationWizard: React.FC<ProjectAllocationWizardProps> = ({
  teamMembers,
  tasks,
  currentProfile,
  onConfirmProjectAllocation
}) => {
  const [projectName, setProjectName] = useState('TechHaven E-Commerce SEO Onboarding');
  const [clientName, setClientName] = useState('TechHaven Global');
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [requiresClientCommunication, setRequiresClientCommunication] = useState(true);

  const [blocks, setBlocks] = useState<ProjectResourceBlock[]>([
    {
      id: 'blk_1',
      title: 'Full Site Technical SEO & Indexation Audit',
      skill: 'Technical SEO',
      hours: 12,
      priority: 'High'
    },
    {
      id: 'blk_2',
      title: 'Category & Product Page Content Mapping',
      skill: 'Content Writing',
      hours: 10,
      priority: 'High'
    },
    {
      id: 'blk_3',
      title: 'Core Web Vitals LCP & INP Remediation',
      skill: 'Core Web Vitals',
      hours: 5,
      priority: 'Medium'
    }
  ]);

  // Overrides map: blockId -> memberId
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [openSwapForBlockId, setOpenSwapForBlockId] = useState<string | null>(null);
  const [copiedClickUp, setCopiedClickUp] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);

  const intakeRequest: ProjectIntakeRequest = useMemo(() => {
    return {
      id: `prj_${Date.now()}`,
      projectName,
      clientName,
      priority,
      requiresClientCommunication,
      blocks
    };
  }, [projectName, clientName, priority, requiresClientCommunication, blocks]);

  const rawProposal = useMemo(() => {
    return generateProjectProposal(intakeRequest, teamMembers, tasks);
  }, [intakeRequest, teamMembers, tasks]);

  // Apply any manual overrides made by You or Nidhi
  const finalProposalItems = useMemo(() => {
    return rawProposal.items.map((item) => {
      const overrideMemberId = manualOverrides[item.block.id];
      if (overrideMemberId && overrideMemberId !== item.assignedMember.id) {
        const alt = item.alternatives.find((a) => a.member.id === overrideMemberId);
        if (alt) {
          return {
            ...item,
            assignedMember: alt.member,
            fitScore: alt.fitScore,
            qualityScore: alt.qualityScore,
            availableHoursBefore: alt.availableHoursBefore,
            remainingHoursAfter: alt.remainingHoursAfter,
            isOverloadedAfter: alt.isOverloadedAfter,
            justification: `Manually selected by ${currentProfile.name} • ${alt.justification}`
          };
        }
      }
      return item;
    });
  }, [rawProposal, manualOverrides, currentProfile.name]);

  const totalPackageHours = blocks.reduce((s, b) => s + b.hours, 0);
  const clickUpExportText = useMemo(() => {
    return formatClickUpExport({
      ...rawProposal,
      items: finalProposalItems
    });
  }, [rawProposal, finalProposalItems]);

  const handleApplyPreset = (type: 'ECOMMERCE' | 'AUTHORITY' | 'CWV') => {
    setManualOverrides({});
    setConfirmedSuccess(false);
    if (type === 'ECOMMERCE') {
      setProjectName('TechHaven E-Commerce SEO Onboarding');
      setClientName('TechHaven Global');
      setPriority('High');
      setBlocks([
        { id: 'blk_1', title: 'Full Site Technical SEO & Indexation Audit', skill: 'Technical SEO', hours: 12, priority: 'High' },
        { id: 'blk_2', title: 'Category & Product Page Content Mapping', skill: 'Content Writing', hours: 10, priority: 'High' },
        { id: 'blk_3', title: 'Core Web Vitals LCP & INP Remediation', skill: 'Core Web Vitals', hours: 5, priority: 'Medium' }
      ]);
    } else if (type === 'AUTHORITY') {
      setProjectName('FinPulse Authority & Outreach Sprint');
      setClientName('FinPulse FinTech');
      setPriority('High');
      setBlocks([
        { id: 'blk_1', title: 'Enterprise Technical Site Architecture Review', skill: 'Site Architecture', hours: 8, priority: 'High' },
        { id: 'blk_2', title: 'High-DR Backlink Outreach Campaign', skill: 'Link Building', hours: 8, priority: 'High' },
        { id: 'blk_3', title: 'On-Page Internal Link & Silo Optimization', skill: 'On-Page Optimization', hours: 6, priority: 'Medium' }
      ]);
    } else {
      setProjectName('NovaRetail Core Web Vitals & Speed Fix');
      setClientName('NovaRetail Inc');
      setPriority('Medium');
      setBlocks([
        { id: 'blk_1', title: 'Site Architecture & Hierarchy Refactoring', skill: 'Site Architecture', hours: 9, priority: 'High' },
        { id: 'blk_2', title: 'JavaScript & CSS Render-Blocking Remediation', skill: 'Core Web Vitals', hours: 6, priority: 'High' }
      ]);
    }
  };

  const handleAddBlock = () => {
    const newBlock: ProjectResourceBlock = {
      id: `blk_${Date.now()}`,
      title: 'New Technical Deliverable',
      skill: 'Technical SEO',
      hours: 6,
      priority: 'Medium'
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const handleRemoveBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleBlockChange = (
    blockId: string,
    field: keyof ProjectResourceBlock,
    val: any
  ) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, [field]: val } : b))
    );
  };

  const handleCopyClickUp = () => {
    navigator.clipboard.writeText(clickUpExportText);
    setCopiedClickUp(true);
    setTimeout(() => setCopiedClickUp(false), 2500);
  };

  const handleConfirmAllocation = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 }
      });
    } catch {
      // ignore
    }

    const payload = finalProposalItems.map((item) => ({
      block: item.block,
      memberId: item.assignedMember.id
    }));

    onConfirmProjectAllocation(projectName, clientName, payload);
    setConfirmedSuccess(true);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner & Quick Preset Buttons */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>New Project Allocation Wizard &amp; Squad Decision Engine</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ClickUp Companion
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Eliminates manual schedule inspection. Enter your project package to get an instant multi-executive squad proposal based on real-time capacity and expertise.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Intake Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Presets:</span>
          <button
            onClick={() => handleApplyPreset('ECOMMERCE')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-400 transition-all cursor-pointer"
          >
            🛒 E-Commerce Package (27h)
          </button>
          <button
            onClick={() => handleApplyPreset('AUTHORITY')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-400 transition-all cursor-pointer"
          >
            📈 Authority Sprint (22h)
          </button>
          <button
            onClick={() => handleApplyPreset('CWV')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-purple-400 transition-all cursor-pointer"
          >
            ⚡ CWV Remediation (15h)
          </button>
        </div>
      </div>

      {/* Step 1: Project Intake Details & Resource Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Step 1: Project Scope &amp; Deliverables</span>
              <span className="text-xs text-emerald-400 font-normal">
                Total: {totalPackageHours} Hrs
              </span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Project Package Title</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div>
                  <span className="text-xs font-bold text-purple-300 block">
                    Direct Client Communication Required?
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Prioritizes executives tested &amp; verified as Tier 1 Client-Facing Leads
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={requiresClientCommunication}
                  onChange={(e) => setRequiresClientCommunication(e.target.checked)}
                  className="w-5 h-5 accent-purple-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Resource Deliverable Blocks ({blocks.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddBlock}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Block</span>
                </button>
              </div>

              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Deliverable #{idx + 1}
                    </span>
                    {blocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(block.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={block.title}
                    onChange={(e) => handleBlockChange(block.id, 'title', e.target.value)}
                    placeholder="Deliverable Title..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={block.skill}
                      onChange={(e) => handleBlockChange(block.id, 'skill', e.target.value as SkillCategory)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {ALL_SKILLS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <select
                      value={block.preferredSeniority || ''}
                      onChange={(e) => handleBlockChange(block.id, 'preferredSeniority', e.target.value ? e.target.value : undefined)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">Any Seniority Tier</option>
                      <option value="Team Lead">Preferred: Team Lead</option>
                      <option value="Senior Resource">Preferred: Senior Resource</option>
                      <option value="Executive">Preferred: Executive</option>
                      <option value="Intern">Preferred: Intern</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={block.hours}
                        onChange={(e) =>
                          handleBlockChange(block.id, 'hours', parseFloat(e.target.value) || 2)
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                      />
                      <span className="text-xs text-slate-400 font-medium">Hrs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Instant AI Squad Allocation Proposal */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Step 2: Recommended Executive Squad</span>
                  <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    AI Evaluated
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-factor decision matrix balancing executive expertise level against real-time free hours.
                </p>
              </div>

              {manualOverrides && Object.keys(manualOverrides).length > 0 && (
                <button
                  onClick={() => setManualOverrides({})}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to AI Best Fit</span>
                </button>
              )}
            </div>

            {/* List of Proposal Cards */}
            <div className="space-y-4">
              {finalProposalItems.map((item) => {
                const member = item.assignedMember;
                const isOverloaded = item.isOverloadedAfter;

                return (
                  <div
                    key={item.block.id}
                    className={`relative rounded-2xl p-5 border transition-all ${
                      isOverloaded
                        ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-500/5'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Deliverable & Assignee */}
                      <div className="flex items-start gap-4">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-400">
                              {item.block.skill} ({item.block.hours}h)
                            </span>
                            {isOverloaded && (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold uppercase">
                                Overload Risk
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-white mt-0.5">
                            {member.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {member.department}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              {member.seniority}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Fit Score & Swap Executive Button */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Decision Score
                          </span>
                          <span className="text-xl font-black text-emerald-400">
                            {item.fitScore}/10
                          </span>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenSwapForBlockId(
                                openSwapForBlockId === item.block.id ? null : item.block.id
                              )
                            }
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
                          >
                            <span>Swap Executive</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Swap Dropdown */}
                          {openSwapForBlockId === item.block.id && (
                            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-30 animate-fade-in">
                              <div className="px-3 py-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
                                Select Replacement Candidate
                              </div>
                              <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                                {item.alternatives.map((alt) => {
                                  const isSelected = alt.member.id === member.id;
                                  return (
                                    <button
                                      key={alt.member.id}
                                      type="button"
                                      onClick={() => {
                                        setManualOverrides((prev) => ({
                                          ...prev,
                                          [item.block.id]: alt.member.id
                                        }));
                                        setOpenSwapForBlockId(null);
                                      }}
                                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-emerald-500/15 border border-emerald-500/30'
                                          : 'hover:bg-slate-800/80'
                                      }`}
                                    >
                                      <div>
                                        <span className="text-xs font-bold text-white block">
                                          {alt.member.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          Free: {alt.availableHoursBefore}h • Rating: {alt.qualityScore}/10
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-emerald-400">
                                        {alt.fitScore}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bandwidth Before vs After Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <p className="text-slate-300 italic">{item.justification}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400">
                          Remaining Bandwidth After:
                        </span>
                        <span
                          className={`font-bold ${
                            isOverloaded ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {item.remainingHoursAfter}h free
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 3: Confirm Allocation & Copy for ClickUp */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Step 3: ClickUp Companion Export</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Formatted text ready to paste directly into your ClickUp project task list or chat.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyClickUp}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    {copiedClickUp ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied for ClickUp!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-emerald-400" />
                        <span>Copy for ClickUp</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleConfirmAllocation}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Lock Squad into Roster</span>
                  </button>
                </div>
              </div>

              {confirmedSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
                  <Award className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Allocation Approved!</strong> Squad deliverables have been locked into the agency capacity schedule. You can now paste the briefing directly into ClickUp!
                  </span>
                </div>
              )}

              {/* Collapsible ClickUp Code Preview */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-line leading-relaxed">
                {clickUpExportText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
