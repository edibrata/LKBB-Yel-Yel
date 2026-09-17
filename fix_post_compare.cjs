const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// In PDF logic
code = code.replace(
  /const p1 = detailScores\.find\(s => s\.post === 1\);/g,
  `const p1 = detailScores.find(s => Number(s.post) === 1);`
);
code = code.replace(
  /const p2 = detailScores\.find\(s => s\.post === 2\);/g,
  `const p2 = detailScores.find(s => Number(s.post) === 2);`
);

// In Web UI logic
code = code.replace(
  /const s1 = pScores\.find\(s => s\.post === 1\);/g,
  `const s1 = pScores.find(s => Number(s.post) === 1);`
);
code = code.replace(
  /const s2 = pScores\.find\(s => s\.post === 2\);/g,
  `const s2 = pScores.find(s => Number(s.post) === 2);`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
