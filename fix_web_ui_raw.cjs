const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /juri1Total = s1\?\.finalScore \|\| s1\?\.totalScore \|\| 0;\n\s*if \(s2\) \{\n\s*juri2Total = s2\?\.finalScore \|\| s2\?\.totalScore \|\| 0;\n\s*\}/g,
  `juri1Total = s1?.totalScore || 0;
        if (s2) {
          juri2Total = s2?.totalScore || 0;
        }`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
