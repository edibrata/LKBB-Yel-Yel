const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /juri1Total = pScores\[0\]\?\.finalScore \|\| pScores\[0\]\?\.totalScore \|\| 0;\n\s*if \(pScores\[1\]\) \{\n\s*juri2Total = pScores\[1\]\?\.finalScore \|\| pScores\[1\]\?\.totalScore \|\| 0;\n\s*\}/g,
  `const s1 = pScores.find(s => s.post === 1);
        const s2 = pScores.find(s => s.post === 2);
        
        juri1Total = s1?.finalScore || s1?.totalScore || 0;
        if (s2) {
          juri2Total = s2?.finalScore || s2?.totalScore || 0;
        }`
);

code = code.replace(
  /const raw1 = pScores\[0\]\?\.totalScore \|\| 0;\n\s*const raw2 = pScores\[1\] \? \(pScores\[1\]\?\.totalScore \|\| 0\) : raw1;/g,
  `const raw1 = s1?.totalScore || 0;
        const raw2 = s2 ? (s2?.totalScore || 0) : raw1;`
);

code = code.replace(
  /const t1 = pScores\[0\]\?\.timerSeconds \|\| 0;\n\s*const t2 = pScores\[1\]\?\.timerSeconds \|\| 0;/g,
  `const t1 = s1?.timerSeconds || 0;
        const t2 = s2?.timerSeconds || 0;`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
