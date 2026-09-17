const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

const regex = /<div className="flex flex-col min-w-0">\s*<div className="flex items-center gap-1\.5">\s*<Badge className="px-1\.5 py-0 text-\[10px\] sm:text-xs bg-blue-600 hover:bg-blue-700">\{participant\?\.number \|\| '\.\.\.'\}<\/Badge>\s*<span className="text-xs sm:text-sm font-bold text-white truncate max-w-\[80px\] sm:max-w-\[120px\]">\{participant\?\.name \|\| 'Loading'\}<\/span>\s*<\/div>\s*<p className="text-\[9px\] sm:text-\[10px\] text-slate-400 truncate">\{participant\?\.category\} • Juri \{post\}<\/p>\s*<\/div>/m;

const newHeaderBlock = `<div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <Badge className="px-2 py-0.5 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700">
                  {participant?.number || '...'}
                </Badge>
                <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                  {participant?.category}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Pos Penilaian Juri {post}</p>
            </div>`;

code = code.replace(regex, newHeaderBlock);
fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
