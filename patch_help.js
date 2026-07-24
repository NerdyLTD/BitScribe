const fs = require('fs');
const content = fs.readFileSync('apps/steward/src/components/HelpSection.tsx', 'utf8');

const target1 = `<strong className="text-emerald-400 font-semibold">300 combined hours</strong>`;
const replacement1 = `<strong className="text-emerald-400 font-semibold">400+ combined hours</strong>`;

const target2 = `          {/* Open Source Acknowledgments */}
          <div id="oss-section" className="space-y-2 p-3 rounded-xl bg-slate-900/30 border border-[#1e232e] transition-all duration-300">
            <h4 className="text-xs font-bold text-slate-200">Open Source Acknowledgments</h4>`;

const replacement2 = `          {/* Open Source Acknowledgments */}
          <div id="oss-section" className="space-y-2 p-3 rounded-xl bg-slate-900/30 border border-[#1e232e] transition-all duration-300">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-200">Open Source Acknowledgments</h4>
              <button 
                onClick={() => {
                  const el = document.getElementById('license-modal');
                  if (el) el.classList.toggle('hidden');
                }}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold"
              >
                View Apache 2.0 License
              </button>
            </div>
            
            <div id="license-modal" className="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-[#14171F] border border-blue-500/30 p-6 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-200">Apache 2.0 License</h3>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('license-modal');
                      if (el) el.classList.add('hidden');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="overflow-y-auto text-xs text-slate-400 font-mono whitespace-pre-wrap flex-1 pr-4 custom-scrollbar">
                  {/* We will fetch the license via a separate step, but we can hardcode the generic text or leave a note */}
                  {"Licensed under the Apache License, Version 2.0 (the \\"License\\");\\nyou may not use this file except in compliance with the License.\\nYou may obtain a copy of the License at\\n\\n    http://www.apache.org/licenses/LICENSE-2.0\\n\\nUnless required by applicable law or agreed to in writing, software\\ndistributed under the License is distributed on an \\"AS IS\\" BASIS,\\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\\nSee the License for the specific language governing permissions and\\nlimitations under the License."}
                </div>
              </div>
            </div>`;

let newContent = content.replace(target1, replacement1);
if (newContent.includes(target2)) {
  newContent = newContent.replace(target2, replacement2);
  fs.writeFileSync('apps/steward/src/components/HelpSection.tsx', newContent);
  console.log("Patched HelpSection.tsx");
} else {
  console.log("Could not find target block for OSS replacement");
}
