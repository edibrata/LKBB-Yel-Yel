const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes("{activeMainTab === 'statistik' && ("));
const endIndex = lines.findIndex((l, idx) => idx > startIndex && l.includes("{activeMainTab === 'ekspor' && ("));

if (startIndex !== -1 && endIndex !== -1) {
  const before = lines.slice(0, startIndex);
  const after = lines.slice(endIndex);
  const newMiddle = [
    "      {activeMainTab === 'statistik' && (",
    "        <AuditEvaluasi participants={participants} scores={scores} appUsers={appUsers} />",
    "      )}"
  ];
  const newContent = [...before, ...newMiddle, ...after].join('\n');
  fs.writeFileSync('src/pages/AdminDashboard.tsx', newContent);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find bounds", startIndex, endIndex);
}
