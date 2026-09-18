const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// Replace exportDaftarPesertaExcel
const exportDaftarPesertaExcelImplementation = `  const exportDaftarPesertaExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      CATEGORIES.forEach(category => {
        const catParticipants = participants.filter(p => p.category === category);
        if (catParticipants.length === 0) return;
        
        const worksheet = workbook.addWorksheet(category.substring(0, 31).replace(/[\\\\/*?:\\[\\]]/g, ''));
        worksheet.columns = [
          { header: 'No', key: 'idx', width: 5 },
          { header: 'No. Undian', key: 'number', width: 15 },
          { header: 'Nama Pangkalan / Regu', key: 'name', width: 40 },
          { header: 'Kategori', key: 'category', width: 20 },
        ];
        
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        
        catParticipants.sort((a, b) => a.number.localeCompare(b.number)).forEach((p, idx) => {
          worksheet.addRow({
            idx: idx + 1,
            number: p.number,
            name: p.name,
            category: p.category
          });
        });
        
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
            cell.border = {
              top: {style:'thin'},
              left: {style:'thin'},
              bottom: {style:'thin'},
              right: {style:'thin'}
            };
          });
        });
      });

      if (workbook.worksheets.length === 0) {
        showToast('Belum ada data peserta untuk diekspor', 'error');
        return;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", generateExportFilename("Daftar Peserta LKBB", "xlsx"));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor daftar peserta', 'error');
    }
  };`;

content = content.replace(
  /const exportDaftarPesertaExcel = async \(\) => \{\s+showToast\("Fitur ekspor daftar peserta dalam perbaikan\.", 'success'\);\s+\};/g,
  exportDaftarPesertaExcelImplementation
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
