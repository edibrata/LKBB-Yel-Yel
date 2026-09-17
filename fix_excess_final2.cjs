const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// The regex failed because I didn't escape it properly. Let's do it manually with a string replace.

const target = `return { 
        ...p, 
        juri1Total, 
        juri2Total,
        totalPenalty,
        grandTotal,
        isDisqualified,
        disqualificationReason
      };`;

const replacement = `return { 
        ...p, 
        juri1Total, 
        juri2Total,
        totalPenalty,
        excessSeconds: excess,
        grandTotal,
        isDisqualified,
        disqualificationReason
      };`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
