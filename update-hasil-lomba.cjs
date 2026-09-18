const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const exportHasilLombaImplementation = `  const exportHasilLomba = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      if (participants.length === 0) {
        showToast('Belum ada data peserta', 'error');
        return;
      }
      
      let hasPage = false;
      
      CATEGORIES.forEach((category) => {
        const catGroup = groupedScores.find(g => g.category === category);
        if (!catGroup || catGroup.participants.length === 0) return;
        
        if (hasPage) doc.addPage();
        hasPage = true;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("REKAPITULASI HASIL LOMBA", 105, 15, { align: 'center' });
        doc.text("LKBB DAN YEL-YEL", 105, 21, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(\`Kategori: \${category}\`, 14, 30);
        
        const tableData = [];
        catGroup.participants.forEach((p, index) => {
          tableData.push([
            index + 1,
            p.participant.number,
            p.participant.name,
            Number.isInteger(p.juri1Total) ? p.juri1Total : p.juri1Total.toFixed(2),
            Number.isInteger(p.juri2Total) ? p.juri2Total : p.juri2Total.toFixed(2),
            p.totalPenalty > 0 ? \`-\${p.totalPenalty.toFixed(2)}\` : '-',
            Number.isInteger(p.grandTotal) ? p.grandTotal : p.grandTotal.toFixed(2),
            p.isDisqualified ? p.disqualificationReason || 'Diskualifikasi' : 'Juara ' + (index + 1)
          ]);
        });
        
        autoTable(doc, {
          startY: 35,
          head: [['Rank', 'No', 'Pangkalan / Regu', 'Juri 1', 'Juri 2', 'Penalti', 'Nilai Akhir', 'Keterangan']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 55 },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 18, halign: 'center', textColor: [200, 0, 0] },
            6: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 26 }
          },
          styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: [200, 200, 200] },
          margin: { left: 14, right: 14 },
          didDrawPage: (data) => {
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
            const footerY = pageHeight - 15;
            
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(120, 120, 120);
            
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const timeStr = \`\${now.getFullYear()}\${pad(now.getMonth() + 1)}\${pad(now.getDate())} \${pad(now.getHours())}.\${pad(now.getMinutes())}.\${pad(now.getSeconds())}\`;
            
            doc.text(timeStr, 14, footerY);
            
            const pageStr = \`Hal. \${data.pageNumber} dari \${doc.internal.getNumberOfPages()}\`;
            doc.text(pageStr, pageWidth / 2, footerY, { align: 'center' });
            
            doc.text(\`Kategori: \${category}\`, pageWidth - 14, footerY, { align: 'right' });
          }
        });
      });
      
      if (!hasPage) {
        showToast('Belum ada data nilai untuk diekspor', 'error');
        return;
      }
      
      doc.save(generateExportFilename("Rekap Hasil Lomba LKBB", "pdf"));
      showToast('Berhasil mengekspor hasil lomba', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor hasil lomba', 'error');
    }
  };`;

content = content.replace(
  /const exportHasilLomba = async \(\) => \{\s+showToast\("Fitur ekspor hasil lomba dalam perbaikan\.", 'success'\);\s+\};/g,
  exportHasilLombaImplementation
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
