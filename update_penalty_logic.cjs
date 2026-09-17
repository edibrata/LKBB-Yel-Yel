const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// 1. Ganti Math.max menjadi Math.min di groupedScores (Baris ~1100+)
// Dan ubah rumus akhir menjadi rata-rata murni - penalti terkecil
code = code.replace(
  /const p1Penalty = pScores\[0\]\?\.timePenalty \|\| 0;\n\s*const p2Penalty = pScores\[1\]\?\.timePenalty \|\| 0;\n\s*const p1Excess = Math\.max\(0, \(pScores\[0\]\?\.timerSeconds \|\| 0\) \- 300\);\n\s*const p2Excess = Math\.max\(0, \(pScores\[1\]\?\.timerSeconds \|\| 0\) \- 300\);\n\s*const maxExcess = Math\.max\(p1Excess, p2Excess\);\n\s*p\.excessSeconds = maxExcess;\n\s*totalPenalty = Math\.max\(p1Penalty, p2Penalty\);\n\s*\/\/ Final score: average of raw scores - max penalty\n\s*const raw1 = \(pScores\[0\]\?\.finalScore \|\| pScores\[0\]\?\.totalScore \|\| 0\) \+ p1Penalty;\n\s*const raw2 = pScores\[1\] \? \(\(pScores\[1\]\?\.finalScore \|\| pScores\[1\]\?\.totalScore \|\| 0\) \+ p2Penalty\) : raw1;\n\s*const avgRaw = \(raw1 \+ raw2\) \/ 2;\n\s*grandTotal = avgRaw \- totalPenalty;/g,
  `const raw1 = pScores[0]?.totalScore || 0;
        const raw2 = pScores[1] ? (pScores[1]?.totalScore || 0) : raw1;
        
        // Ambil waktu terkecil yang lebih dari 0 untuk penalti (kecuali dua-duanya 0)
        const t1 = pScores[0]?.timerSeconds || 0;
        const t2 = pScores[1]?.timerSeconds || 0;
        let validTimer = 0;
        
        if (t1 > 0 && t2 > 0) {
          validTimer = Math.min(t1, t2);
        } else if (t1 > 0) {
          validTimer = t1;
        } else if (t2 > 0) {
          validTimer = t2;
        }
        
        const excess = Math.max(0, validTimer - 300);
        p.excessSeconds = excess;
        totalPenalty = excess * (5 / 60);
        
        const avgRaw = (raw1 + raw2) / 2;
        grandTotal = avgRaw - totalPenalty;`
);

// 2. Ganti tooltip Pop up untuk memunculkan detail "Diambil dari waktu tercepat"
code = code.replace(
  /<span className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-slate-800 text-white text-\[10px\] px-2 py-1 rounded shadow-sm z-10">\n\s*Lebih \{p\.excessSeconds\} dtk\n\s*<\/span>/g,
  `<span className="absolute bottom-full mb-1 hidden group-hover:block w-max max-w-[200px] text-center bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm z-10">
                                    Potongan -{Number(p.totalPenalty).toFixed(2)} pt<br/>(Lebih {p.excessSeconds} dtk)<br/><span className="text-[8px] text-slate-300">Berdasarkan waktu terkecil Juri</span>
                                  </span>`
);

// 3. Pastikan format angka 2 desimal di Dashboard
code = code.replace(
  /\{Number\.isInteger\(p\.juri1Total\) \? p\.juri1Total : Number\(p\.juri1Total\)\.toFixed\(2\)\}/g,
  `{Number(p.juri1Total).toFixed(2)}`
);
code = code.replace(
  /\{Number\.isInteger\(p\.juri2Total\) \? p\.juri2Total : Number\(p\.juri2Total\)\.toFixed\(2\)\}/g,
  `{Number(p.juri2Total).toFixed(2)}`
);
code = code.replace(
  /\{Number\.isInteger\(p\.grandTotal\) \? p\.grandTotal : Number\(p\.grandTotal\)\.toFixed\(2\)\}/g,
  `{Number(p.grandTotal).toFixed(2)}`
);
code = code.replace(
  /\{Number\.isInteger\(p\.totalPenalty\) \? p\.totalPenalty : Number\(p\.totalPenalty\)\.toFixed\(2\)\}/g,
  `{Number(p.totalPenalty).toFixed(2)}`
);

// 4. Update PDF generation variables (Baris ~400)
code = code.replace(
  /const p1Penalty = p1\?\.timePenalty \|\| 0;\n\s*const p2Penalty = p2\?\.timePenalty \|\| 0;\n\s*const p1Excess = Math\.max\(0, \(p1\?\.timerSeconds \|\| 0\) \- 300\);\n\s*const p2Excess = Math\.max\(0, \(p2\?\.timerSeconds \|\| 0\) \- 300\);\n\s*const maxExcess = Math\.max\(p1Excess, p2Excess\);\n\s*const totalPenalty = Math\.max\(p1Penalty, p2Penalty\);\n\s*const raw1 = \(p1\?\.finalScore \|\| p1\?\.totalScore \|\| 0\) \+ p1Penalty;\n\s*const raw2 = p2 \? \(\(p2\?\.finalScore \|\| p2\?\.totalScore \|\| 0\) \+ p2Penalty\) : raw1;\n\s*const avgRaw = p2 \? \(raw1 \+ raw2\) \/ 2 : raw1;\n\s*const grandTotal = avgRaw \- totalPenalty;/g,
  `const raw1 = p1?.totalScore || 0;
    const raw2 = p2 ? (p2?.totalScore || 0) : raw1;
    
    const t1 = p1?.timerSeconds || 0;
    const t2 = p2?.timerSeconds || 0;
    let validTimer = 0;
    if (t1 > 0 && t2 > 0) validTimer = Math.min(t1, t2);
    else if (t1 > 0) validTimer = t1;
    else if (t2 > 0) validTimer = t2;
    
    const maxExcess = Math.max(0, validTimer - 300);
    const totalPenalty = maxExcess * (5 / 60);
    
    const avgRaw = p2 ? (raw1 + raw2) / 2 : raw1;
    const grandTotal = avgRaw - totalPenalty;`
);

// 5. Update PDF Final Value format
code = code.replace(
  /doc\.text\(grandTotal\.toFixed\(2\), 170, currentY \+ 6, \{ align: 'right' \}\);/g,
  `doc.text(grandTotal.toFixed(2), 170, currentY + 6, { align: 'right' });`
);

// 6. Update PDF Footer/Footnote
code = code.replace(
  /doc\.text\(\`Dicetak pada: \$\{new Date\(\)\.toLocaleString\('id-ID'\)\}\`, 14, 285\);/g,
  `doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("*Catatan: Nilai Penalti Waktu diambil dari pencatatan timer juri yang terkecil/tercepat (Benefit of the Doubt).", 14, 280);
    doc.text(\`Dicetak pada: \${new Date().toLocaleString('id-ID')}\`, 14, 285);
    doc.setTextColor(0, 0, 0);`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Updated AdminDashboard with Alternatif 1 and decimal formatting.");
