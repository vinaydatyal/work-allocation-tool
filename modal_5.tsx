import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export default function TestModal() {
  return (
    <>{/* MODAL 5: Edit Project Finances & Payment Schedule */}
      <AnimatePresence>
      {editingFinancesProject && (
                type="button"
                onClick={() => setEditingFinancesProject(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Payment Status</label>
                <select
                  value={editingFinancesProject.paymentStatus}
                  onChange={(e) =>
                    setEditingFinancesProject({
                      ...editingFinancesProject,
                      paymentStatus: e.target.value as any
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Paid">✅ Paid</option>
                  <option value="Overdue">🚨 Overdue</option>
                  <option value="Due Soon">⏳ Due Soon</option>
                  <option value="Pending">📋 Pending</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Payment Amount ($ USD)</label>
                <input
                  type="number"
                  value={editingFinancesProject.paymentAmountNumeric}
                  onChange={(e) =>
                    setEditingFinancesProject({
                      ...editingFinancesProject,
                      paymentAmountNumeric: parseInt(e.target.value, 10) || 0
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Payment Due Date / Next Milestone Date
                </label>
                <input
                  type="date"
                  value={editingFinancesProject.paymentDueDate}
                  onChange={(e) =>
                    setEditingFinancesProject({
                      ...editingFinancesProject,
                      paymentDueDate: e.target.value
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Invoice ID / Reference #</label>
                <input
                  type="text"
                  value={editingFinancesProject.paymentInvoiceId}
                  onChange={(e) =>
                    setEditingFinancesProject({
                      ...editingFinancesProject,
                      paymentInvoiceId: e.target.value
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0 p-6 sticky bottom-0 bg-slate-900/95 backdrop-blur-md z-10">
              <button
                type="button"
                onClick={() => setEditingFinancesProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProjectFinances}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Save Payment Details
              </button>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

        )
}
