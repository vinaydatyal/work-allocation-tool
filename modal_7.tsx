import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export default function TestModal() {
  return (
    <>{/* MODAL 7: ClickUp API v2 Integration & Live Sync Drawer */}
      <AnimatePresence>
      {showClickUpModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
            onClick={() => setShowClickUpModal(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <span className="text-lg font-black text-purple-300">⚡</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ClickUp API v2 Integration &amp; Live Sync</h3>
                  <p className="text-xs text-slate-400">
                    Connect Workspaces, Lists, Tasks &amp; Estimated Hours bi-directionally with ClickUp
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowClickUpModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6 text-xs">
              {/* Architecture & Mapping Overview */}
              <div className="p-4 rounded-2xl bg-purple-950/25 border border-purple-500/30 space-y-2">
                <h4 className="font-black text-purple-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>🗺️ ClickUp Entity Mapping Architecture</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-purple-400 font-bold block">ClickUp Workspace &amp; Space</span>
                    <span className="text-slate-400">Maps to Agency Hub Workspace</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block">ClickUp Lists / Folders</span>
                    <span className="text-slate-400">Maps to Active Projects</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-emerald-400 font-bold block">ClickUp Tasks &amp; Time Estimates</span>
                    <span className="text-slate-400">Maps to Deliverable Tasks &amp; Weekly Hours</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-pink-400 font-bold block">ClickUp Assignees</span>
                    <span className="text-slate-400">Maps to Squad Team Members</span>
                  </div>
                </div>
              </div>

              {/* API Token Input Section */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300 block">
                  ClickUp Personal API Token (starts with <code className="text-purple-300">pk_</code>)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={clickUpApiToken}
                    onChange={(e) => setClickUpApiToken(e.target.value)}
                    placeholder="pk_12345678_ABCD... (Leave blank to use Simulated Demo Mode)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Generate your token in ClickUp Settings → Apps → API Token. Without a token, clicking sync runs Simulated Live Enrichment mode.
                </p>
              </div>

              {/* Sync Status / Error Banner */}
              {clickUpError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold flex items-center justify-between">
                  <span>❌ {clickUpError}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-rose-500/20">Error</span>
                </div>
              )}

              {clickUpLastSync && !clickUpError && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold flex items-center justify-between">
                  <span>✅ Last Synchronized with ClickUp Workspace at {clickUpLastSync}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/20">Synced</span>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowClickUpModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer text-xs"
              >
                Close
              </button>

              <button
                type="button"
                disabled={clickUpSyncStatus === 'syncing'}
                onClick={handleRunClickUpSync}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {clickUpSyncStatus === 'syncing' ? (
                  <span>Syncing with ClickUp API...</span>
                ) : (
                  <span>⚡ Run ClickUp Deliverables &amp; Time Sync</span>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

        )
}
