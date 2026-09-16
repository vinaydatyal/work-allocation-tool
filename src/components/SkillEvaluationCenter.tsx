import React, { useState } from 'react';
import type { TeamMember, AppUserProfile, ClientReadyTier } from '../types';
import { QuarterlySkillQuestionnaireModal } from './QuarterlySkillQuestionnaireModal';
import { 
  CheckCircle2, 
  MessageSquare, 
  FileText, 
  BrainCircuit, 
  ShieldCheck, 
  Save, 
  TrendingUp,
  Sparkles,
  Award
} from 'lucide-react';

interface SkillEvaluationCenterProps {
  teamMembers: TeamMember[];
  currentProfile: AppUserProfile;
  onUpdateGeneralCompetency: (
    memberId: string,
    englishProficiency: number,
    clientCommunication: number,
    requirementUnderstanding: number,
    proactivityReliability: number,
    clientReadyTier: ClientReadyTier
  ) => void;
}

export const SkillEvaluationCenter: React.FC<SkillEvaluationCenterProps> = ({
  teamMembers,
  currentProfile,
  onUpdateGeneralCompetency
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(teamMembers[0]?.id || '');
  const selectedMember = teamMembers.find((m) => m.id === selectedMemberId) || teamMembers[0];

  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState<boolean>(false);
  const [quarterlyExamScores, setQuarterlyExamScores] = useState<Record<string, { scorePercent: number; tier: ClientReadyTier }>>({});

  const [english, setEnglish] = useState<number>(selectedMember?.generalCompetency?.englishProficiency || 8.5);
  const [communication, setCommunication] = useState<number>(selectedMember?.generalCompetency?.clientCommunication || 8.0);
  const [understanding, setUnderstanding] = useState<number>(selectedMember?.generalCompetency?.requirementUnderstanding || 8.5);
  const [proactivity, setProactivity] = useState<number>(selectedMember?.generalCompetency?.proactivityReliability || 8.5);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync sliders when switching members
  const handleSelectMember = (mId: string) => {
    setSelectedMemberId(mId);
    const m = teamMembers.find((x) => x.id === mId);
    if (m) {
      setEnglish(m.generalCompetency.englishProficiency);
      setCommunication(m.generalCompetency.clientCommunication);
      setUnderstanding(m.generalCompetency.requirementUnderstanding);
      setProactivity(m.generalCompetency.proactivityReliability);
    }
    setSavedSuccess(false);
  };

  const avgGeneralScore = Number(
    ((english + communication + understanding + proactivity) / 4).toFixed(1)
  );

  const recommendedTier: ClientReadyTier =
    avgGeneralScore >= 9.2 && communication >= 9.0
      ? 'Tier 1: Client-Facing Lead'
      : avgGeneralScore >= 8.4
      ? 'Tier 2: Direct Email Capable'
      : 'Tier 3: Internal Execution Only';

  const [overrideTier, setOverrideTier] = useState<ClientReadyTier | null>(null);
  const effectiveTier = overrideTier || recommendedTier;

  const handleSaveEvaluation = () => {
    if (!selectedMember) return;
    onUpdateGeneralCompetency(
      selectedMember.id,
      english,
      communication,
      understanding,
      proactivity,
      effectiveTier
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveAutomatedEvaluation = (
    memberId: string,
    automatedScorePercent: number,
    recommendedTier: ClientReadyTier
  ) => {
    setQuarterlyExamScores((prev) => ({
      ...prev,
      [memberId]: { scorePercent: automatedScorePercent, tier: recommendedTier }
    }));
    // Also update slider competencies based on AI automated exam results
    const scaledScore = Number((automatedScorePercent / 10).toFixed(1));
    onUpdateGeneralCompetency(
      memberId,
      Math.min(10, Math.max(6, scaledScore)),
      Math.min(10, Math.max(6, scaledScore)),
      Math.min(10, Math.max(6, scaledScore)),
      Math.min(10, Math.max(6, scaledScore)),
      recommendedTier
    );
    setShowQuestionnaireModal(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Executive Skill Testing &amp; Client Readiness Center</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Client Communication Evaluation
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Test and score your team on general skills, English communication, and brief understanding to determine who can lead direct client meetings vs. internal execution.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Evaluator:</span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-emerald-400">
            {currentProfile.name} ({currentProfile.roleTitle})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Select Executive from Agency Roster */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Select Specialist to Evaluate ({teamMembers.length})
            </h3>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {teamMembers.map((m) => {
                const isSelected = m.id === selectedMember.id;
                const genAvg = (
                  (m.generalCompetency.englishProficiency +
                    m.generalCompetency.clientCommunication +
                    m.generalCompetency.requirementUnderstanding +
                    m.generalCompetency.proactivityReliability) /
                  4
                ).toFixed(1);

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMember(m.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40 shadow-lg shadow-purple-500/5'
                        : 'bg-slate-950/80 border border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                      />
                      <div>
                        <span className="text-sm font-bold text-white block leading-tight">
                          {m.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {m.role}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Gen Score
                      </span>
                      <span className="text-sm font-black text-purple-400">
                        {genAvg}/10
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Competency Testing Rubric & Sliders */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 max-h-[680px] overflow-y-auto pr-2">
            {/* Header for Selected Member */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <img
                  src={selectedMember.avatar}
                  alt={selectedMember.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-purple-500/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {selectedMember.name}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedMember.department}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedMember.role}</p>
                </div>
              </div>

              {/* Client Readiness Tier Badge */}
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Client Readiness Classification
                </span>
                <div
                  className={`mt-1 px-3 py-1 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 ${
                    effectiveTier.includes('Tier 1')
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : effectiveTier.includes('Tier 2')
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{effectiveTier}</span>
                </div>
              </div>
            </div>

            {/* QUARTERLY AUTOMATED AI SKILL EVALUATION BANNER */}
            <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-cyan-950/60 border border-purple-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-lg shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-white">
                      Quarterly 50-Question AI Skill &amp; Situational Test
                    </h4>
                    {quarterlyExamScores[selectedMember.id] ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40">
                        ✓ CERTIFIED ({quarterlyExamScores[selectedMember.id].scorePercent}%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">
                        DUE Q3 2026
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Evaluates On-Page, Off-Page, Technical SEO, Situational Awareness &amp; AI Workflow. Automatically judged by AI (no manual override).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQuestionnaireModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20 flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>🎯 Launch 50-Q AI Questionnaire</span>
              </button>
            </div>

            {/* General Competency Assessment Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Client Communication */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span>Client Communication &amp; Calls</span>
                  </span>
                  <span className="text-sm font-black text-purple-400">{communication}/10</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ability to lead client zoom calls, articulate SEO strategy, and respond professionally without lead supervision.
                </p>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="0.1"
                  value={communication}
                  onChange={(e) => {
                    setCommunication(parseFloat(e.target.value));
                    setOverrideTier(null);
                  }}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 2. English Proficiency & Grammar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>English Proficiency &amp; Tone</span>
                  </span>
                  <span className="text-sm font-black text-cyan-400">{english}/10</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Grammar accuracy, fluency, professional vocabulary, and polished written email tone without revision.
                </p>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="0.1"
                  value={english}
                  onChange={(e) => {
                    setEnglish(parseFloat(e.target.value));
                    setOverrideTier(null);
                  }}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* 3. Requirement & Brief Understanding */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-emerald-400" />
                    <span>Intake Requirement Understanding</span>
                  </span>
                  <span className="text-sm font-black text-emerald-400">{understanding}/10</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Speed and accuracy in digesting complex client SEO briefs, technical specifications, and goals on first pass.
                </p>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="0.1"
                  value={understanding}
                  onChange={(e) => {
                    setUnderstanding(parseFloat(e.target.value));
                    setOverrideTier(null);
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* 4. Proactivity & Delivery Reliability */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Proactivity &amp; Reliability</span>
                  </span>
                  <span className="text-sm font-black text-amber-400">{proactivity}/10</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Taking initiative, flagging road-blocks early, and independently maintaining fixed project schedules.
                </p>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="0.1"
                  value={proactivity}
                  onChange={(e) => {
                    setProactivity(parseFloat(e.target.value));
                    setOverrideTier(null);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Readiness Tier Override */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-300 block">
                  Override Classification Tier
                </span>
                <span className="text-[11px] text-slate-400">
                  Lock tier manually for AI client-facing project dispatching.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['Tier 1: Client-Facing Lead', 'Tier 2: Direct Email Capable', 'Tier 3: Internal Execution Only'] as ClientReadyTier[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setOverrideTier(tier)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      effectiveTier === tier
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {tier.split(':')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Save & Confirm Button */}
            <div className="pt-4 flex items-center justify-end gap-3">
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>General Competency &amp; Readiness Saved!</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveEvaluation}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Evaluation &amp; Calibrate Roster</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Automated 50-Question AI Quarterly Evaluation Modal */}
      {showQuestionnaireModal && selectedMember && (
        <QuarterlySkillQuestionnaireModal
          member={selectedMember}
          onClose={() => setShowQuestionnaireModal(false)}
          onSaveAutomatedEvaluation={handleSaveAutomatedEvaluation}
        />
      )}
    </div>
  );
};
