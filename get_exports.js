const fs = require('fs');
const code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const startIndex1 = code.indexOf('const exportBeritaAcara = () => {');
const startIndex2 = code.indexOf('const exportRekapNilai = () => {');

console.log("exportBeritaAcara starts at:", startIndex1);
console.log("exportRekapNilai starts at:", startIndex2);
