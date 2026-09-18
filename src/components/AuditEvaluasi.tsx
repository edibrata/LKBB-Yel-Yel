import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Download, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { calculateMean, calculateStandardDeviation, calculateSpearmanRankCorrelation, calculateVariance } from '../lib/statistics';
import { FLAT_CRITERIA } from '../lib/constants';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditEvaluasiProps {
  participants: any[];
  scores: any[];
  appUsers: any[];
}

export default function AuditEvaluasi({ participants, scores, appUsers }: AuditEvaluasiProps) {
  const judges = useMemo(() => appUsers.filter(u => u.role === 'judge'), [appUsers]);
  
  // 1. EVALUASI INSTRUMEN (RELIABILITAS CRONBACH'S ALPHA)
  const instrumentAnalysis = useMemo(() => {
    // Only use participants that have scores
    const scoredParticipants = participants.filter(p => scores.some(s => s.participantId === p.id));
    if (scoredParticipants.length === 0) return null;

    // We need a matrix of Participant x Item Score (Average across judges)
    const k = FLAT_CRITERIA.length;
    let sumVarianceItems = 0;
    const itemVariances = [];
    const itemMeans = [];
    
    // For item difficulty (mean score per item)
    FLAT_CRITERIA.forEach(crit => {
      const allScoresForCrit: number[] = [];
      scoredParticipants.forEach(p => {
        const pScores = scores.filter(s => s.participantId === p.id);
        if (pScores.length > 0) {
          // Average score for this criteria for this participant across all judges
          const avgCritScore = calculateMean(
            pScores.map(s => s.criteriaScores?.[crit.id] || 0)
          );
          allScoresForCrit.push(avgCritScore);
        }
      });
      const variance = calculateVariance(allScoresForCrit);
      const mean = calculateMean(allScoresForCrit);
      sumVarianceItems += variance;
      itemVariances.push({ id: crit.id, name: crit.name, variance, mean });
      itemMeans.push({ id: crit.id, name: crit.name, mean });
    });

    // Variance of Total Scores
    const allTotalScores = scoredParticipants.map(p => {
      const pScores = scores.filter(s => s.participantId === p.id);
      return calculateMean(pScores.map(s => s.totalScore || 0));
    });
    
    const varianceTotal = calculateVariance(allTotalScores);
    
    let cronbachAlpha = 0;
    if (k > 1 && varianceTotal > 0) {
      cronbachAlpha = (k / (k - 1)) * (1 - (sumVarianceItems / varianceTotal));
    }

    // Sort item difficulties
    const sortedDifficulties = [...itemMeans].sort((a, b) => a.mean - b.mean);
    const hardestItem = sortedDifficulties[0];
    const easiestItem = sortedDifficulties[sortedDifficulties.length - 1];

    let reliabilityJudgement = "Sangat Rendah";
    let reliabilityColor = "text-red-600";
    if (cronbachAlpha > 0.9) { reliabilityJudgement = "Sangat Tinggi (Excellent)"; reliabilityColor = "text-green-600"; }
    else if (cronbachAlpha > 0.8) { reliabilityJudgement = "Tinggi (Good)"; reliabilityColor = "text-green-500"; }
    else if (cronbachAlpha > 0.7) { reliabilityJudgement = "Dapat Diterima (Acceptable)"; reliabilityColor = "text-blue-500"; }
    else if (cronbachAlpha > 0.6) { reliabilityJudgement = "Dipertanyakan (Questionable)"; reliabilityColor = "text-orange-500"; }
    else if (cronbachAlpha > 0.5) { reliabilityJudgement = "Rendah (Poor)"; reliabilityColor = "text-red-500"; }

    return {
      cronbachAlpha,
      reliabilityJudgement,
      reliabilityColor,
      hardestItem,
      easiestItem
    };
  }, [participants, scores]);

  // 2. EVALUASI JURI (BIAS, KONSENSUS, OBJEKTIVITAS)
  const judgeAnalysis = useMemo(() => {
    // Calculate panel average for each participant
    const panelAverages: Record<string, number> = {};
    const panelRankScores: number[] = [];
    const participantIds: string[] = [];

    participants.forEach(p => {
      const pScores = scores.filter(s => s.participantId === p.id);
      if (pScores.length > 0) {
        const mean = calculateMean(pScores.map(s => s.totalScore || 0));
        panelAverages[p.id] = mean;
        panelRankScores.push(mean);
        participantIds.push(p.id);
      }
    });

    const analysis = judges.map(judge => {
      const judgeScores = scores.filter(s => s.judgeId === judge.id);
      if (judgeScores.length === 0) return { judge, hasData: false };

      const diffs: number[] = [];
      const myRankScores: number[] = [];
      const sharedRankScores: number[] = [];
      let totalStdDev = 0; // standard deviation of scores given to same squad vs others
      
      judgeScores.forEach(s => {
        const panelAvg = panelAverages[s.participantId];
        if (panelAvg !== undefined) {
          const diff = s.totalScore - panelAvg;
          diffs.push(diff);
          
          myRankScores.push(s.totalScore);
          sharedRankScores.push(panelAvg);
        }
      });

      const avgBias = calculateMean(diffs);
      
      let biasJudgement = "Objektif (Normal)";
      let biasColor = "text-green-600";
      if (avgBias > 5) { biasJudgement = "Sangat Murah Hati (Terlalu Tinggi)"; biasColor = "text-orange-500"; }
      else if (avgBias > 2) { biasJudgement = "Sedikit Murah Hati"; biasColor = "text-blue-500"; }
      else if (avgBias < -5) { biasJudgement = "Juri Killer (Terlalu Rendah)"; biasColor = "text-red-600"; }
      else if (avgBias < -2) { biasJudgement = "Cukup Ketat"; biasColor = "text-purple-500"; }

      const spearman = calculateSpearmanRankCorrelation(myRankScores, sharedRankScores);
      
      let syncJudgement = "Sangat Selaras";
      if (spearman < 0.5) syncJudgement = "Menyimpang Ekstrem (Anomali)";
      else if (spearman < 0.7) syncJudgement = "Kurang Selaras";
      else if (spearman < 0.9) syncJudgement = "Cukup Selaras";

      // Detect favoritisme (High max positive deviation on a single team compared to normal bias)
      const maxDiff = Math.max(...diffs, 0);
      const isFavoritism = maxDiff > 10 && avgBias < 2; // e.g. normally strict, but gives +10 to one team

      return {
        judge,
        hasData: true,
        evalCount: judgeScores.length,
        avgBias,
        biasJudgement,
        biasColor,
        spearman,
        syncJudgement,
        isFavoritism
      };
    });

    return analysis.filter(a => a.hasData);
  }, [participants, scores, judges]);

  const exportExcel = () => {
    const wb = xlsx.utils.book_new();
    
    // Sheet 1: Instrumen
    if (instrumentAnalysis) {
      const instData = [
        { Metrik: "Cronbach's Alpha", Nilai: instrumentAnalysis.cronbachAlpha.toFixed(3), Status: instrumentAnalysis.reliabilityJudgement },
        { Metrik: "Kriteria Paling Sulit", Nilai: instrumentAnalysis.hardestItem.name, Status: `Rata-rata Skor: ${instrumentAnalysis.hardestItem.mean.toFixed(2)}` },
        { Metrik: "Kriteria Paling Mudah", Nilai: instrumentAnalysis.easiestItem.name, Status: `Rata-rata Skor: ${instrumentAnalysis.easiestItem.mean.toFixed(2)}` }
      ];
      const wsInst = xlsx.utils.json_to_sheet(instData);
      xlsx.utils.book_append_sheet(wb, wsInst, "Kualitas Instrumen");
    }

    // Sheet 2: Kinerja Juri
    const jData = judgeAnalysis.map(j => ({
      "Nama Juri": (j.judge.name || j.judge.email || j.judge.id),
      "Jumlah Penilaian": j.evalCount,
      "Bias (Mean Deviasi)": j.avgBias.toFixed(2),
      "Kecenderungan": j.biasJudgement,
      "Korelasi Ranking (Spearman)": j.spearman.toFixed(3),
      "Konsistensi dengan Panel": j.syncJudgement,
      "Indikasi Favoritisme": j.isFavoritism ? "Terdeteksi (Anomali Nilai Tinggi)" : "Tidak Ditemukan"
    }));
    const wsJuri = xlsx.utils.json_to_sheet(jData);
    xlsx.utils.book_append_sheet(wb, wsJuri, "Kinerja Juri");

    xlsx.writeFile(wb, "Laporan_Audit_Statistik_Penilaian.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("LAPORAN AUDIT & EVALUASI PENILAIAN (STATISTIK)", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Dokumen ini dihasilkan secara otomatis oleh Sistem Penilaian Cerdas", 105, 26, { align: 'center' });

    let currentY = 40;

    if (instrumentAnalysis) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("1. EVALUASI KEKUATAN INSTRUMEN (RUBRIK)", 14, currentY);
      currentY += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Nilai Cronbach's Alpha: ${instrumentAnalysis.cronbachAlpha.toFixed(3)} (${instrumentAnalysis.reliabilityJudgement})`, 14, currentY);
      currentY += 6;
      doc.text(`Kriteria Paling Sulit: ${instrumentAnalysis.hardestItem.name} (Rata-rata: ${instrumentAnalysis.hardestItem.mean.toFixed(2)} / 5)`, 14, currentY);
      currentY += 6;
      doc.text(`Kriteria Paling Mudah: ${instrumentAnalysis.easiestItem.name} (Rata-rata: ${instrumentAnalysis.easiestItem.mean.toFixed(2)} / 5)`, 14, currentY);
      currentY += 15;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2. EVALUASI KINERJA & OBJEKTIVITAS JURI", 14, currentY);
    currentY += 8;

    const tableBody = judgeAnalysis.map((j: any) => [
      (j.judge.name || j.judge.email || j.judge.id),
      j.evalCount.toString(),
      j.avgBias > 0 ? `+${j.avgBias.toFixed(2)}` : j.avgBias.toFixed(2),
      j.biasJudgement,
      j.syncJudgement,
      j.isFavoritism ? "YA" : "TIDAK"
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Nama Juri', 'Jml Dinilai', 'Index Bias', 'Kecenderungan', 'Keselarasan Ranking', 'Favoritisme']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Kesimpulan Naratif
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Kesimpulan Naratif:", 14, currentY);
    currentY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    judgeAnalysis.forEach((j: any) => {
      let narasi = `- Kinerja Juri ${(j.judge.name || j.judge.email || j.judge.id)} terpantau ${j.biasJudgement} dengan indeks deviasi ${j.avgBias > 0 ? '+' : ''}${j.avgBias.toFixed(2)} dari rata-rata panel.`;
      narasi += ` Beliau memiliki tingkat keselarasan ranking yang ${j.syncJudgement} dengan keputusan panel juri secara keseluruhan.`;
      if (j.isFavoritism) {
        narasi += ` PERHATIAN: Ditemukan indikasi anomali/favoritisme pada pemberian skor ekstrem positif ke regu tertentu.`;
      }
      
      const splitText = doc.splitTextToSize(narasi, 180);
      doc.text(splitText, 14, currentY);
      currentY += (splitText.length * 5) + 3;
      
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
    });

    doc.save("Laporan_Audit_Statistik.pdf");
  };

  if (!instrumentAnalysis || judgeAnalysis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-dashed">
        <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-700">Belum Ada Data Penilaian Cukup</h3>
        <p className="text-center mt-2 max-w-md">Sistem memerlukan minimal 1 regu yang telah dinilai oleh juri untuk dapat menjalankan algoritma audit statistik Cronbach's Alpha dan Bias Deviasi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Audit & Evaluasi Penilaian
          </h2>
          <p className="text-sm text-slate-500">Menganalisis kekuatan instrumen dan objektivitas kinerja juri menggunakan metrik statistik.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Data Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Cetak PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KEKUATAN INSTRUMEN */}
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 pb-4">
            <CardTitle className="text-lg text-indigo-900">1. Kekuatan Instrumen (Rubrik)</CardTitle>
            <CardDescription>Analisis konsistensi internal dan tingkat kesulitan soal.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Reliabilitas Cronbach's Alpha</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-slate-800">{instrumentAnalysis.cronbachAlpha.toFixed(3)}</h3>
                <span className={`text-sm font-semibold ${instrumentAnalysis.reliabilityColor} mb-1.5`}>
                  {instrumentAnalysis.reliabilityJudgement}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Mengukur apakah seluruh kriteria secara konsisten menguji kemampuan yang sama. &gt; 0.7 berarti baik.</p>
            </div>
            
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 gap-4">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                <p className="text-xs font-semibold text-orange-800 uppercase tracking-wider mb-1">Kriteria Paling Sulit</p>
                <p className="text-sm font-medium text-slate-900">{instrumentAnalysis.hardestItem.name}</p>
                <p className="text-xs text-orange-600 mt-1">Rata-rata Skor: {instrumentAnalysis.hardestItem.mean.toFixed(2)} / 5</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">Kriteria Paling Mudah</p>
                <p className="text-sm font-medium text-slate-900">{instrumentAnalysis.easiestItem.name}</p>
                <p className="text-xs text-emerald-600 mt-1">Rata-rata Skor: {instrumentAnalysis.easiestItem.mean.toFixed(2)} / 5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KINERJA JURI */}
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
            <CardTitle className="text-lg text-blue-900">2. Integritas & Objektivitas Juri</CardTitle>
            <CardDescription>Analisis simpangan bias dari nilai rata-rata panel.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Nama Juri</th>
                    <th className="px-4 py-3">Bias Deviasi</th>
                    <th className="px-4 py-3">Kecenderungan</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {judgeAnalysis.map((j, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {(j.judge.name || j.judge.email || j.judge.id)}
                        <div className="text-[10px] text-slate-400 font-normal">{j.evalCount} penilaian</div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className={j.avgBias > 0 ? 'text-orange-600' : j.avgBias < 0 ? 'text-blue-600' : 'text-slate-500'}>
                          {j.avgBias > 0 ? '+' : ''}{j.avgBias.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={j.biasColor}>{j.biasJudgement}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {j.isFavoritism ? (
                          <div className="flex flex-col items-center group cursor-help" title="Ada anomali pemberian skor sangat tinggi pada regu tertentu">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-[9px] text-red-600 mt-0.5">Anomali</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-[9px] text-emerald-600 mt-0.5">Aman</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Narasi Evaluasi Otomatis (Auto-Generated)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {judgeAnalysis.map((j, i) => (
              <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed">
                <strong>{(j.judge.name || j.judge.email || j.judge.id)}:</strong> Kinerja terpantau <span className={`font-semibold ${j.biasColor}`}>{j.biasJudgement}</span> dengan indeks deviasi {j.avgBias > 0 ? '+' : ''}{j.avgBias.toFixed(2)} dari rata-rata panel juri.
                Beliau memiliki tingkat keselarasan ranking yang <strong>{j.syncJudgement}</strong> dengan keputusan panel secara keseluruhan (Spearman <em>{j.spearman.toFixed(2)}</em>).
                {j.isFavoritism && (
                  <div className="mt-2 text-red-600 font-medium flex items-start gap-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    Peringatan: Ditemukan indikasi anomali. Terdapat pemberian skor ekstrem pada regu tertentu yang tidak sejalan dengan standar ketat beliau biasanya.
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
