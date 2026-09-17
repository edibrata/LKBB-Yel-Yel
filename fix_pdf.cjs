const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// 1. Fix filename generation
code = code.replace(
  /const filename = \`\$\{participant\.number\}_\$\{participant\.name\}_Detail\.pdf\`\.replace\(\/\[\^a-zA-Z0-9-_\.\]\/g, '_'\);/g,
  `const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = \`\${now.getFullYear()}\${pad(now.getMonth() + 1)}\${pad(now.getDate())} \${pad(now.getHours())}.\${pad(now.getMinutes())}.\${pad(now.getSeconds())}\`;
      const cleanName = participant.name.replace(/[^a-zA-Z0-9 ]/g, '');
      const filename = \`LKBB dan Yel-Yel Nilai Rinci \${participant.number} \${participant.category} \${cleanName} \${timeStr}.pdf\`;`
);

// 2. Fix the numbering in pdfGroups loop
code = code.replace(
  /\{ content: \`\$\{index \+ 1\}\. \$\{crit\.name\}\\n    \$\{crit\.desc\}\`, styles: \{ cellPadding: \{ left: 5, top: 1, bottom: 1, right: 1\.5 \} \} \}/g,
  `{ content: \`\${groupCriteria.length > 1 ? (index + 1) + '. ' : ''}\${crit.name}\\n \${crit.desc}\`, styles: { cellPadding: { left: 5, top: 1, bottom: 1, right: 1.5 } } }`
);

// 3. Fix the footer logic in generateDetailPDF
// Replace the old doc.save logic and add footer inside generateDetailPDF
code = code.replace(
  /if \(autoDownload\) \{\n\s*const now = new Date\(\);\n\s*const pad = \(n: number\) => String\(n\)\.padStart\(2, '0'\);\n\s*const timeStr = \`\$\{now\.getFullYear\(\)\}\$\{pad\(now\.getMonth\(\) \+ 1\)\}\$\{pad\(now\.getDate\(\)\)} \$\{pad\(now\.getHours\(\)\)\}\.\$\{pad\(now\.getMinutes\(\)\)\}\.\$\{pad\(now\.getSeconds\(\)\)\}\`;\n\s*const cleanName = participant\.name\.replace\(\/\[\^a-zA-Z0-9 \]\/g, ''\);\n\s*const filename = \`LKBB dan Yel-Yel Nilai Rinci \$\{participant\.number\} \$\{participant\.category\} \$\{cleanName\} \$\{timeStr\}\.pdf\`;\n\s*doc\.save\(filename\);\n\s*\}/g,
  `// DRAW FOOTNOTE
    let finalY = (doc as any).autoTable.previous.finalY || currentY;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("*Catatan: Nilai Penalti Waktu diambil dari pencatatan timer juri yang terkecil/tercepat (Benefit of the Doubt).", 14, finalY + 5);
    doc.setTextColor(0, 0, 0);

    // DRAW FOOTER ON ALL PAGES FOR THIS PARTICIPANT
    const endPage = (doc as any).internal.getNumberOfPages();
    for (let i = startPage; i <= endPage; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      const y = pageHeight - 15;
      
      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(14, y - 4, 196, y - 4);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 120, 120);
      
      // Left text
      doc.text(\`Nilai Akhir Gabungan \${participant.category}\`, 14, y);
      
      // Center text
      doc.text(\`Hal. \${i - startPage + 1} dari \${endPage - startPage + 1}\`, 105, y, { align: 'center' });
      
      // Right text
      doc.text(\`\${participant.number} \${participant.name}\`, 196, y, { align: 'right' });
    }
    
    doc.setTextColor(0, 0, 0); // reset color
    
    if (autoDownload) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = \`\${now.getFullYear()}\${pad(now.getMonth() + 1)}\${pad(now.getDate())} \${pad(now.getHours())}.\${pad(now.getMinutes())}.\${pad(now.getSeconds())}\`;
      const cleanName = participant.name.replace(/[^a-zA-Z0-9 ]/g, '');
      const filename = \`LKBB dan Yel-Yel Nilai Rinci \${participant.number} \${participant.category} \${cleanName} \${timeStr}.pdf\`;
      doc.save(filename);
    }`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
