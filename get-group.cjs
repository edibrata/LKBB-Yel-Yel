const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const match = content.match(/const groupedScores = CATEGORIES\.map[\s\S]*?(?=\/\/ Build leaderboards)/);
if (match) {
  fs.writeFileSync('group_fn.txt', match[0]);
  console.log('Function saved to group_fn.txt');
} else {
  console.log('Function not found');
}
