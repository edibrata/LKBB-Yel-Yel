const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// We will replace the entire generateDetailPDF function
const generateDetailPDF_replacement = `  const generateDetailPDF = (participant: any, detailScores: ScoreRecord[], autoDownload = true, docParam?: jsPDF) => {
    const doc = docParam || new jsPDF('p', 'mm', 'a4');
    
    const startPage = (doc as any).internal.getNumberOfPages();
    const checkPageBreak = (currentY: number, heightNeeded: number) => {
      if (currentY + heightNeeded > 275) {
        doc.addPage();
        return 15;
      }
      return currentY;
    };

    let totalAll = 0;
    detailScores.forEach(s => { if (!s.isDisqualified) totalAll += s.totalScore; });

    // Determine penalties and final totals
    const p1 = detailScores.find(s => s.post === 1);
    const p2 = detailScores.find(s => s.post === 2);
    const p1Penalty = p1?.timePenalty || 0;
    const p2Penalty = p2?.timePenalty || 0;
    const totalPenalty = Math.max(p1Penalty, p2Penalty);
    const raw1 = (p1?.finalScore || p1?.totalScore || 0) + p1Penalty;
    const raw2 = p2 ? ((p2?.finalScore || p2?.totalScore || 0) + p2Penalty) : raw1;
    const avgRaw = p2 ? (raw1 + raw2) / 2 : raw1;
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

    const criteriaDef = SCORING_CRITERIA[1];
    if (!criteriaDef) return;

    if (p1?.isDisqualified || p2?.isDisqualified) {
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
      const groupCriteria = criteriaDef.filter(c => c.id.startsWith(group.prefix));
      groupCriteria.forEach((crit, index) => {
        tableData.push([
          { content: \`\${index + 1}. \${crit.name}\\n    \${crit.desc}\`, styles: { cellPadding: { left: 5, top: 1, bottom: 1, right: 1.5 } } },
          { content: p1?.criteriaScores?.[crit.id] ?? '-', styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', cellPadding: 1.5 } },
          { content: p2?.criteriaScores?.[crit.id] ?? '-', styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', cellPadding: 1.5 } }
        ]);
      });
    });

    // Add totals row
    tableData.push([
      { content: 'Total Nilai (Sebelum Penalti)', styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250], cellPadding: 2 } },
      { content: p1 ? (Number.isInteger(raw1) ? raw1 : Number(raw1).toFixed(2)) : '-', styles: { fontStyle: 'bold', halign: 'center', fillColor: [250, 250, 250], cellPadding: 2 } },
      { content: p2 ? (Number.isInteger(raw2) ? raw2 : Number(raw2).toFixed(2)) : '-', styles: { fontStyle: 'bold', halign: 'center', fillColor: [250, 250, 250], cellPadding: 2 } }
    ]);
    
    tableData.push([
      { content: 'Penalti Waktu', styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 240, 240], cellPadding: 2 } },
      { content: p1Penalty > 0 ? \`-\${p1Penalty}\` : '-', styles: { fontStyle: 'bold', halign: 'center', textColor: [200,0,0], fillColor: [255, 240, 240], cellPadding: 2 } },
      { content: p2Penalty > 0 ? \`-\${p2Penalty}\` : '-', styles: { fontStyle: 'bold', halign: 'center', textColor: [200,0,0], fillColor: [255, 240, 240], cellPadding: 2 } }
    ]);
    
    tableData.push([
      { content: 'NILAI AKHIR GABUNGAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [220, 240, 220], cellPadding: 3, fontSize: 11 } },
      { content: Number.isInteger(grandTotal) ? grandTotal : Number(grandTotal).toFixed(2), styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 240, 220], cellPadding: 3, fontSize: 11 } }
    ]);

    const getCategoryColor = (category: string): [number, number, number] => {
      const cat = category.toLowerCase();
      if (cat.includes('sd')) return [255, 230, 230];
      if (cat.includes('smp')) return [230, 240, 255];
      if (cat.includes('sma') || cat.includes('smk')) return [230, 245, 230];
      if (cat.includes('umum')) return [255, 245, 225];
      if (cat.includes('instansi')) return [240, 230, 250];
      return [250, 224, 212];
    };
    const catColor = getCategoryColor(participant.category || '');

    autoTable(doc, {
      startY: currentY,
      head: [['Aspek/Sub Aspek/Kriteria', 'Nilai Juri 1', 'Nilai Juri 2']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: catColor, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', cellPadding: 2 },
      styles: { textColor: [0, 0, 0], fontSize: 9.5, lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 1, minCellHeight: 6, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 20, halign: 'center', valign: 'middle' },
        2: { cellWidth: 20, halign: 'center', valign: 'middle' }
      },
      margin: { left: 14, right: 14 },
    });

    if (autoDownload) {
      const filename = \`\${participant.number}_\${participant.name}_Detail.pdf\`.replace(/[^a-zA-Z0-9-_.]/g, '_');
      doc.save(filename);
    }
  };
`;

const startIndex = code.indexOf('const generateDetailPDF =');
const endIndex = code.indexOf('if (autoDownload)', startIndex);
const fullEndIndex = code.indexOf('};', endIndex) + 2;

const originalFunc = code.substring(startIndex, fullEndIndex);
code = code.replace(originalFunc, generateDetailPDF_replacement);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("PDF generation rewritten.");
