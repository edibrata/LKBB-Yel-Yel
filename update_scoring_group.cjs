const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

const regex = /\{Object\.entries\([\s\S]*?as Record<string, typeof criteriaList>\)\s*\)\.map\(\(\[aspectName, aspectCriteria\]\) => \(/m;

const newGrouping = `{Object.entries(
            criteriaList.reduce((acc, criteria) => {
              // Gunakan aspectName resmi dari struktur baru jika ada, atau fallback kapitalisasi
              const aspectName = (criteria as any).aspectName || 
                (criteria.id.split('_')[0].charAt(0).toUpperCase() + criteria.id.split('_')[0].slice(1));
                
              if (!acc[aspectName]) acc[aspectName] = [];
              acc[aspectName].push(criteria);
              return acc;
            }, {} as Record<string, typeof criteriaList>)
          ).map(([aspectName, aspectCriteria]) => (`;

if(code.match(regex)) {
    code = code.replace(regex, newGrouping);
    fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
    console.log("Grouping logic updated successfully.");
} else {
    console.log("Could not find grouping logic block.");
}
