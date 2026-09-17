const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// The issue is p.excessSeconds is set inside the map loop, but it mutates 'p' which might not persist properly or is masked.
// Let's pass excessSeconds explicitly in the return object of the map.
code = code.replace(
  /return \{\n\s*\.\.\.p,\n\s*juri1Total,\n\s*juri2Total,\n\s*totalPenalty,\n\s*grandTotal,\n\s*isDisqualified,\n\s*disqualificationReason\n\s*\};/g,
  `return { 
        ...p, 
        juri1Total, 
        juri2Total,
        totalPenalty,
        excessSeconds: excess,
        grandTotal,
        isDisqualified,
        disqualificationReason
      };`
);

// We also need to extract `excess` out of the if block so it's defined.
code = code.replace(
  /let totalPenalty = 0;\n\s*let grandTotal = 0;\n\s*let isDisqualified = false;\n\s*let disqualificationReason = '';\n\s*if \(pScores\.length > 0\) \{/g,
  `let totalPenalty = 0;
      let grandTotal = 0;
      let isDisqualified = false;
      let disqualificationReason = '';
      let excess = 0;
      
      if (pScores.length > 0) {`
);

code = code.replace(
  /const excess = Math\.max\(0, validTimer - 300\);\n\s*p\.excessSeconds = excess;/g,
  `excess = Math.max(0, validTimer - 300);`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Web penalty calculation fixed");
