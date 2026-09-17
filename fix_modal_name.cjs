const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

code = code.replace(
  /Peserta <strong>\{participant\?\.name\}<\/strong>\./,
  `Peserta <strong>No. {participant?.number}</strong>.`
);

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
console.log("Modal name fixed.");
