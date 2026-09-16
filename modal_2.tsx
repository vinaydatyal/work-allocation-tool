import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export default function TestModal() {
  return (
    <>{/* MODAL 2: Edit Existing Active Project & Squad Assignment */}
      <AnimatePresence>
      {editingProject && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
            onClick={() => setEditingProject(null)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-3xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 sm:p-6 pb-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>✏️ Edit Project &amp; Assigned Deliverables</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Update retainer details, budget cap, and On-Page / Off-Page / Technical SEO specialists
                    </p>
                  </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step / Slider Tabs Header (Complete Master Agency Sheet Sync) */}
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 shrink-0 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setEditModalStepTab('core')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  editModalStepTab === 'core'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>1️⃣ Core & Client Specs</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalStepTab('billing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  editModalStepTab === 'billing'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>2️⃣ Billing & Comms</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalStepTab('team')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  editModalStepTab === 'team'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>3️⃣ Leadership & Hours</span>
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 text-[10px] font-extrabold">
                  {(editingProject.taskBreakdown || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalStepTab('access')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  editModalStepTab === 'access'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>4️⃣ Access & Health Audit</span>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
              {/* TAB 1: CORE INFO & CLIENT DETAILS */}
              {editModalStepTab === 'core' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Name (tasks)</label>
                      <input
                        type="text"
                        value={editingProject.client}
                        onChange={(e) => setEditingProject({ ...editingProject, client: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Task / Project Name</label>
                      <input
                        type="text"
                        value={editingProject.name}
                        onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Project Status</label>
                      <select
                        value={editingProject.status || 'ON TRACK'}
                        onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="INITIAL STAGE">INITIAL STAGE</option>
                        <option value="ON TRACK">ON TRACK</option>
                        <option value="REVALUATION">REVALUATION</option>
                        <option value="PAUSED">PAUSED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Priority</label>
                      <select
                        value={editingProject.priorityLevel || 'NORMAL'}
                        onChange={(e) => setEditingProject({ ...editingProject, priorityLevel: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="URGENT">URGENT</option>
                        <option value="HIGH">HIGH</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Email (short text)</label>
                      <input
                        type="text"
                        placeholder="e.g. client@company.com"
                        value={editingProject.clientEmail || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, clientEmail: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                      Service Labels (Select All Applicable)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Full SEO',
                        'Local SEO',
                        'Technical SEO',
                        'AEO',
                        'GEO',
                        'Ecom SEO',
                        'Wordpress Dev',
                        'Website Migration',
                        'Google Ads',
                        'Content Optimization'
                      ].map((lbl) => {
                        const currentLabels = editingProject.serviceLabels || ['Full SEO'];
                        const isSelected = currentLabels.includes(lbl);
                        return (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? currentLabels.filter((s) => s !== lbl)
                                : [...currentLabels, lbl];
                              setEditingProject({ ...editingProject, serviceLabels: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                            }`}
                          >
                            {lbl} {isSelected ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Task Content / Project Scope Brief
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter full brief description, milestones, CMS platform details, or scope objectives..."
                      value={editingProject.taskContent || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, taskContent: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('billing')}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Next: Billing & Communication →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: BILLING, DATES & COMMUNICATION */}
              {editModalStepTab === 'billing' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Billing Method</label>
                      <select
                        value={editingProject.billingType}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, billingType: e.target.value as any })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Monthly Retainer">Fixed / Monthly Retainer</option>
                        <option value="Milestone Delivery">Milestone Delivery</option>
                        <option value="Weekly Hourly Billing">Weekly Hourly Billing ($/hr)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Billing Account</label>
                      <select
                        value={editingProject.billingAccount || 'Agam'}
                        onChange={(e) => setEditingProject({ ...editingProject, billingAccount: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Agam">Agam</option>
                        <option value="Manpreet">Manpreet</option>
                        <option value="Vinay">Vinay</option>
                        <option value="Gayatri">Gayatri</option>
                        <option value="Shivam">Shivam</option>
                        <option value="Rank Harvest">Rank Harvest</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Price Tag ($ / mo)</label>
                      <input
                        type="text"
                        value={editingProject.price}
                        onChange={(e) => setEditingProject({ ...editingProject, price: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {editingProject.billingType === 'Milestone Delivery' && (
                    <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-cyan-300 uppercase flex items-center gap-1.5">
                          <span>🏁 Milestone Tracker & Progress Alerts</span>
                        </h5>
                        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          Milestone Evaluation Active
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Completed Milestones
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={editingProject.milestonesCompleted}
                            onChange={(e) =>
                              setEditingProject({
                                ...editingProject,
                                milestonesCompleted: parseInt(e.target.value, 10) || 0
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Total Scope Milestones
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={editingProject.milestonesTotal}
                            onChange={(e) =>
                              setEditingProject({
                                ...editingProject,
                                milestonesTotal: parseInt(e.target.value, 10) || 1
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Milestone Reminder / Due Note
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Milestone 2 Due: July 28, 2026"
                            value={editingProject.dueDateOrRenewal}
                            onChange={(e) =>
                              setEditingProject({ ...editingProject, dueDateOrRenewal: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={editingProject.startDate}
                        onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Due Date / Renewal</label>
                      <input
                        type="text"
                        value={editingProject.dueDateOrRenewal}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, dueDateOrRenewal: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Folder URL</label>
                      <input
                        type="text"
                        placeholder="https://app.clickup.com/..."
                        value={editingProject.clientFolderUrl || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, clientFolderUrl: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Communication Channel</label>
                      <select
                        value={editingProject.communicationChannel || 'UW - Agam'}
                        onChange={(e) => setEditingProject({ ...editingProject, communicationChannel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="UW - Agam">UW - Agam</option>
                        <option value="UW - Manpreet">UW - Manpreet</option>
                        <option value="Slack">Slack</option>
                        <option value="WhatsApp - 79">WhatsApp - 79</option>
                        <option value="WhatsApp - 95">WhatsApp - 95</option>
                        <option value="Client Email">Client Email</option>
                        <option value="Trello">Trello</option>
                        <option value="Teams Live">Teams Live</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Reporting Platform</label>
                      <select
                        value={editingProject.reportingPlatform || 'UW - Agam'}
                        onChange={(e) => setEditingProject({ ...editingProject, reportingPlatform: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="UW - Agam">UW - Agam</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Trello 1428">Trello 1428</option>
                        <option value="Monday.com">Monday.com</option>
                        <option value="Slack">Slack</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Reporting Note / Frequency</label>
                    <input
                      type="text"
                      placeholder="e.g. Technical Audit in the first week / Weekly update notes..."
                      value={editingProject.reportingNote || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, reportingNote: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('core')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      ← Back to Core Specs
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('team')}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Next: Leadership & Deliverables →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: LEADERSHIP & HOURS ALLOCATION */}
              {editModalStepTab === 'team' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-black text-cyan-300 uppercase">Leadership Assignees & Total Weekly Hours</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Assignee (Team Lead)</label>
                        <select
                          value={editingProject.projectLeadId || customMembers[0]?.id}
                          onChange={(e) => setEditingProject({ ...editingProject, projectLeadId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          {customMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Face (Call Lead)</label>
                        <select
                          value={editingProject.clientCallAssigneeId || customMembers[0]?.id}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, clientCallAssigneeId: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          {customMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Dev / Tech Lead</label>
                        <select
                          value={editingProject.devTechAssigneeId || customMembers[0]?.id}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, devTechAssigneeId: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          {customMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Total Weekly Hours</label>
                        <input
                          type="number"
                          value={editingProject.totalHours}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, totalHours: Number(e.target.value) || 0 })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-300">
                        Deliverable Specialists & Weekly Hours Allocation
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Allocated:{' '}
                        {(editingProject.taskBreakdown || []).reduce((s, a) => s + (Number(a.hours) || 0), 0)} hrs /
                        week
                      </span>
                    </div>

                    {(editingProject.taskBreakdown || []).map((tb) => (
                      <div
                        key={tb.id}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/80"
                      >
                        <div className="col-span-5">
                          <select
                            value={tb.taskType}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = (editingProject.taskBreakdown || []).map((i) =>
                                i.id === tb.id ? { ...i, taskType: val } : i
                              );
                              setEditingProject({ ...editingProject, taskBreakdown: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                          >
                            <option value="On-Page SEO">On-Page SEO</option>
                            <option value="Off-Page SEO">Off-Page SEO</option>
                            <option value="Technical SEO">Technical SEO</option>
                            <option value="Content Optimization">Content Optimization</option>
                            <option value="AEO & GEO Strategy">AEO & GEO Strategy</option>
                            <option value="Wordpress Dev">Wordpress Dev</option>
                          </select>
                        </div>

                        <div className="col-span-4">
                          <select
                            value={tb.assigneeId}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = (editingProject.taskBreakdown || []).map((i) =>
                                i.id === tb.id ? { ...i, assigneeId: val } : i
                              );
                              setEditingProject({ ...editingProject, taskBreakdown: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                          >
                            {customMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              value={tb.hours}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const updated = (editingProject.taskBreakdown || []).map((i) =>
                                  i.id === tb.id ? { ...i, hours: val } : i
                                );
                                setEditingProject({ ...editingProject, taskBreakdown: updated });
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-2 pr-5 py-1.5 text-xs text-white font-bold text-right"
                            />
                            <span className="absolute right-1.5 top-2 text-[10px] text-slate-500">h</span>
                          </div>
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editingProject.taskBreakdown || []).filter((i) => i.id !== tb.id);
                              setEditingProject({ ...editingProject, taskBreakdown: updated });
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [
                            ...(editingProject.taskBreakdown || []),
                            {
                              id: `tb-${Date.now()}`,
                              taskType: 'On-Page SEO',
                              assigneeId: customMembers[0]?.id || '',
                              hours: 5
                            }
                          ];
                          setEditingProject({ ...editingProject, taskBreakdown: updated });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Deliverable Row</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <label className="text-xs font-extrabold text-slate-300 block">
                      Supporting Squad Roster (Optional)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800">
                      {customMembers.map((member) => {
                        const isAssigned = editingProject.members.some((m) => m.id === member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() => handleToggleMemberInEditingProject(member)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                              isAssigned
                                ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <img src={member.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                            <span className="text-[11px] font-bold truncate">{member.name}</span>
                            {isAssigned && <Check className="w-3.5 h-3.5 text-cyan-400 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('billing')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      ← Back to Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('access')}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Next: Access & Health Audit →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: ACCESS LOGINS & HEALTH AUDIT */}
              {editModalStepTab === 'access' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Backend Logins Note</label>
                      <input
                        type="text"
                        placeholder="e.g. Added to Zoho / Shopify - 1428 / Wordpress Admin"
                        value={editingProject.backendLoginsNote || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, backendLoginsNote: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Guest Post Included?</label>
                      <select
                        value={editingProject.guestPostIncluded || 'No'}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, guestPostIncluded: e.target.value as any })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="No">No — Standard Off-Page</option>
                        <option value="Yes">Yes — Dedicated Guest Post</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-black text-purple-300 uppercase">Access Status Tracking</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">GA4 Access</label>
                        <select
                          value={editingProject.ga4Access || 'Techie 1428'}
                          onChange={(e) => setEditingProject({ ...editingProject, ga4Access: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Techie 1428">Techie 1428</option>
                          <option value="Techie 1418">Techie 1418</option>
                          <option value="Client Email">Client Email</option>
                          <option value="Requested">Requested</option>
                          <option value="Not Required">Not Required</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">GBP Access</label>
                        <select
                          value={editingProject.gbpAccess || 'Not Required'}
                          onChange={(e) => setEditingProject({ ...editingProject, gbpAccess: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Techie GMB">Techie GMB</option>
                          <option value="Requested">Requested</option>
                          <option value="Not Required">Not Required</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">GSC Access</label>
                        <select
                          value={editingProject.gscAccess || 'Techie 1428'}
                          onChange={(e) => setEditingProject({ ...editingProject, gscAccess: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Techie 1428">Techie 1428</option>
                          <option value="Requested">Requested</option>
                          <option value="Not Required">Not Required</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">GTM Access</label>
                        <select
                          value={editingProject.gtmAccess || 'Not Required'}
                          onChange={(e) => setEditingProject({ ...editingProject, gtmAccess: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Techie 1418">Techie 1418</option>
                          <option value="Requested">Requested</option>
                          <option value="Not Required">Not Required</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                      Project Health & Client Rating
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: '☺☺☺☺☺ 5/5 Excellent', val: '☺☺☺☺☺' },
                        { label: '☺☺☺☺ 4/5 Good', val: '☺☺☺☺' },
                        { label: '☺☺☺ 3/5 Needs Attention', val: '☺☺☺' },
                        { label: '🚨 Critical Attention', val: '🚨 Critical' }
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setEditingProject({ ...editingProject, projectHealthEmoji: item.val as any })}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            (editingProject.projectHealthEmoji || '☺☺☺☺☺') === item.val
                              ? 'bg-cyan-500/20 border-cyan-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-start pt-2">
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('team')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      ← Back to Leadership & Deliverables
                    </button>
                  </div>
                </div>
              )}
            </div>

                </div>
              </div>
              {/* Footer always accessible */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0 p-5 sm:p-6 sticky bottom-0 bg-slate-900/95 backdrop-blur-md z-10">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedProject}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  Save Project &amp; Recalculate Hours
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

        )
}
