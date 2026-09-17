const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const regex = /let excess = 0;\s*if \(pScores\.length > 0\) \{[\s\S]*?grandTotal = avgRaw - totalPenalty;\s*\}/;

const replacement = `let excess = 0;
      if (pScores.length > 0) {
        const validScores = pScores.filter((s:any) => !s.isDisqualified);
        const s1 = validScores[0];
        const s2 = validScores[1];

        juri1Total = s1?.totalScore || 0;
        if (s2) {
          juri2Total = s2?.totalScore || 0;
        }

        const raw1 = s1?.totalScore || 0;
        const raw2 = s2?.totalScore || 0;

        let validTimer = 0;
        const timers = validScores.map((s:any) => s.timerSeconds || 0).filter((t:number) => t > 0);
        if (timers.length > 0) validTimer = Math.min(...timers);
        
        excess = Math.max(0, validTimer - 300);
        totalPenalty = excess * (5 / 60);

        let avgRaw = 0;
        if (s1 && s2) {
           avgRaw = raw1 + raw2; 
        } else if (s1) {
           avgRaw = raw1;
        } else if (s2) {
           avgRaw = raw2;
        }
        
        grandTotal = avgRaw - totalPenalty;
      }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
