import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export default function TestModal() {
  return (
    <>{/* MODAL 6: Full 360° Visual Project Detail & Monthly Ledger */}
      <AnimatePresence>
      {viewingProjectDetail && (() => {
        const liveProject = projectsList.find((p) => p.id === viewingProjectDetail.id) || viewingProjectDetail;
        const lead = customMembers.find((m) => m.id === liveProject.projectLeadId) || liveProject.members[0];
        const callAssignee =
          customMembers.find((m) => m.id === liveProject.clientCallAssigneeId) || lead;

        return (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
              onClick={() => setViewingProjectDetail(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[101] w-full max-w-3xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
            >
              <div className="flex-1 overflow-y-auto">
                {/* Sticky Header with Prominent Close / Cancel Button */}
                <div className="shrink-0 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 p-6 pb-4 bg-slate-900/95 backdrop-blur-md sticky top-0 z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-950 text-cyan-400 border border-slate-800">
                      {liveProject.client} • {liveProject.paymentInvoiceId}
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                        liveProject.paymentStatus === 'Paid'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : liveProject.paymentStatus === 'Overdue'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {liveProject.paymentStatus === 'Paid'
                        ? '✅ Paid'
                        : liveProject.paymentStatus === 'Overdue'
                        ? `🚨 Overdue (Due ${liveProject.paymentDueDate})`
                        : `⏳ Due ${liveProject.paymentDueDate}`}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">{liveProject.name}</h3>
                  <p className="text-xs text-slate-400">
                    Billing Structure: <strong className="text-slate-200">{liveProject.billingType}</strong> • Contract Price:{' '}
                    <strong className="text-emerald-400">{liveProject.price}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingProjectDetail(null)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-200 border border-slate-700 font-black text-xs transition-all cursor-pointer shadow-lg shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>Close / Cancel</span>
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6">
                {/* SECTION 1: MONTHLY LEDGER & PAYMENT HISTORY */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      <span>Monthly Financial Ledger &amp; Payment Tracker</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleTogglePaymentStatus(liveProject.id)}
                      className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow flex items-center gap-1.5 ${
                        liveProject.paymentStatus === 'Paid'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <span>
                        {liveProject.paymentStatus === 'Paid'
                          ? '✅ Current Cycle Paid (Click to Re-open)'
                          : '✅ Mark Current Cycle Paid'}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(liveProject.monthlyHistory || [
                      {
                        month: liveProject.billingMonth || 'Current Cycle',
                        amount: liveProject.paymentAmountNumeric,
                        status: liveProject.paymentStatus,
                        invoiceId: liveProject.paymentInvoiceId,
                        paidDate: liveProject.paymentReceivedDate
                      }
                    ]).map((h, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 ${
                          h.status === 'Paid'
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : h.status === 'Overdue'
                            ? 'bg-rose-950/30 border-rose-500/40'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">{h.month}</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              h.status === 'Paid'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : h.status === 'Overdue'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {h.status}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-black text-emerald-400">${h.amount.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400">{h.invoiceId}</span>
                        </div>

                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                          {h.paidDate ? (
                            <span className="text-emerald-400 font-bold">Settled: {h.paidDate}</span>
                          ) : (
                            <span>Due: {liveProject.paymentDueDate}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 2: SQUAD ASSIGNMENT & LEADERSHIP CHIPS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Assigned Leadership &amp; Squad Hours Allocation ({liveProject.members.length} members)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lead && (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-purple-500/30 flex items-center gap-3">
                        <img
                          src={lead.avatar}
                          alt={lead.name}
                          className="w-10 h-10 min-w-[2.5rem] max-w-[2.5rem] min-h-[2.5rem] max-h-[2.5rem] aspect-square rounded-xl object-cover shrink-0 overflow-hidden shadow-md"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider block">
                            👑 Project Lead
                          </span>
                          <span className="text-xs font-bold text-white truncate block">{lead.name}</span>
                          <span className="text-[10px] text-slate-400 truncate block">{lead.role}</span>
                        </div>
                      </div>
                    )}

                    {callAssignee && (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 flex items-center gap-3">
                        <img
                          src={callAssignee.avatar}
                          alt={callAssignee.name}
                          className="w-10 h-10 min-w-[2.5rem] max-w-[2.5rem] min-h-[2.5rem] max-h-[2.5rem] aspect-square rounded-xl object-cover shrink-0 overflow-hidden shadow-md"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider block">
                            📞 Client Call Assignee
                          </span>
                          <span className="text-xs font-bold text-white truncate block">{callAssignee.name}</span>
                          <span className="text-[10px] text-slate-400 truncate block">{callAssignee.role}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Squad Members Chip List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {liveProject.members.map((m) => {
                      const hrs = getMemberHoursOnProject(liveProject, m.id);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all"
                        >
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-9 h-9 min-w-[2.25rem] max-w-[2.25rem] min-h-[2.25rem] max-h-[2.25rem] aspect-square rounded-xl object-cover shrink-0 overflow-hidden shadow"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white block truncate leading-tight">{m.name}</span>
                            <span className="text-[10px] text-cyan-400 font-extrabold block">+{hrs}h / week allocated</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 2.5: GRANULAR TASK DELIVERABLES & SQUAD HOURS BREAKDOWN */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <span>🛠️ Task Deliverables &amp; Assignee Hours Breakdown</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleAddTaskAllocation(liveProject.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Task Deliverable</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(liveProject.taskBreakdown && liveProject.taskBreakdown.length > 0
                      ? liveProject.taskBreakdown
                      : []
                    ).map((tb) => (
                      <div
                        key={tb.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 text-xs items-center shadow-md"
                      >
                        <div className="md:col-span-4 flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400">Task Category</span>
                          <select
                            value={tb.taskType}
                            onChange={(e) =>
                              handleUpdateTaskAllocation(
                                liveProject.id,
                                tb.id,
                                'taskType',
                                e.target.value as AgencyTaskCategory
                              )
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="On-Page SEO">On-Page SEO</option>
                            <option value="Off-Page SEO">Off-Page SEO</option>
                            <option value="Technical SEO">Technical SEO</option>
                            <option value="Local SEO">Local SEO</option>
                            <option value="Web Design">Web Design</option>
                            <option value="Guest Post">Guest Post</option>
                            <option value="Content Strategy">Content Strategy</option>
                          </select>
                        </div>

                        <div className="md:col-span-5 flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400">Assigned Member</span>
                          <select
                            value={tb.assigneeId}
                            onChange={(e) =>
                              handleUpdateTaskAllocation(liveProject.id, tb.id, 'assigneeId', e.target.value)
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            {customMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3 flex items-end justify-between gap-2.5">
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] font-bold text-slate-400">Weekly Hours</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={tb.hours}
                                onChange={(e) =>
                                  handleUpdateTaskAllocation(
                                    liveProject.id,
                                    tb.id,
                                    'hours',
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-extrabold text-emerald-400 focus:outline-none text-center"
                              />
                              <span className="text-slate-400 text-xs font-bold">hrs/wk</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTaskAllocation(liveProject.id, tb.id)}
                            title="Delete Task Allocation"
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!liveProject.taskBreakdown || liveProject.taskBreakdown.length === 0) && (
                      <div className="text-center py-4 text-slate-500 text-xs">
                        No task deliverables added yet. Click &quot;Add Task Deliverable&quot; above to assign on-page, technical, or web design tasks!
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: MILESTONES & UTILIZATION PROGRESS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Milestones Completed</span>
                      <span className="text-pink-400 font-black">
                        {liveProject.milestonesCompleted} / {liveProject.milestonesTotal}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full"
                        style={{
                          width: `${
                            liveProject.milestonesTotal > 0
                              ? (liveProject.milestonesCompleted / liveProject.milestonesTotal) * 100
                              : 0
                          }%`
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Renewal / Next Due: <strong className="text-amber-300">{liveProject.dueDateOrRenewal}</strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Budgeted Hours Utilization</span>
                      <span className="text-cyan-400 font-black">
                        {liveProject.activeHours}h / {liveProject.totalHours}h ({liveProject.progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: `${liveProject.progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Start Date: <strong className="text-slate-300">{liveProject.startDate}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="shrink-0 border-t border-slate-800 p-6 pt-4 bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
                <button
                  type="button"
                  onClick={() => handleCopyClientSummary(liveProject)}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <span>📄 Copy Client Summary &amp; Invoice Report</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = liveProject;
                      setViewingProjectDetail(null);
                      setEditingFinancesProject({ ...target });
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Finances &amp; Schedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingProjectDetail(null)}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    Close 360° Inspection
                  </button>
                </div>
            </motion.div>
          </>
        );
      })()}
      </AnimatePresence>

        )
}
