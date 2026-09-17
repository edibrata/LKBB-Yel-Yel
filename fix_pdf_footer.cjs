const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// The request is to change "Nilai Akhir Gabungan SD Putra" in the PDF footer to "YYYYMMDD HH.MM.SS".
// The existing string is `Nilai Akhir Gabungan ${participant.category}`
code = code.replace(
  /doc\.text\(\`Nilai Akhir Gabungan \$\{participant\.category\}\`, 14, y\);/g,
  `const nowF = new Date();
      const padF = (n: number) => String(n).padStart(2, '0');
      const timeStrF = \`\${nowF.getFullYear()}\${padF(nowF.getMonth() + 1)}\${padF(nowF.getDate())} \${padF(nowF.getHours())}.\${padF(nowF.getMinutes())}.\${padF(nowF.getSeconds())}\`;
      doc.text(timeStrF, 14, y);`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
