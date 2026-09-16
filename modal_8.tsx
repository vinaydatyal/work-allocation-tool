import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export default function TestModal() {
  return (
    <>{/* MODAL 8: Quarterly Employee Skill Calibration & Interactive Testing Suite */}
      <AnimatePresence>
      {testingMemberSkill && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
            onClick={() => setTestingMemberSkill(null)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-4xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <img
                  src={testingMemberSkill.avatar}
                  alt={testingMemberSkill.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/50"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{testingMemberSkill.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                      Quarterly Skill Assessment
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Evaluate &amp; calibrate {testingMemberSkill.role} • Current Tier: {testingMemberSkill.generalCompetency.clientReadyTier.split(':')[0]}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTestingMemberSkill(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
              {/* Top Examination Control Banner & Exam Mode Switcher */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-xs font-black text-slate-200 uppercase tracking-wide">
                      {aiEvaluationDone ? 'AI Evaluation Complete' : 'Agency Certification Assessment Mode'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSwitchExamMode(
                          examMode === 'ROLE_SPECIFIC' ? 'FULL_50_MASTER' : 'ROLE_SPECIFIC'
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        examMode === 'FULL_50_MASTER'
                          ? 'bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/25'
                          : 'bg-slate-900 text-purple-300 border-purple-500/30 hover:bg-slate-800'
                      }`}
                    >
                      {examMode === 'FULL_50_MASTER'
                        ? '📚 Full 50-Question Master Exam Active'
                        : '🎯 Role-Specific Exam (Switch to Full 50-Q Master Exam)'}
                    </button>

                    <button
                      type="button"
                      onClick={handleAutofillSampleAnswers}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>💡 Autofill Sample Expert Answers</span>
                    </button>

                    <button
                      type="button"
                      disabled={isAiJudging}
                      onClick={handleRunAiEvaluation}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>{isAiJudging ? '🤖 AI Evaluating Answers...' : '🤖 Run Automated AI Evaluation'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Automated AI Score Judgment & Tier Prediction Card */}
              {(() => {
                if (!aiEvaluationDone) {
                  return (
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-950 to-purple-950/30 border border-purple-500/30 text-center space-y-2">
                      <h4 className="text-sm font-black text-white">
                        ✍️ Complete Situation-Based Written Assessment Below ({testQuestionnaire.length} Comprehensive Questions)
                      </h4>
                      <p className="text-xs text-slate-400 max-w-xl mx-auto">
                        Includes real-world multiple-choice governance checks, situational crisis triage, and short technical Q&A. Once finished, click{' '}
                        <span className="text-cyan-400 font-bold">&quot;Run Automated AI Evaluation&quot;</span> for automatic algorithmic grading and tier certification. Zero manual score overrides allowed.
                      </p>
                    </div>
                  );
                }

                const totalSum = testQuestionnaire.reduce((sum, q) => sum + (q.aiJudgedScore ?? 8.5), 0);
                const liveComposite =
                  testQuestionnaire.length > 0
                    ? Math.round((totalSum / testQuestionnaire.length) * 10) / 10
                    : 9.2;

                let predictedTier = 'Tier 1: Client-Facing Lead';
                let judgmentVerdict =
                  '🏆 MASTER CERTIFIED: AI algorithm verified exceptional situational empathy, root-cause methodology, and client presentation clarity.';
                let verdictColor = 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';

                if (liveComposite < 7.2 || !testPassedPractical) {
                  predictedTier = 'Tier 3: Internal Execution Only';
                  judgmentVerdict =
                    '⚠️ RETRAINING REQUIRED: AI detected insufficient diagnostic depth or incomplete client communication protocols.';
                  verdictColor = 'text-amber-300 bg-amber-500/15 border-amber-500/30';
                } else if (liveComposite < 8.7) {
                  predictedTier = 'Tier 2: Direct Email Capable';
                  judgmentVerdict =
                    '🥈 SENIOR PRACTITIONER: AI verified high technical accuracy and capable independent email communication.';
                  verdictColor = 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30';
                }

                return (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/50 border border-purple-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-purple-300 tracking-wider block">
                          AI Judged Composite Score ({testQuestionnaire.length} Questions Evaluated)
                        </span>
                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-3xl font-black text-white">{liveComposite}</span>
                          <span className="text-sm font-bold text-slate-400">/ 10</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] font-bold text-slate-400 block">AI Certified Governance Tier</span>
                        <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 font-black text-xs border border-purple-500/40 inline-block mt-1">
                          🤖 {predictedTier}
                        </span>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border text-xs font-bold ${verdictColor}`}>
                      {judgmentVerdict}
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic Situation-Based Questionnaire Grouped by Category */}
              <div className="space-y-6">
                {(() => {
                  const categories: string[] = [];
                  testQuestionnaire.forEach((q) => {
                    if (!categories.includes(q.skillCategory)) categories.push(q.skillCategory);
                  });

                  return categories.map((cat) => {
                    const catQuestions = testQuestionnaire.filter((q) => q.skillCategory === cat);
                    const catAvg =
                      Math.round(
                        (catQuestions.reduce((s, q) => s + (q.aiJudgedScore ?? 0), 0) / catQuestions.length) * 10
                      ) / 10;

                    return (
                      <div
                        key={cat}
                        className="space-y-4 p-5 rounded-3xl bg-slate-950/80 border border-slate-800/90 shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                          <h4 className="font-black text-white text-sm flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                            <span>{cat}</span>
                          </h4>
                          {aiEvaluationDone && (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-extrabold">
                              AI Judged Category Avg: {catAvg} / 10
                            </span>
                          )}
                        </div>

                        <div className="space-y-5 pt-1">
                          {catQuestions.map((q, qIdx) => (
                            <div
                              key={q.id}
                              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-purple-300 uppercase tracking-wide">
                                    Question #{qIdx + 1}: {q.questionTitle}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                                    {q.questionType === 'MULTIPLE_CHOICE'
                                      ? 'Multiple Choice'
                                      : q.questionType === 'Q_AND_A_SHORT'
                                      ? 'Technical Q&A'
                                      : 'Situation Written'}
                                  </span>
                                </div>
                                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs text-slate-200 font-medium leading-relaxed">
                                  {q.questionPrompt}
                                </div>
                              </div>

                              {/* Multiple Choice vs Written Response Input */}
                              {q.questionType === 'MULTIPLE_CHOICE' && q.options ? (
                                <div className="space-y-2 pt-1">
                                  <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                                    Select Correct Answer:
                                  </label>
                                  <div className="grid grid-cols-1 gap-2">
                                    {q.options.map((opt, optIdx) => {
                                      const isSelected = q.userAnswer === opt;
                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          onClick={() => handleUpdateUserAnswer(q.id, opt)}
                                          className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-start gap-2.5 ${
                                            isSelected
                                              ? 'bg-purple-500/20 border-purple-500 text-white shadow'
                                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                              isSelected
                                                ? 'border-purple-400 bg-purple-500 text-white'
                                                : 'border-slate-600 bg-slate-900'
                                            }`}
                                          >
                                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                          </span>
                                          <span>{opt}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                                    <span>Employee Written Response (No Manual Score Override)</span>
                                    <span className="text-[10px] text-slate-500">Auto-Evaluated by AI</span>
                                  </label>
                                  <textarea
                                    rows={q.questionType === 'Q_AND_A_SHORT' ? 2 : 4}
                                    value={q.userAnswer}
                                    onChange={(e) => handleUpdateUserAnswer(q.id, e.target.value)}
                                    placeholder={
                                      q.questionType === 'Q_AND_A_SHORT'
                                        ? 'Type concise technical answer / rule...'
                                        : 'Type your detailed situational diagnosis, client communication plan, and technical triage steps here...'
                                    }
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed font-mono"
                                  />
                                </div>
                              )}

                              {/* AI Evaluator Verdict Card */}
                              {q.aiJudgedScore !== null && (
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-950 border border-purple-500/40 space-y-2 animate-fade-in">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                                      <span>🤖 AI Algorithmic Judgment Score</span>
                                    </span>
                                    <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-black text-xs border border-purple-500/40">
                                      {q.aiJudgedScore} / 10
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    {q.aiFeedback}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Practical Challenge Checkbox */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="practicalCheck"
                  checked={testPassedPractical}
                  onChange={(e) => setTestPassedPractical(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
                <label htmlFor="practicalCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Employee identity &amp; written examination authenticity verified by Squad Lead.
                </label>
              </div>

              {/* Calibration Summary Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Judged Evaluation &amp; Career Calibration Summary Notes
                </label>
                <textarea
                  rows={2}
                  value={testNotes}
                  onChange={(e) => setTestNotes(e.target.value)}
                  placeholder="Record key strengths, AI feedback summary, or quarterly career milestones..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTestingMemberSkill(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isAiJudging}
                  onClick={handleRunAiEvaluation}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isAiJudging ? '🤖 AI Evaluating...' : '🤖 Run Automated AI Evaluation'}
                </button>

                <button
                  type="button"
                  disabled={!aiEvaluationDone}
                  onClick={handleSaveSkillTestResult}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/25 flex items-center gap-2 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalize &amp; Save AI Judged Score</span>
                </button>
              </div>
            </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {viewingMemberProfile && (() => {
        const member = viewingMemberProfile;
        const assignedProjs = projectsList.filter(
          (p) =>
            p.members.some((m) => m.id === member.id) ||
            p.taskBreakdown?.some((tb) => tb.assigneeId === member.id) ||
            p.projectLeadId === member.id ||
            p.clientCallAssigneeId === member.id
        );
        const totalAssignedHrs = assignedProjs.reduce((sum, p) => sum + getMemberHoursOnProject(p, member.id), 0);
        const utilizationPct = Math.round((totalAssignedHrs / member.weeklyCapacityHours) * 100);

        return (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
              onClick={() => setViewingMemberProfile(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[101] w-full max-w-3xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
            >
              <div className="flex-1 overflow-y-auto">
                {/* Executive Profile Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-500/50 shadow-lg shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-white">{member.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-extrabold border border-purple-500/30">
                        {member.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                      <span>Department: <strong className="text-slate-300">{member.department}</strong></span>
                      <span>• Seniority: <strong className="text-slate-300">{member.seniority}</strong></span>
                      <span>• Tier: <strong className="text-purple-400">{member.generalCompetency.clientReadyTier.split(':')[0]}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openSkillTestModal(member)}
                    className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-extrabold text-xs border border-purple-500/40 transition-all cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <span>🧪 Take Quarterly Skill Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingMemberProfile(null)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6 text-xs">
                {/* Bandwidth & Utilization Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Weekly Capacity Cap
                    </span>
                    <span className="text-xl font-black text-white block pt-1">{member.weeklyCapacityHours} Hours</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Currently Assigned
                    </span>
                    <span className="text-xl font-black text-cyan-400 block pt-1">
                      {totalAssignedHrs}h ({utilizationPct}%)
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Quarterly Assessment Score
                    </span>
                    <span className="text-xl font-black text-emerald-400 block pt-1">
                      {member.generalCompetency.quarterlyScore
                        ? `${member.generalCompetency.quarterlyScore} / 10`
                        : member.generalCompetency.lastTestedDate
                        ? `Tested ${member.generalCompetency.lastTestedDate}`
                        : 'Not Yet Tested'}
                    </span>
                  </div>
                </div>

                {/* Assigned Active Projects With INTERNAL DEEP LINKS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-white text-sm">
                      Assigned Projects &amp; Deliverables ({assignedProjs.length})
                    </h4>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Click below to jump directly to any project ledger
                    </span>
                  </div>

                  {assignedProjs.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-400">
                      No active projects assigned currently — 100% available bandwidth!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {assignedProjs.map((proj) => {
                        const hrs = getMemberHoursOnProject(proj, member.id);
                        const memberTasks = (proj.taskBreakdown || []).filter((tb) => tb.assigneeId === member.id);
                        const isLead = proj.projectLeadId === member.id;
                        const isCallLead = proj.clientCallAssigneeId === member.id;

                        return (
                          <div
                            key={proj.id}
                            className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">{proj.name}</span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-bold">
                                  {proj.client}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                                {isLead && (
                                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 font-extrabold text-[10px] border border-cyan-500/30">
                                    👑 Squad Lead
                                  </span>
                                )}
                                {isCallLead && (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-extrabold text-[10px] border border-purple-500/30">
                                    🗣️ Client Call Lead
                                  </span>
                                )}
                                <span className="font-bold text-emerald-400">+{hrs} Hours Logged</span>
                                {memberTasks.map((tb) => (
                                  <span key={tb.id} className="text-slate-400">
                                    • {tb.taskType} ({tb.hours}h)
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Internal Navigation Link */}
                            <button
                              type="button"
                              onClick={() => {
                                setViewingMemberProfile(null);
                                setViewingProjectDetail(proj);
                                if (onNavigateView) onNavigateView('projects', proj.id);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                            >
                              <span>Open Project 360° Ledger →</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* App Internal Cross-Navigation Shortcuts Strip */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    🔗 Internal Hub Shortcuts for {member.name.split(' ')[0]}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingMemberProfile(null);
                        if (onNavigateView) onNavigateView('hours');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📊 View Employee Hours &amp; Capacity Ledger →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setViewingMemberProfile(null);
                        if (onNavigateView) onNavigateView('bot');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🤖 Open Job Delivery Bot &amp; Squad Assignment →</span>
                    </button>
                  </div>
                </div>

                {/* CAREER GOVERNANCE & CLIENT-READY PROGRESSION TRACK */}
                <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-white tracking-wide flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span>Career Governance &amp; Client-Ready Progression Road</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-[11px] font-extrabold text-purple-300">
                      Current: {member.generalCompetency.clientReadyTier}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
                    {[
                      {
                        tier: 'Tier 3: Internal Execution Only',
                        label: 'T3: Execution Specialist',
                        desc: 'Task production & technical implementation under squad supervision.',
                        step: 1
                      },
                      {
                        tier: 'Tier 2: Direct Email Capable',
                        label: 'T2: Client Communicator',
                        desc: 'Autonomous technical delivery + direct client async email communication.',
                        step: 2
                      },
                      {
                        tier: 'Tier 1: Client-Facing Lead',
                        label: 'T1: Client-Facing Lead',
                        desc: 'Strategic account lead, live client calls & crisis governance authority.',
                        step: 3
                      }
                    ].map((stepObj) => {
                      const isCurrent = member.generalCompetency.clientReadyTier === stepObj.tier;
                      const isAchieved =
                        stepObj.step === 1 ||
                        (stepObj.step === 2 && !member.generalCompetency.clientReadyTier.includes('Tier 3')) ||
                        (stepObj.step === 3 && member.generalCompetency.clientReadyTier.includes('Tier 1'));

                      return (
                        <div
                          key={stepObj.tier}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                            isCurrent
                              ? 'bg-purple-500/15 border-purple-500/50 ring-1 ring-purple-500/40 shadow-lg'
                              : isAchieved
                              ? 'bg-slate-900/90 border-emerald-500/30'
                              : 'bg-slate-900/40 border-slate-800 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-black ${
                                  isCurrent
                                    ? 'text-purple-300'
                                    : isAchieved
                                    ? 'text-emerald-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {stepObj.label}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-extrabold shrink-0">
                                  Active
                                </span>
                              )}
                              {!isCurrent && isAchieved && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                                  Verified ✓
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{stepObj.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* VISUAL MULTI-DIMENSIONAL COMPETENCY HEATMAP & SKILL MATRIX */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-extrabold text-white text-sm">
                      Multi-Dimensional Skill Competency Heatmap Matrix
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Evaluated across Quality • Speed • Communication
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {member.skills.map((sk) => {
                      const scoreObj = (member.skillScores || []).find((s) => s.skill === sk);
                      const quality = scoreObj?.quality || Math.min(10, Math.max(7, member.generalCompetency.clientCommunication));
                      const speed = scoreObj?.speedEfficiency || Math.min(10, Math.max(7, member.generalCompetency.proactivityReliability));
                      const comm = scoreObj?.communication || member.generalCompetency.clientCommunication;
                      const composite = Math.round(((quality + speed + comm) / 3) * 10) / 10;

                      return (
                        <div
                          key={sk}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                            <span className="font-extrabold text-sm text-white">{sk}</span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-black border border-emerald-500/30">
                              {composite} / 10 Avg
                            </span>
                          </div>

                          <div className="space-y-2.5 pt-1">
                            {/* Dimension 1: Quality & Accuracy */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-300">Quality &amp; Accuracy</span>
                                <span className="text-emerald-400">{quality} / 10</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400 rounded-full transition-all"
                                  style={{ width: `${Math.round((quality / 10) * 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 2: Speed & Efficiency */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-300">Speed &amp; Efficiency</span>
                                <span className="text-cyan-400">{speed} / 10</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-cyan-400 rounded-full transition-all"
                                  style={{ width: `${Math.round((speed / 10) * 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 3: Client Communication */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-300">Client Communication</span>
                                <span className="text-purple-400">{comm} / 10</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-purple-400 rounded-full transition-all"
                                  style={{ width: `${Math.round((comm / 10) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openSkillTestModal(member)}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-extrabold text-xs transition-all cursor-pointer"
                >
                  🧪 Retest Employee Skills
                </button>

                <button
                  type="button"
                  onClick={() => setViewingMemberProfile(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Close Employee Profile
                </button>
              </div>
              </div>
            </motion.div>
          </>
        );
      })()}
      </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
};
  )
}
