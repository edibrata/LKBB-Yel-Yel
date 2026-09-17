const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8').split('\n');

const startIndex = lines.findIndex(l => l.includes("{activeMainTab === 'users' && ("));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes("<CardHeader>"));
console.log(startIndex + 1, endIndex + 1);
