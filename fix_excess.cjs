const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /let juri1Total = 0;\n\s*let juri2Total = 0;\n\s*let totalPenalty = 0;\n\s*let grandTotal = 0;\n\s*if \(pScores\.length > 0\) \{/g,
  `let juri1Total = 0;
      let juri2Total = 0;
      let totalPenalty = 0;
      let grandTotal = 0;
      let excess = 0;
      if (pScores.length > 0) {`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
