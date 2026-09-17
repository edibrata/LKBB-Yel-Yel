const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /\{ content: p1Penalty > 0 \? \`-\$\{p1Penalty\}\` : '-', styles: \{ fontStyle: 'bold', halign: 'center', textColor: \[200,0,0\], fillColor: \[255, 240, 240\], cellPadding: 2 \} \},\n\s*\{ content: p2Penalty > 0 \? \`-\$\{p2Penalty\}\` : '-', styles: \{ fontStyle: 'bold', halign: 'center', textColor: \[200,0,0\], fillColor: \[255, 240, 240\], cellPadding: 2 \} \}/g,
  `{ content: totalPenalty > 0 ? \`-\${totalPenalty.toFixed(2)}\` : '-', styles: { fontStyle: 'bold', halign: 'center', textColor: [200,0,0], fillColor: [255, 240, 240], cellPadding: 2 } },
      { content: totalPenalty > 0 ? \`-\${totalPenalty.toFixed(2)}\` : '-', styles: { fontStyle: 'bold', halign: 'center', textColor: [200,0,0], fillColor: [255, 240, 240], cellPadding: 2 } }`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
