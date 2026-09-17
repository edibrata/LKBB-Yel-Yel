const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('const generateDetailPDF = (participant: any, detailScores: ScoreRecord[], autoDownload = true, docParam?: jsPDF) => {'));
const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.includes('  };;;'));

const newGeneratePdf = `
  const generateDetailPDF = (participant: any, detailScores: ScoreRecord[], autoDownload = true, docParam?: jsPDF) => {
    const doc = docParam || new jsPDF('p', 'mm', 'a4');
    
    const validScores = detailScores.filter(s => !s.isDisqualified);
    const s1 = validScores[0];
    const s2 = validScores[1];

    let validTimer = 0;
    const timers = validScores.map(s => s.timerSeconds || 0).filter(t => t > 0);
    if (timers.length > 0) validTimer = Math.min(...timers);
    
    const maxExcess = Math.max(0, validTimer - 300);
    const totalPenalty = maxExcess * (5 / 60);

    const raw1 = s1?.totalScore || 0;
    const raw2 = s2?.totalScore || 0;
    
    let avgRaw = 0;
    if (s1 && s2) {
       avgRaw = raw1 + raw2; // sum actually
    } else if (s1) {
       avgRaw = raw1;
    } else if (s2) {
       avgRaw = raw2;
    }
    const grandTotal = avgRaw - totalPenalty;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NILAI LKBB DAN YEL-YEL", 105, 15, { align: 'center' });
    
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "normal");
    
    doc.text("Kategori", 14, 23); doc.text(\`: \${participant.category}\`, 45, 23);
    doc.text("Nomor Peserta", 14, 28); doc.text(\`: \${participant.number}\`, 45, 28);
    doc.text("Nama Regu", 14, 33); doc.text(\`: \${participant.name}\`, 45, 33);
    doc.text("Nilai Akhir", 14, 38); doc.text(\`: \${Number.isInteger(grandTotal) ? grandTotal : Number(grandTotal).toFixed(2)}\`, 45, 38);

    let currentY = 44;
    
    const pdfGroups = [
      { title: "A. Kerapihan (10%)", prefix: "kerapihan_" },
      { title: "B. Gerakan di Tempat dan Berpindah Tempat (40%)", prefix: "gerakan_" },
      { title: "C. Gerakan Variasi, Formasi dan Yel-Yel (40%)", prefix: "variasi_" },
      { title: "D. Ketepatan Waktu (10%)", prefix: "waktu_" }
    ];

    const criteriaDef = FLAT_CRITERIA;
    if (!criteriaDef) return;

    if (detailScores.some(s => s.isDisqualified)) {
       doc.setFont("helvetica", "bold");
       doc.setTextColor(255, 0, 0);
       doc.text(\`STATUS: DISKUALIFIKASI\`, 14, currentY);
       doc.setTextColor(0, 0, 0);
       currentY += 10;
    }

    const tableData: any[] = [];
    
    pdfGroups.forEach(group => {
      tableData.push([
        { content: group.title, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], cellPadding: 2 } }
      ]);
      const groupCriteria = criteriaDef.filter((c: any) => c.id.startsWith(group.prefix));
      groupCriteria.forEach((crit: any, index: number) => {
        tableData.push([
          { content: \`\${groupCriteria.length > 1 ? (index + 1) + '. ' : ''}\${crit.name}\\n \${crit.desc}\`, styles: { cellPadding: { left: 5, top: 1, bottom: 1, right: 1.5 } } },
          { content: s1?.criteriaScores?.[crit.id] ?? '-', styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', cellPadding: 1.5 } },
          { content: s2?.criteriaScores?.[crit.id] ?? '-', styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', cellPadding: 1.5 } }
        ]);
      });
    });

    tableData.push([
      { content: 'Total Nilai (Sebelum Penalti)', styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250], cellPadding: 2 } },
      { content: s1 ? (Number.isInteger(raw1) ? raw1 : Number(raw1).toFixed(2)) : '-', styles: { fontStyle: 'bold', halign: 'center', fillColor: [250, 250, 250], cellPadding: 2 } },
      { content: s2 ? (Number.isInteger(raw2) ? raw2 : Number(raw2).toFixed(2)) : '-', styles: { fontStyle: 'bold', halign: 'center', fillColor: [250, 250, 250], cellPadding: 2 } }
    ]);
    
    tableData.push([
      { content: maxExcess > 0 ? \`Penalti Waktu (Kelebihan: \${maxExcess} dtk)\` : 'Penalti Waktu (Aman/Tepat Waktu)', styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 240, 240], cellPadding: 2 } },
      { content: totalPenalty > 0 ? \`-\${totalPenalty.toFixed(2)}\` : '-', styles: { fontStyle: 'bold', halign: 'center', textColor: [200,0,0], fillColor: [255, 240, 240], cellPadding: 2 } },
      { content: totalPenalty > 0 ? \`-\${totalPenalty.toFixed(2)}\` : '-', styles: { fontStyle: 'bold', halign: 'center', textColor: [200,0,0], fillColor: [255, 240, 240], cellPadding: 2 } }
    ]);
    
    tableData.push([
      { content: 'NILAI AKHIR GABUNGAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [220, 240, 220], cellPadding: 3, fontSize: 11 } },
      { content: Number.isInteger(grandTotal) ? grandTotal : Number(grandTotal).toFixed(2), styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 240, 220], cellPadding: 3, fontSize: 11 } }
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Kriteria Penilaian', 'Juri 1', 'Juri 2']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 26 },
        2: { cellWidth: 26 }
      },
      styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: [200, 200, 200] },
      margin: { left: 14, right: 14 },
    });

    if (autoDownload) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = \`\${now.getFullYear()}\${pad(now.getMonth() + 1)}\${pad(now.getDate())} \${pad(now.getHours())}.\${pad(now.getMinutes())}.\${pad(now.getSeconds())}\`;
      const cleanName = participant.name.replace(/[^a-zA-Z0-9 ]/g, '');
      const filename = \`LKBB dan Yel-Yel Nilai Rinci \${participant.number} \${participant.category} \${cleanName} \${timeStr}.pdf\`;
      doc.save(filename);
    }
  };
`;

if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx, newGeneratePdf);
} else {
    // try different end line
    const endIdx2 = lines.findIndex((l, idx) => idx > startIdx && l.includes('  const exportSemuaNilaiRinci = () => {'));
    if (endIdx2 !== -1) {
       lines.splice(startIdx, endIdx2 - startIdx, newGeneratePdf);
    }
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', lines.join('\n'));
