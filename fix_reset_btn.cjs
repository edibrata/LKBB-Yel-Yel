const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /if \(p\.juri1Total > 0 \|\| p\.juri2Total > 0 \|\| p\.isDisqualified\) \{/g,
  `if (scores.some(s => s.participantId === p.id)) {`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Reset btn condition fixed.");
