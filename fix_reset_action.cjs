const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// The issue is that `p` object in the render loop doesn't have `pScores`.
// It only has juri1Total, juri2Total, etc.
// In the reset handler, we are checking `!participantToReset.pScores` which will fail and return early.
// We need to fetch the scores directly from the main `scores` array using the participantToReset.id

code = code.replace(
  /if \(\!participantToReset \|\| \!participantToReset\.pScores\) return;/,
  `if (!participantToReset) return;`
);

code = code.replace(
  /const scoresToDelete = posToReset === 'all' \s*\n\s*\? participantToReset\.pScores\s*\n\s*\: participantToReset\.pScores\.filter\(\(score\: any\) => score\.post === posToReset\);/,
  `const pScores = scores.filter(s => s.participantId === participantToReset.id);
      const scoresToDelete = posToReset === 'all' 
        ? pScores 
        : pScores.filter((score: any) => score.post === posToReset);`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Reset action fixed.");
