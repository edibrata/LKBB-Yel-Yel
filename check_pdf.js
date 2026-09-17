const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8').split('\n');
const startIdx = lines.findIndex(l => l.includes('const generateDetailPDF'));
if (startIdx !== -1) {
  let endIdx = startIdx;
  let braceCount = 0;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    if (braceCount === 0 && i > startIdx) {
      endIdx = i;
      break;
    }
  }
  console.log(lines.slice(startIdx, endIdx + 1).join('\n'));
}
