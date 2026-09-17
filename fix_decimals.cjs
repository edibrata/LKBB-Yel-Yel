const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /\{p\.juri1Total\} pt/g,
  `{Number.isInteger(p.juri1Total) ? p.juri1Total : Number(p.juri1Total).toFixed(2)} pt`
);

code = code.replace(
  /\{p\.juri2Total\} pt/g,
  `{Number.isInteger(p.juri2Total) ? p.juri2Total : Number(p.juri2Total).toFixed(2)} pt`
);

code = code.replace(
  /\{p\.totalPenalty\} pt/g,
  `{Number.isInteger(p.totalPenalty) ? p.totalPenalty : Number(p.totalPenalty).toFixed(2)} pt`
);

code = code.replace(
  /: p\.grandTotal\}/g,
  `: Number.isInteger(p.grandTotal) ? p.grandTotal : Number(p.grandTotal).toFixed(2)}`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Decimals fixed in UI.");
