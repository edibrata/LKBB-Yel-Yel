const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

const regex = /<div className="flex flex-col space-y-1\.5">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/m;
const replacement = `                        <div className="flex flex-col space-y-2 mt-2">
                          {(criteria as any).rubrics?.map((rubric: any) => (
                            <button
                              key={rubric.score}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScoreChange(criteria.id, rubric.score);
                              }}
                              className={\`text-left p-3 rounded-lg border transition-all flex gap-3 \${
                                currentScore === rubric.score 
                                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' 
                                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                              }\`}
                            >
                              <div className={\`flex items-center justify-center w-8 h-8 rounded-full font-bold flex-shrink-0 text-sm \${
                                currentScore === rubric.score ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                              }\`}>
                                {rubric.score}
                              </div>
                              <span className={\`text-sm \${currentScore === rubric.score ? 'text-blue-900 font-medium' : 'text-slate-600'}\`}>
                                {rubric.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
