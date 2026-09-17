const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /Total: \{pScore\.totalScore\}/g,
  `Total: {Number.isInteger(pScore.totalScore) ? pScore.totalScore : Number(pScore.totalScore).toFixed(2)}`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Modal decimals fixed.");
