import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type {
  TeamMember,
  Task,
  ProjectBriefInput,
  BriefSquadProposal,
  AppUserProfile
} from '../types';
import { analyzeProjectBriefAndMatchSquad } from '../utils/briefAnalyzerEngine';
import {
  getAIConfig,
  saveAIConfig,
  interpretBriefWithFreeAI,
  type AIInterpreterConfig
} from '../utils/aiInterpreterEngine';
import {
  CheckCircle2,
  UserCheck,
  Cpu,
  X,
  Loader2,
  Sparkles,
  Clock,
  Search,
  Code2,
  Layout,
  Share2,
  ShieldAlert,
  FileText,
  BarChart3,
  Layers,
  ArrowRight,
  Sliders,
  Activity
} from 'lucide-react';

interface ProjectBriefAnalyzerProps {
  teamMembers: TeamMember[];
  tasks: Task[];
  currentProfile?: AppUserProfile;
  onConfirmAllocation: (
    projectName: string,
    clientName: string,
    assignments: { memberId: string; title: string; skill: any; hours: number }[]
  ) => void;
}

// Visual skill icon map
const getSkillVisualIcon = (skill: string) => {
  if (skill.includes('SEO') || skill.includes('Migration')) return <Search className="w-4 h-4 text-cyan-400" />;
  if (skill.includes('Dev') || skill.includes('WordPress')) return <Code2 className="w-4 h-4 text-purple-400" />;
  if (skill.includes('UI/UX') || skill.includes('Redesign')) return <Layout className="w-4 h-4 text-pink-400" />;
  if (skill.includes('AEO') || skill.includes('GEO')) return <Sparkles className="w-4 h-4 text-amber-400" />;
  if (skill.includes('ORM')) return <ShieldAlert className="w-4 h-4 text-rose-400" />;
  if (skill.includes('Link') || skill.includes('Guest')) return <Share2 className="w-4 h-4 text-emerald-400" />;
  return <FileText className="w-4 h-4 text-blue-400" />;
};

const getSkillVisualColor = (skill: string) => {
  if (skill.includes('SEO') || skill.includes('Migration')) return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300';
  if (skill.includes('Dev') || skill.includes('WordPress')) return 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300';
  if (skill.includes('UI/UX') || skill.includes('Redesign')) return 'from-pink-500/20 to-rose-500/20 border-pink-500/40 text-pink-300';
  if (skill.includes('AEO') || skill.includes('GEO')) return 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300';
  return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300';
};

