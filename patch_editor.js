const fs = require('fs');
let file = fs.readFileSync('apps/steward/src/components/RuleEditor.tsx', 'utf8');

const target = '            {/* Box 1: Fix Music Grouping */}';
const newBox = `            {/* Box 1.5: Diagnostic Logging */}
            <label className="flex flex-col p-3 bg-[#1E232E] border border-slate-700/30 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors h-auto min-h-[7rem] justify-between">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="toggle-diagnostic-logging"
                  checked={rules.diagnosticLoggingEnabled === true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onRulesChange({ ...rules, diagnosticLoggingEnabled: checked });
                    localStorage.setItem("bitscribe_diagnostic_logging", checked ? "true" : "false");
                  }}
                  className="mt-0.5 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-300">Diagnostic Logging</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 leading-relaxed mt-1 block">
                Capture deep application logs to the Export Directory for troubleshooting.
              </span>
            </label>
`;

file = file.replace(target, target + '\\n' + newBox);
fs.writeFileSync('apps/steward/src/components/RuleEditor.tsx', file);
