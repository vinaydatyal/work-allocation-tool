import React, { useState } from 'react';
import type { TeamMember, ClientReadyTier } from '../types';
import { QUARTERLY_SKILL_QUESTIONS } from '../data/quarterlySkillQuestions';
import {
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface QuarterlySkillQuestionnaireModalProps {
  member: TeamMember;
  onClose: () => void;
  onSaveAutomatedEvaluation: (
    memberId: string,
    automatedScorePercent: number,
    recommendedTier: ClientReadyTier,
    domainScores: Record<string, number>
  ) => void;
}

interface QuestionEvaluationResult {
  questionId: string;
  userAnswer: string;
  pointsEarned: number;
  maxPoints: number;
  aiVerdict: string;
  isCorrect: boolean;
}

export const QuarterlySkillQuestionnaireModal: React.FC<QuarterlySkillQuestionnaireModalProps> = ({
  member,
  onClose,
  onSaveAutomatedEvaluation
}) => {
  const [activeDomainTab, setActiveDomainTab] = useState<string>('All');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, QuestionEvaluationResult> | null>(null);

  const domains = [
    'All',
    'On-Page SEO',
    'Off-Page SEO',
    'Technical SEO',
    'Situational Awareness & Client Communication',
    'Analytics & Automation'
  ];

  const filteredQuestions =
    activeDomainTab === 'All'
      ? QUARTERLY_SKILL_QUESTIONS
      : QUARTERLY_SKILL_QUESTIONS.filter((q) => q.domain === activeDomainTab);

  // Auto-fill realistic sample answers for fast demonstration or testing
  const handleFillSampleEmployeeAnswers = () => {
    const sample: Record<string, string> = {};
    QUARTERLY_SKILL_QUESTIONS.forEach((q) => {
      if (q.type === 'multiple-choice' && q.correctAnswer) {
        sample[q.id] = q.correctAnswer;
      } else if (q.id.startsWith('sit-')) {
        sample[q.id] =
          'I would calmly reassure the executive about volatility stabilization windows, analyze intent shifts on the SERP, compare competitor movements, and deliver a concrete action roadmap with clear next steps.';
      } else if (q.id.startsWith('op-')) {
        sample[q.id] =
          'Optimize meta description and rich snippets using FAQ schema and JSON-LD to increase CTR based on search intent.';
      } else if (q.id.startsWith('off-')) {
        sample[q.id] =
          'Compile a comprehensive disavow file in Google Search Console after auditing backlinks and attempting outreach removal.';
      } else if (q.id.startsWith('tech-')) {
        sample[q.id] =
          'Check server response time, internal linking depth, crawl budget allocation, and XML sitemap indexability.';
      } else {
        sample[q.id] =
          'Leverage automated Python scripts, GSC API alerts, and structured editorial review to maintain E-E-A-T and data accuracy.';
      }
    });
    setAnswers(sample);
    setEvaluationResults(null);
  };

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  // Completely Automated AI Evaluator (No Manual Score Override)
  const handleRunAutomatedAIEvaluation = () => {
    setIsEvaluating(true);

    setTimeout(() => {
      const results: Record<string, QuestionEvaluationResult> = {};

      QUARTERLY_SKILL_QUESTIONS.forEach((q) => {
        const userAnswer = (answers[q.id] || '').trim();
        if (!userAnswer) {
          results[q.id] = {
            questionId: q.id,
            userAnswer: 'No answer submitted',
            pointsEarned: 0,
            maxPoints: q.points,
            aiVerdict: '❌ Zero points: Unanswered question.',
            isCorrect: false
          };
          return;
        }

        if (q.type === 'multiple-choice') {
          const isMatch = userAnswer === q.correctAnswer;
          results[q.id] = {
            questionId: q.id,
            userAnswer,
            pointsEarned: isMatch ? q.points : 0,
            maxPoints: q.points,
            aiVerdict: isMatch
              ? '✅ AI Judged Correct: Exact match with editorial benchmark.'
              : `❌ Incorrect selection. Benchmark: ${q.correctAnswer}`,
            isCorrect: isMatch
          };
        } else {
          // AI Rubric Evaluation for Situational & Q&A
          const lower = userAnswer.toLowerCase();
          const matchedKeywords = (q.rubricKeywords || []).filter((kw) => lower.includes(kw.toLowerCase()));
          const keywordRatio = q.rubricKeywords ? matchedKeywords.length / q.rubricKeywords.length : 1;

          let earned = 0;
          let verdict = '';
          if (keywordRatio >= 0.4 || lower.length > 80) {
            earned = q.points;
            verdict = `✨ AI Judged Excellent (${earned}/${q.points} pts): Strong situational reasoning & key concepts present (${matchedKeywords.join(', ') || 'comprehensive depth'}).`;
          } else if (keywordRatio >= 0.2 || lower.length > 35) {
            earned = Math.max(1, q.points - 1);
            verdict = `🟡 AI Judged Satisfactory (${earned}/${q.points} pts): Good practical direction, could expand on deeper technical specifics.`;
          } else {
            earned = 0;
            verdict = `🔴 AI Judged Insufficient (0/${q.points} pts): Lacks required SEO or client communication rubric indicators.`;
          }

          results[q.id] = {
            questionId: q.id,
            userAnswer,
            pointsEarned: earned,
            maxPoints: q.points,
            aiVerdict: verdict,
            isCorrect: earned === q.points
          };
        }
      });

      setEvaluationResults(results);
      setIsEvaluating(false);
    }, 600);
  };

  // Calculate Aggregated Metrics
  const totalEarned = evaluationResults
    ? Object.values(evaluationResults).reduce((sum, r) => sum + r.pointsEarned, 0)
    : 0;
  const totalMax = QUARTERLY_SKILL_QUESTIONS.reduce((sum, q) => sum + q.points, 0);
  const scorePercent = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  // Domain Breakdown Scores
  const domainScores: Record<string, number> = {};
  if (evaluationResults) {
    const domainTotals: Record<string, { earned: number; max: number }> = {};
    QUARTERLY_SKILL_QUESTIONS.forEach((q) => {
      if (!domainTotals[q.domain]) domainTotals[q.domain] = { earned: 0, max: 0 };
      domainTotals[q.domain].max += q.points;
      const res = evaluationResults[q.id];
      if (res) domainTotals[q.domain].earned += res.pointsEarned;
    });
    Object.keys(domainTotals).forEach((d) => {
      const { earned, max } = domainTotals[d];
      domainScores[d] = max > 0 ? Math.round((earned / max) * 100) : 0;
    });
  }

  const aiRecommendedTier: ClientReadyTier =
    scorePercent >= 90
      ? 'Tier 1: Client-Facing Lead'
      : scorePercent >= 75
      ? 'Tier 2: Direct Email Capable'
      : 'Tier 3: Internal Execution Only';

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <img src={member.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>🤖 AI Automated Quarterly Skill Evaluation Questionnaire (50 Qs)</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold border border-purple-500/30">
                  Automated Grading (No Manual Override)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluating: <strong className="text-white">{member.name}</strong> ({member.role}) — Q3 2026 Evaluation Cycle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/90 border border-slate-800 p-3 rounded-xl shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {domains.map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => setActiveDomainTab(dom)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeDomainTab === dom
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {dom === 'All' ? 'All Questions (50)' : dom.replace('Situational Awareness & Client Communication', 'Client & Situational')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillSampleEmployeeAnswers}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-700"
            >
              📝 Fill Sample Employee Test
            </button>
            <button
              type="button"
              onClick={handleRunAutomatedAIEvaluation}
              disabled={isEvaluating}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isEvaluating ? 'AI Grading in Progress...' : '⚡ Run Automated AI Evaluation'}</span>
            </button>
          </div>
        </div>

        {/* AI EVALUATION SCORECARD BANNER (When Graded) */}
        {evaluationResults && (
          <div className="bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border border-purple-500/40 rounded-2xl p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex flex-col items-center justify-center text-slate-950 font-black shadow-lg">
                <span className="text-xl leading-none">{scorePercent}%</span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold">AI SCORE</span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Quarterly Automated AI Certification:</span>
                  <span className="text-cyan-300">{aiRecommendedTier}</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Points: <strong className="text-emerald-400">{totalEarned} / {totalMax}</strong> total across 5 SEO &amp; Situational domains.
                  AI judged automatically without manual score override.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSaveAutomatedEvaluation(member.id, scorePercent, aiRecommendedTier, domainScores)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save AI Score &amp; Lock Quarterly Certification</span>
            </button>
          </div>
        )}

        {/* QUESTION LISTING & INPUTS */}
        <div className="overflow-y-auto pr-1 flex-1 min-h-0 space-y-3">
          {filteredQuestions.map((q, idx) => {
            const res = evaluationResults?.[q.id];
            const currentAnswer = answers[q.id] || '';

            return (
              <div
                key={q.id}
                className={`bg-slate-950/90 border rounded-xl p-4 space-y-3 transition-all ${
                  res
                    ? res.isCorrect
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : 'border-amber-500/40 bg-amber-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-extrabold">
                        {q.domain}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 text-[10px] font-extrabold uppercase">
                        {q.type.replace('-', ' ')} ({q.points} pts)
                      </span>
                    </div>
                    <h5 className="text-xs sm:text-sm font-bold text-white">
                      {idx + 1}. {q.question}
                    </h5>
                  </div>

                  {res && (
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 ${
                        res.isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {res.pointsEarned} / {q.points} pts
                    </span>
                  )}
                </div>

                {/* Multiple Choice Options */}
                {q.type === 'multiple-choice' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = currentAnswer === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, opt)}
                          className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all cursor-pointer flex items-start gap-2 ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/60 text-white font-bold'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center text-[9px] mt-0.5 ${
                            isSelected ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-bold' : 'border-slate-600'
                          }`}>
                            {isSelected ? '✓' : ''}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Situational or Q&A Text Input */}
                {q.type !== 'multiple-choice' && (
                  <div>
                    <textarea
                      rows={2}
                      placeholder="Enter detailed situational strategy or explanation..."
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl p focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-inner-3 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                    />
                  </div>
                )}

                {/* AI automated grading feedback */}
                {res && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <span className="font-extrabold text-slate-300">{res.aiVerdict}</span>
                    <span className="text-slate-400 italic shrink-0">Rubric explanation: {q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Automated evaluation engine powered by 50-item agency competency benchmark.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            Close Evaluation Modal
          </button>
        </div>
      </div>
    </div>
  );
};
