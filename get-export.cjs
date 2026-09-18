const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const match = content.match(/const exportHasilLomba = async \(\) => \{[\s\S]*?(?=const exportToXLSX = async \(\) => \{)/);
if (match) {
  fs.writeFileSync('export_fn.txt', match[0]);
  console.log('Function saved to export_fn.txt');
} else {
  console.log('Function not found');
}
