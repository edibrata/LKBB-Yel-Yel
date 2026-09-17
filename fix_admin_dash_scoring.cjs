const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Replace the calculation logic for the main table
content = content.replace(/const s1 = pScores\.find\(s => Number\(s\.post\) === 1\);\s*const s2 = pScores\.find\(s => Number\(s\.post\) === 2\);\s*juri1Total = s1\?\.totalScore \|\| 0;\s*if \(s2\) \{\s*juri2Total = s2\?\.totalScore \|\| 0;\s*\}/, 
`
        // Calculate based on dynamic judges instead of fixed pos 1 and 2
        const validScores = pScores.filter(s => !s.isDisqualified);
        juri1Total = validScores[0]?.totalScore || 0;
        juri2Total = validScores[1]?.totalScore || 0;
`);

content = content.replace(/const raw1 = s1\?\.totalScore \|\| 0;\s*const raw2 = s2 \? \(s2\?\.totalScore \|\| 0\) : raw1;\s*const t1 = s1\?\.timerSeconds \|\| 0;\s*const t2 = s2\?\.timerSeconds \|\| 0;\s*let validTimer = 0;\s*if \(t1 > 0 && t2 > 0\) validTimer = Math\.min\(t1, t2\);\s*else if \(t1 > 0\) validTimer = t1;\s*else if \(t2 > 0\) validTimer = t2;\s*if \(validTimer > 300\) \{\s*let excess = validTimer - 300;\s*timePenalty = excess \* \(5 \/ 60\);\s*\}/, 
`
        const validTimer = Math.min(...pScores.map(s => s.timerSeconds || 0).filter(t => t > 0));
        if (validTimer > 300 && validTimer !== Infinity) {
          let excess = validTimer - 300;
          timePenalty = excess * (5 / 60);
        }
`);

content = content.replace(/const p1 = detailScores\.find\(s => Number\(s\.post\) === 1\);\s*const p2 = detailScores\.find\(s => Number\(s\.post\) === 2\);\s*const raw1 = p1\?\.totalScore \|\| 0;\s*const raw2 = p2 \? \(p2\?\.totalScore \|\| 0\) : raw1;\s*const t1 = p1\?\.timerSeconds \|\| 0;\s*const t2 = p2\?\.timerSeconds \|\| 0;\s*let validTimer = 0;\s*if \(t1 > 0 && t2 > 0\) validTimer = Math\.min\(t1, t2\);\s*else if \(t1 > 0\) validTimer = t1;\s*else if \(t2 > 0\) validTimer = t2;\s*if \(validTimer > 300\) \{\s*let excess = validTimer - 300;\s*timePenalty = excess \* \(5 \/ 60\);\s*\}/,
`
    const validTimer = Math.min(...detailScores.map(s => s.timerSeconds || 0).filter(t => t > 0));
    if (validTimer > 300 && validTimer !== Infinity) {
      timePenalty = (validTimer - 300) * (5 / 60);
    }
`);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
