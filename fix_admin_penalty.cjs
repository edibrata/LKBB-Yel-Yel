const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// The penalty calculation in groupedScores map:
// const p1Penalty = pScores[0]?.timePenalty || 0;
// const p2Penalty = pScores[1]?.timePenalty || 0;
// Let's add extraction of excessSeconds.
code = code.replace(
  /const p1Penalty = pScores\[0\]\?\.timePenalty \|\| 0;\n\s*const p2Penalty = pScores\[1\]\?\.timePenalty \|\| 0;/g,
  `const p1Penalty = pScores[0]?.timePenalty || 0;
        const p2Penalty = pScores[1]?.timePenalty || 0;
        const p1Excess = Math.max(0, (pScores[0]?.timerSeconds || 0) - 300);
        const p2Excess = Math.max(0, (pScores[1]?.timerSeconds || 0) - 300);
        const maxExcess = Math.max(p1Excess, p2Excess);
        p.excessSeconds = maxExcess;`
);

// Display in table:
// {p.totalPenalty > 0 ? ( <Badge ... > {Number...} pt </Badge> ) : <span className="text-slate-300">-</span>}
code = code.replace(
  /\{p\.totalPenalty > 0 \? \(\s*<Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 px-1\.5 py-0">\s*\{Number\.isInteger\(p\.totalPenalty\) \? p\.totalPenalty \: Number\(p\.totalPenalty\)\.toFixed\(2\)\} pt\s*<\/Badge>\s*\) : <span className="text-slate-300">-<\/span>\}/g,
  `{p.totalPenalty > 0 ? (
                                <div className="flex flex-col items-center group relative">
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 px-1.5 py-0 cursor-help">
                                    -{Number.isInteger(p.totalPenalty) ? p.totalPenalty : Number(p.totalPenalty).toFixed(2)} pt
                                  </Badge>
                                  <span className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm z-10">
                                    Lebih {p.excessSeconds} dtk
                                  </span>
                                </div>
                              ) : p.juri1Total > 0 || p.juri2Total > 0 ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 px-1.5 py-0 font-normal">
                                  Aman
                                </Badge>
                              ) : <span className="text-slate-300">-</span>}`
);

// Display in PDF:
code = code.replace(
  /const p1Penalty = p1\?\.timePenalty \|\| 0;\n\s*const p2Penalty = p2\?\.timePenalty \|\| 0;/g,
  `const p1Penalty = p1?.timePenalty || 0;
    const p2Penalty = p2?.timePenalty || 0;
    const p1Excess = Math.max(0, (p1?.timerSeconds || 0) - 300);
    const p2Excess = Math.max(0, (p2?.timerSeconds || 0) - 300);
    const maxExcess = Math.max(p1Excess, p2Excess);`
);

// Table in PDF:
// { content: 'Penalti Waktu', styles: ... },
code = code.replace(
  /\{\s*content\:\s*'Penalti Waktu',\s*styles\:\s*\{\s*fontStyle\:\s*'bold',\s*halign\:\s*'right',\s*fillColor\:\s*\[255,\s*240,\s*240\],\s*cellPadding\:\s*2\s*\}\s*\}/g,
  `{ content: maxExcess > 0 ? \`Penalti Waktu (Kelebihan: \${maxExcess} dtk)\` : 'Penalti Waktu (Aman/Tepat Waktu)', styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 240, 240], cellPadding: 2 } }`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Admin penalty display fixed.");
