const fs = require('fs');
let code = fs.readFileSync('src/components/VisualAgencyHub.tsx', 'utf-8');

const target = `                    <button
                      type="button"
                  >
                    <span>{showVisualCharts ? '📈 Hide Charts' : '📊 Show Charts'}</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer \${
                        viewMode === 'grid'
                          ? 'bg-slate-800 text-white font-bold shadow-sm'
                          : 'text-slate-300 font-medium hover:text-white'
                      }\`}
                    >
                      Grid Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('compact')}`;

const replacement = `                    <button
                      type="button"
                      onClick={() => setViewMode('compact')}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/VisualAgencyHub.tsx', code);
console.log('Fixed duplication');
