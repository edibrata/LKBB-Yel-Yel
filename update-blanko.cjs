const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const exportFormatPenilaianImplementation = `  const exportFormatPenilaian = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const criteriaDef = FLAT_CRITERIA;
      if (!criteriaDef) return;
      
      const pdfGroups = [
        { title: "A. Kerapihan (10%)", prefix: "kerapihan_" },
        { title: "B. Gerakan di Tempat dan Berpindah Tempat (40%)", prefix: "gerakan_" },
        { title: "C. Gerakan Variasi, Formasi dan Yel-Yel (40%)", prefix: "variasi_" },
        { title: "D. Ketepatan Waktu (10%)", prefix: "waktu_" }
      ];

      const tableData = [];
      pdfGroups.forEach(group => {
        tableData.push([
          { content: group.title, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], cellPadding: 2 } }
        ]);
        const groupCriteria = criteriaDef.filter(c => c.id.startsWith(group.prefix));
        groupCriteria.forEach((crit, index) => {
          const numberStr = groupCriteria.length > 1 ? (index + 1) + '.' : '';
          tableData.push([
            { content: numberStr, styles: { cellPadding: { left: 1.5, top: 1.5, bottom: 1.5, right: 1 }, halign: 'right' } },
            { content: \`\${crit.name}\\n\${crit.desc}\`, styles: { cellPadding: { left: 1, top: 1.5, bottom: 1.5, right: 1.5 } } },
            { content: ' ', styles: { halign: 'center', valign: 'middle' } }
          ]);
        });
      });
      
      tableData.push([
        { content: 'Total Nilai (Sebelum Penalti)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250], cellPadding: 2 } },
        { content: ' ', styles: { fillColor: [250, 250, 250] } }
      ]);
      
      tableData.push([
        { content: 'Penalti Waktu', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 240, 240], cellPadding: 2 } },
        { content: ' ', styles: { fillColor: [255, 240, 240] } }
      ]);
      
      tableData.push([
        { content: 'NILAI AKHIR', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [220, 240, 220], cellPadding: 3, fontSize: 11 } },
        { content: ' ', styles: { fillColor: [220, 240, 220] } }
      ]);
      
      if (participants.length === 0) {
        showToast('Belum ada data peserta', 'error');
        return;
      }
      
      const sortedParticipants = [...participants].sort((a,b) => a.number.localeCompare(b.number));
      
      sortedParticipants.forEach((p, idx) => {
        if (idx > 0) doc.addPage();
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("BLANKO PENILAIAN JURI", 105, 15, { align: 'center' });
        doc.text("LKBB DAN YEL-YEL", 105, 21, { align: 'center' });
        
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "normal");
        doc.text("Kategori", 14, 30); doc.text(\`: \${p.category}\`, 45, 30);
        doc.text("Nomor Peserta", 14, 35); doc.text(\`: \${p.number}\`, 45, 35);
        doc.text("Nama Regu", 14, 40); doc.text(\`: \${p.name}\`, 45, 40);
        
        doc.text("Juri yang Menilai", 125, 30); doc.text(": .....................................", 155, 30);
        
        autoTable(doc, {
          startY: 46,
          head: [[{content: 'Kriteria Penilaian', colSpan: 2}, 'Nilai']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 5 },
            1: { cellWidth: 145 },
            2: { cellWidth: 32 }
          },
          styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: [200, 200, 200] },
          margin: { left: 14, right: 14 },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.raw.length === 3) {
              if (data.column.index === 0) {
                data.cell.styles.lineWidth = { top: 0.1, right: 0, bottom: 0.1, left: 0.1 };
              } else if (data.column.index === 1) {
                data.cell.styles.lineWidth = { top: 0.1, right: 0.1, bottom: 0.1, left: 0 };
              }
            }
          },
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
            
            doc.text("Format Penilaian LKBB & Yel-Yel", 14, footerY);
            
            const pageStr = \`Hal. \${data.pageNumber} dari \${doc.internal.getNumberOfPages()}\`;
            doc.text(pageStr, pageWidth / 2, footerY, { align: 'center' });
            
            const pInfo = \`\${p.number} \${p.name}\`;
            doc.text(pInfo, pageWidth - 14, footerY, { align: 'right' });
          }
        });
        
        // Add signature box
        const finalY = doc.lastAutoTable.finalY + 10;
        if (finalY < 250) {
          doc.setFontSize(10);
          doc.text("Serang, .............................. 202...", 140, finalY);
          doc.text("Juri Penilai,", 140, finalY + 5);
          doc.text("( .......................................... )", 140, finalY + 30);
        }
      });
      
      doc.save(generateExportFilename("Blanko Penilaian LKBB", "pdf"));
      showToast('Berhasil mengekspor blanko penilaian', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor blanko penilaian', 'error');
    }
  };`;

content = content.replace(
  /const exportFormatPenilaian = async \(\) => \{\s+showToast\("Fitur cetak blanko dalam perbaikan\.", 'success'\);\s+\};/g,
  exportFormatPenilaianImplementation
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
