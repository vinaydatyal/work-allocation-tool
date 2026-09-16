import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export default function TestModal() {
  return (
    <>{/* MODAL 4: Add New Team Member */}
      <AnimatePresence>
      {showAddMemberModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
            onClick={() => setShowAddMemberModal(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 pb-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md">
                  <h3 className="text-base font-extrabold text-white">Add New Team Member</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>



            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0 p-6 sticky bottom-0 bg-slate-900/95 backdrop-blur-md z-10">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateMember}
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20"
              >
                Add Team Member
              </button>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

        )
}
