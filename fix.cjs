const fs = require('fs');
let code = fs.readFileSync('src/components/VisualAgencyHub.tsx', 'utf-8');
let lines = code.split('\n');
lines.splice(2688, 3, 
'                    <button',
'                      type="button"',
'                      disabled={currentPage >= totalPages}',
'                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}',
'                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"',
'                    >',
'                      <span className="hidden sm:inline">Next</span>',
'                      <ChevronRight className="w-4 h-4" />',
'                    </button>',
'                  </div>',
'                )}',
'              </div>',
'            </div>'
);
fs.writeFileSync('src/components/VisualAgencyHub.tsx', lines.join('\n'));
