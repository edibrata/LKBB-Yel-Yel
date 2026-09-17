const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// The issue: the mapped object DOES NOT return excessSeconds anymore!
// In the previous step I accidentally replaced the return block and dropped excessSeconds: excess.
// Let's put it back.

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

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
