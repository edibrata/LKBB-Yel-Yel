const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8').split('\n');
const idx = lines.findIndex(l => l.includes('Detail Nilai Peserta'));
if (idx !== -1) {
  console.log(lines.slice(idx - 20, idx + 20).join('\n'));
} else {
  console.log('Not found');
}
