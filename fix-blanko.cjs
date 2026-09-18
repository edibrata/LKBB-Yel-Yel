const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// The replacement logic:
// 1. Remove doc.text("Juri yang Menilai", 125, 30); doc.text(": .....................................", 155, 30);
// 2. Adjust autoTable startY from 46 to 40
// 3. Adjust signature logic:
//      - Change finalY offset from +15 to +8 to make it compact
//      - Change "Serang" to "Sukaresmi"
//      - Adjust spacing between Serang, Juri Penilai, and ( ........... )

content = content.replace(
  /doc\.text\("Juri yang Menilai", 125, 30\); doc\.text\(": \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.", 155, 30\);/g,
  ''
);

content = content.replace(
  /startY: 46,/g,
  'startY: 40,'
);

const newSignatureBlock = `        // Add signature box
        let finalY = ((doc as any).lastAutoTable?.finalY || 240) + 8; // Dikurangi dari 15 ke 8 agar lebih compact
        if (finalY > 260) {
          doc.addPage();
          finalY = 30;
        }
        doc.setFontSize(10);
        doc.text("Sukaresmi, ........................... 202...", 130, finalY); // Serang -> Sukaresmi
        doc.text("Juri Penilai,", 145, finalY + 4); // Jarak dikompres
        doc.text("( .......................................... )", 130, finalY + 16); // Jarak kurung ditarik ke atas`;

content = content.replace(
  /\/\/ Add signature box[\s\S]*?doc\.text\("\( \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. \)", 130, finalY \+ 25\);/g,
  newSignatureBlock
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
