const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// Replace everything inside autoTable(doc, { ... }) to avoid duplicate properties
code = code.replace(
  /autoTable\(doc, \{[\s\S]*?margin: \{ left: 14, right: 14 \},\s*\}\);/m,
  `autoTable(doc, {
        startY: currentY,
        head: [['Aspek/Sub Aspek/Kriteria', 'Nilai']],
        body: [
          ...tableData,
          [{ content: \`Jumlah Nilai Juri \${post}\`, styles: { fontStyle: 'bold', halign: 'center', fillColor: catColor, cellPadding: 1.5 } }, { content: Number.isInteger(postTotal) ? postTotal : Number(postTotal).toFixed(2), styles: { fontStyle: 'bold', halign: 'center', fillColor: catColor, cellPadding: 1.5 } }]
        ],
        theme: 'grid',
        headStyles: { fillColor: catColor, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', cellPadding: 1.5 },
        styles: { textColor: [0, 0, 0], fontSize: 9.5, lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 1, minCellHeight: 6, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 155 },
          1: { cellWidth: 25, halign: 'center', valign: 'middle' }
        },
        margin: { left: 14, right: 14 },
      });`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("PDF duplicate styles fixed");
