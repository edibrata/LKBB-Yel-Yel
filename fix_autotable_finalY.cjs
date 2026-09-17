const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /let finalY = \(doc as any\)\.autoTable\.previous\.finalY \|\| currentY;/g,
  `let finalY = (doc as any).lastAutoTable?.finalY || currentY;`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
