const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const oldCode = `            top3.forEach((p, idx) => {
              juaraData.push([
                idx === 0 ? { content: catCounter, rowSpan: top3.length, styles: { halign: 'center', valign: 'middle' } } : '',
                idx === 0 ? { content: category, rowSpan: top3.length, styles: { valign: 'middle' } } : '',
                p.rank === 1 ? 'I' : p.rank === 2 ? 'II' : p.rank === 3 ? 'III' : p.rank,
                Number.isInteger(p.grandTotal) ? p.grandTotal : p.grandTotal.toFixed(2),
                p.number,
                p.name
              ]);
            });`;

const newCode = `            top3.forEach((p, idx) => {
              const r = parseInt(p.rank.toString());
              const rankStr = r === 1 ? 'I' : r === 2 ? 'II' : r === 3 ? 'III' : p.rank;
              const nilaiStr = Number.isInteger(p.grandTotal) ? p.grandTotal : p.grandTotal.toFixed(2);
              
              if (idx === 0) {
                juaraData.push([
                  { content: catCounter, rowSpan: top3.length, styles: { halign: 'center', valign: 'middle' } },
                  { content: category, rowSpan: top3.length, styles: { valign: 'middle' } },
                  rankStr,
                  nilaiStr,
                  p.number,
                  p.name
                ]);
              } else {
                juaraData.push([
                  rankStr,
                  nilaiStr,
                  p.number,
                  p.name
                ]);
              }
            });`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
  console.log('Successfully patched rowSpan issue!');
} else {
  console.log('Could not find the exact code block to replace.');
}
