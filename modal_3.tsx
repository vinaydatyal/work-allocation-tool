import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export default function TestModal() {
  return (
    <>{/* MODAL 3: Executive Individual Employee Profile & Growth Center */}
      <AnimatePresence>
      {editingMember && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
            onClick={() => setEditingMember(null)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-3xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 pb-2">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={editingMember.avatar}
                      alt={editingMember.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-cyan-500/40"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-white">{editingMember.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold border border-slate-700">
                          {editingMember.department}
                        </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{editingMember.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics & Utilization Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Weekly Capacity</span>
                <span className="text-base font-black text-white mt-0.5 block">
                  {calculateMemberAssignedHours(editingMember.id)}h / {editingMember.weeklyCapacityHours}h
                </span>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      calculateMemberAssignedHours(editingMember.id) > editingMember.weeklyCapacityHours
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (calculateMemberAssignedHours(editingMember.id) / editingMember.weeklyCapacityHours) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Client Readiness Tier</span>
                <span className="text-xs font-black text-cyan-300 mt-1 block truncate">
                  {editingMember.generalCompetency.clientReadyTier}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Active Projects Led</span>
                <span className="text-base font-black text-purple-400 mt-0.5 block">
                  {projectsList.filter((p) => p.members.some((m) => m.id === editingMember.id)).length} Active Retainers
                </span>
              </div>
            </div>

            {/* Visual Competency Heatmap & Growth Analytics */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📊 Visual Competency Heatmap &amp; Growth Analytics</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-400">Quarterly Benchmark Index</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-300">English Fluency</span>
                    <span className="text-cyan-400">{editingMember.generalCompetency.englishProficiency}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                      style={{ width: `${editingMember.generalCompetency.englishProficiency * 10}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-300">Client Comms</span>
                    <span className="text-purple-400">{editingMember.generalCompetency.clientCommunication}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                      style={{ width: `${editingMember.generalCompetency.clientCommunication * 10}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-300">Intake Briefs</span>
                    <span className="text-emerald-400">{editingMember.generalCompetency.requirementUnderstanding}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                      style={{ width: `${editingMember.generalCompetency.requirementUnderstanding * 10}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-300">Reliability</span>
                    <span className="text-amber-400">{editingMember.generalCompetency.proactivityReliability}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                      style={{ width: `${editingMember.generalCompetency.proactivityReliability * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Internal App Section Links & Navigation Hub */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-300 block">
                🔗 Internal App Navigation &amp; Workflow Links
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    onNavigateView?.('projects');
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                >
                  <span className="text-xs font-extrabold text-cyan-300 block group-hover:underline">
                    📁 Active Projects Tracker →
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Inspect deliverables &amp; hours for this employee
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    onNavigateView?.('skills');
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                >
                  <span className="text-xs font-extrabold text-purple-300 block group-hover:underline">
                    🧠 Skill Evaluation Center →
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Take 50-Q AI Questionnaire &amp; test score
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    onNavigateView?.('hours');
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                >
                  <span className="text-xs font-extrabold text-emerald-300 block group-hover:underline">
                    ⚡ Capacity &amp; Pulse Bar →
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    View workload utilization &amp; financial pulse
                  </span>
                </button>
              </div>
            </div>

            {/* Edit Employee Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Employee Name</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Role Title</label>
                <input
                  type="text"
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Weekly Capacity Cap (h)</label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={editingMember.weeklyCapacityHours}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      weeklyCapacityHours: parseInt(e.target.value, 10) || 40
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0 p-6 sticky bottom-0 bg-slate-900/95 backdrop-blur-md z-10">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedMember}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Save Profile Changes
              </button>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

        )
}
