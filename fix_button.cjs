const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

// The back button has className defined twice:
// className="text-slate-300 hover:text-white hover:bg-slate-700 shrink-0" 
// and className="shrink-0"

code = code.replace(/<Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700 shrink-0" onClick=\{\(\) => {([\s\S]*?)\}\} className="shrink-0">/gm, 
'<Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700 shrink-0" onClick={() => {$1}}>');

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