export const ProjectBriefAnalyzer: React.FC<ProjectBriefAnalyzerProps> = ({
  teamMembers,
  tasks,
  onConfirmAllocation
}) => {
  const [clientName, setClientName] = useState('TechHaven Enterprise');
  const [projectName, setProjectName] = useState('AI Search & Migration Sprint');
  const [totalFixedHours, setTotalFixedHours] = useState<number>(25);
  const [requiresClientCommunication, setRequiresClientCommunication] = useState<boolean>(true);
  const [briefDescription, setBriefDescription] = useState<string>(
    'Enterprise site migration audit, AEO & GEO content optimization for AI search engines, plus WordPress speed development.'
  );

  const [aiConfig, setAiConfig] = useState<AIInterpreterConfig>(getAIConfig());
  const [showAiModal, setShowAiModal] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);

  const [memberOverrides, setMemberOverrides] = useState<Record<string, string>>({});
  const [isAllocatedSuccess, setIsAllocatedSuccess] = useState(false);
  const [customProposal, setCustomProposal] = useState<BriefSquadProposal | null>(null);

  const briefInput: ProjectBriefInput = useMemo(
    () => ({
      clientName,
      projectName,
      totalFixedHours,
      requiresClientCommunication,
      briefDescription
    }),
    [clientName, projectName, totalFixedHours, requiresClientCommunication, briefDescription]
  );

  const defaultProposal: BriefSquadProposal = useMemo(() => {
    return analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
  }, [briefInput, teamMembers, tasks]);

  const proposal = customProposal || defaultProposal;

  useEffect(() => {
    setCustomProposal(null);
  }, [clientName, projectName, totalFixedHours, requiresClientCommunication, briefDescription]);

  const handleRunAIInterpretation = async () => {
    setIsInterpreting(true);
    try {
      const result = await interpretBriefWithFreeAI(
        briefInput,
        teamMembers,
        tasks,
        aiConfig
      );
      setCustomProposal(result);
    } catch (err) {
      console.error('Interpretation error:', err);
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleApplyPreset = (
    cName: string,
    pName: string,
    hrs: number,
    clientFacing: boolean,
    desc: string
  ) => {
    setClientName(cName);
    setProjectName(pName);
    setTotalFixedHours(hrs);
    setRequiresClientCommunication(clientFacing);
    setBriefDescription(desc);
    setMemberOverrides({});
    setIsAllocatedSuccess(false);
  };

  const handleConfirm = () => {
    const finalAssignments = proposal.assignments.map((item) => {
      const overrideId = memberOverrides[item.slice.id];
      const selectedMember =
        teamMembers.find((m) => m.id === overrideId) || item.assignedMember;

      return {
        memberId: selectedMember.id,
        title: item.slice.title,
        skill: item.slice.skill,
        hours: item.slice.recommendedHours
      };
    });

    onConfirmAllocation(projectName, clientName, finalAssignments);
    setIsAllocatedSuccess(true);
    setTimeout(() => setIsAllocatedSuccess(false), 4000);
  };

  const utilizationPercent = Math.min(
    100,
    Math.round((proposal.totalAllocatedHours / totalFixedHours) * 100) || 100
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in select-none">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-tight">
                Studio Allocation Canvas
              </h1>
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-all cursor-pointer"
                title="AI Engine Settings"
              >
                <Cpu className="w-3 h-3 text-purple-400" />
                <span>AI: {aiConfig.mode === 'gemini_free' ? 'Gemini 1.5' : aiConfig.mode === 'chrome_builtin' ? 'Chrome AI' : 'Smart NLP'}</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-400">
              Visual SOW deconstruction &amp; specialist node matching
            </span>
          </div>
        </div>

        {/* Visual Quick Canvas Presets */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Presets:</span>
          <button
            type="button"
            onClick={() =>
              handleApplyPreset(
                'Apex Financial Systems',
                'Technical Site Migration Retainer',
                25,
                true,
                'Full technical architecture audit and site migration setup. Requires senior SEO technical lead oversight plus WordPress custom dev fixes.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Migration (25h)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleApplyPreset(
                'Nova Retail Global',
                'AEO + GEO Search Package',
                30,
                true,
                'Modern AEO Answer Engine Optimization and GEO content strategy for AI search. Plus high-DR guest posting and ORM reputation defense.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AEO + GEO (30h)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleApplyPreset(
                'TechHaven E-Commerce',
                'UI/UX Redesign Sprint',
                20,
                false,
                'Landing page conversion redesign in Figma plus Core Web Vitals remediation.'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 transition-all cursor-pointer"
          >
            <Layout className="w-3.5 h-3.5 text-pink-400" />
            <span>Redesign (20h)</span>
          </button>
        </div>
      </div>

      {/* Visual Studio Dashboard KPIs (Canva/Figma Metrics Bar) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Total SOW Hours */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Weekly SOW Target</span>
            <span className="text-xl font-black text-white mt-0.5 block">{totalFixedHours} hrs</span>
            <span className="text-[10px] font-bold text-emerald-400 block">{utilizationPercent}% Allocated</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* KPI 2: Matched Nodes */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Task Slice Nodes</span>
            <span className="text-xl font-black text-white mt-0.5 block">{proposal.assignments.length} Slices</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {/* KPI 3: Client Readiness */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Client-Ready Tier</span>
            <span className="text-xl font-black text-purple-300 mt-0.5 block">
              {requiresClientCommunication ? 'Tier 1 Verified' : 'All Tiers'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-purple-400" />
          </div>
        </div>

        {/* KPI 4: Allocation Health */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Roster Match Health</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">100% Fit</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main Canva/Figma Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Brief Input Node */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Canvas Inputs</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">Client &amp; Project</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white mb-2 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Target Hours/Wk</label>
                <div className="relative">
                  <input
                    type="number"
                    min="4"
                    max="80"
                    value={totalFixedHours}
                    onChange={(e) => setTotalFixedHours(parseInt(e.target.value, 10) || 20)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-emerald-400 focus:outline-none"
                  />
                  <Clock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              {/* Visual Pill Switch */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Client Calls</label>
                <button
                  type="button"
                  onClick={() => setRequiresClientCommunication(!requiresClientCommunication)}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-between cursor-pointer ${
                    requiresClientCommunication
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>{requiresClientCommunication ? 'Required' : 'Internal'}</span>
                  <div className={`w-2 h-2 rounded-full ${requiresClientCommunication ? 'bg-purple-400' : 'bg-slate-600'}`} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">Requirements Brief</label>
              <textarea
                rows={4}
                value={briefDescription}
                onChange={(e) => setBriefDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none leading-relaxed resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleRunAIInterpretation}
              disabled={isInterpreting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              {isInterpreting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>AI Deconstructing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Deconstruct Brief</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Visual Figma/Canva Allocation Canvas Nodes */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          {/* Canvas Toolbar & Graph Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Visual Allocation Flow
              </span>
            </div>

            {/* Visual Hours Distribution Bar */}
            <div className="flex items-center gap-3">
              <div className="w-36 bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 flex">
                {proposal.assignments.map((item, idx) => {
                  const slicePct = Math.round((item.slice.recommendedHours / totalFixedHours) * 100);
                  const colors = ['bg-cyan-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-emerald-500'];
                  return (
                    <div
                      key={item.slice.id}
                      className={`h-full ${colors[idx % colors.length]}`}
                      style={{ width: `${slicePct}%` }}
                      title={`${item.slice.title}: ${item.slice.recommendedHours}h`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-black text-white">{proposal.totalAllocatedHours}h Total</span>
            </div>
          </div>

          {/* Connected Visual Task -> Specialist Flow Nodes */}
          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {proposal.assignments.map((item) => {
              const effectiveMemberId =
                memberOverrides[item.slice.id] || item.assignedMember.id;
              const effectiveMember =
                teamMembers.find((m) => m.id === effectiveMemberId) ||
                item.assignedMember;

              const hoursPct = Math.min(100, Math.round((item.slice.recommendedHours / totalFixedHours) * 100));
              const memberFreePct = Math.min(100, Math.round((effectiveMember.weeklyCapacityHours / 40) * 100));

              return (
                <div
                  key={item.slice.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden"
                >
                  {/* Left Layer: Visual Skill Node & Hours Graph */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 border ${getSkillVisualColor(item.slice.skill)}`}>
                      {getSkillVisualIcon(item.slice.skill)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {item.slice.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-slate-300 border border-slate-800">
                          {item.slice.skill}
                        </span>
                      </div>

                      {/* Visual Micro Graph Bar for Slice Share */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${hoursPct}%` }} />
                        </div>
                        <span className="text-[11px] font-black text-cyan-400">
                          {item.slice.recommendedHours}h ({hoursPct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Node Flow Connector Indicator */}
                  <div className="hidden sm:flex items-center text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  {/* Right Layer: Matched Specialist Visual Node */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <img
                        src={effectiveMember.avatar}
                        alt={effectiveMember.name}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-emerald-500/40"
                      />
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{effectiveMember.name}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Available" />
                        </div>
                        {/* Personal Free Bandwidth Meter */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-14 bg-slate-950 rounded-full h-1 overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${memberFreePct}%` }} />
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold">{effectiveMember.weeklyCapacityHours}h Free</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Swap Select */}
                    <select
                      value={effectiveMember.id}
                      onChange={(e) =>
                        setMemberOverrides((prev) => ({
                          ...prev,
                          [item.slice.id]: e.target.value
                        }))
                      }
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-bold focus:outline-none cursor-pointer"
                      title="Swap Specialist"
                    >
                      <option value={item.assignedMember.id}>
                        ★ {item.assignedMember.name}
                      </option>
                      {item.alternatives.map((alt) => (
                        <option key={alt.member.id} value={alt.member.id}>
                          {alt.member.name} ({alt.member.weeklyCapacityHours}h free)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Action Bar */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              {isAllocatedSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Squad allocated to weekly schedule!</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <UserCheck className="w-4 h-4" />
              <span>Approve &amp; Lock Squad</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Settings Modal */}
      {showAiModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Free AI Interpreter Engine
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="radio"
                  name="ai_mode"
                  checked={aiConfig.mode === 'local_nlp'}
                  onChange={() => setAiConfig((prev) => ({ ...prev, mode: 'local_nlp' }))}
                  className="mt-0.5 accent-purple-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    1. Built-in In-App AI Engine (Installed in App Code • Free Forever)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Runs 100% locally inside your browser memory immediately.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="radio"
                  name="ai_mode"
                  checked={aiConfig.mode === 'gemini_free'}
                  onChange={() => setAiConfig((prev) => ({ ...prev, mode: 'gemini_free' }))}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-white block">
                    2. Google Gemini 1.5 Flash (Cloud API)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Pre-configured with your Google Cloud API key.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  saveAIConfig(aiConfig);
                  setShowAiModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Save AI Mode
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
