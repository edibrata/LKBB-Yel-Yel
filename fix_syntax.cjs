const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');
const badHeaderRegex = /<div className="flex flex-wrap items-center gap-1\.5 mt-1">[\s\S]*?<\/div>\s*<\/div>/m;
code = code.replace(badHeaderRegex, '');
fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
