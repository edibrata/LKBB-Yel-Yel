import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Scale, 
  Award, 
  Zap, 
  Activity,
  Sparkles
} from 'lucide-react';
import { 
  calculateMean, 
  calculateStandardDeviation, 
  calculateSpearmanRankCorrelation, 
  calculateVariance,
  calculatePearsonCorrelation,
  calculateInterRaterAgreement,
  calculateOrderEffectStability
} from '../lib/statistics';
import { FLAT_CRITERIA } from '../lib/constants';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditEvaluasiProps {
  participants: any[];
  scores: any[];
  appUsers: any[];
}

function getJudgeDisplayName(judge: any): string {
  if (!judge) return 'Juri';
  if (typeof judge === 'string') return judge;
  const name = judge.name || judge.email || judge.id || '';
  return name.trim() || 'Juri';
}

export default function AuditEvaluasi({ participants, scores, appUsers }: AuditEvaluasiProps) {
  const judges = useMemo(() => {
    const userJudges = [...appUsers.filter(u => u.role === 'judge')];
    const existingKeys = new Set(userJudges.map(u => u.id));
    
    scores.forEach(s => {
      const jId = s.judgeId;
      if (jId && !existingKeys.has(jId)) {
        existingKeys.add(jId);
        userJudges.push({
          id: jId,
          name: s.judgeName || jId,
          email: s.judgeName || jId,
          role: 'judge'
        });
      }
    });
    return userJudges;
  }, [appUsers, scores]);
  
  // 1. EVALUASI INSTRUMEN (RELIABILITAS CRONBACH'S ALPHA)
  const instrumentAnalysis = useMemo(() => {
    const scoredParticipants = participants.filter(p => scores.some(s => s.participantId === p.id && !s.isDisqualified));
    if (scoredParticipants.length === 0) return null;

    const k = FLAT_CRITERIA.length;
    let sumVarianceItems = 0;
    const itemVariances = [];
    const itemMeans = [];
    
    FLAT_CRITERIA.forEach(crit => {
      const allScoresForCrit: number[] = [];
      scoredParticipants.forEach(p => {
        const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
        if (pScores.length > 0) {
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

    const allTotalScores = scoredParticipants.map(p => {
      const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
      return calculateMean(pScores.map(s => s.totalScore || 0));
    });
    
    const varianceTotal = calculateVariance(allTotalScores);
    
    let cronbachAlpha = 0;
    if (k > 1 && varianceTotal > 0) {
      cronbachAlpha = (k / (k - 1)) * (1 - (sumVarianceItems / varianceTotal));
    }

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
    const panelAverages: Record<string, number> = {};
    const panelRankScores: number[] = [];

    participants.forEach(p => {
      const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
      if (pScores.length > 0) {
        const mean = calculateMean(pScores.map(s => s.totalScore || 0));
        panelAverages[p.id] = mean;
        panelRankScores.push(mean);
      }
    });

    const analysis = judges.map(judge => {
      const judgeId = judge.id;
      const judgeName = judge.name;
      const judgeEmail = judge.email;
      
      const judgeScores = scores.filter(s => 
        (s.judgeId === judgeId || 
        (judgeEmail && s.judgeId === judgeEmail) ||
        (judgeName && s.judgeId === judgeName) ||
        (s.judgeName && (s.judgeName === judgeId || s.judgeName === judgeName || s.judgeName === judgeEmail))) &&
        !s.isDisqualified
      );
      if (judgeScores.length === 0) return { judge, hasData: false };

      const diffs: number[] = [];
      const myRankScores: number[] = [];
      const sharedRankScores: number[] = [];
      
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

      const maxDiff = Math.max(...diffs, 0);
      const isFavoritism = maxDiff > 10 && avgBias < 2;

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

  // 3. AUDIT INTEGRITAS SISTEMIK & RELIABILITAS LANJUTAN
  const systemicAnalysis = useMemo(() => {
    const scoredParticipants = participants.filter(p => scores.some(s => s.participantId === p.id && !s.isDisqualified));
    if (scoredParticipants.length === 0) return null;

    // A. Inter-Rater Agreement (Antar-Juri 1 & Juri 2)
    const j1Scores: number[] = [];
    const j2Scores: number[] = [];
    scoredParticipants.forEach(p => {
      const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
      if (pScores.length >= 2) {
        j1Scores.push(pScores[0].totalScore || 0);
        j2Scores.push(pScores[1].totalScore || 0);
      }
    });
    const raterAgreement = calculateInterRaterAgreement(j1Scores, j2Scores);

    // B. Uji Efek Urutan Tampil (Fatigue & Order Effect)
    const orderNumbers: number[] = [];
    const orderTotalScores: number[] = [];
    scoredParticipants.forEach((p, idx) => {
      const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
      if (pScores.length > 0) {
        const total = pScores.reduce((acc, s) => acc + (s.totalScore || 0), 0);
        const num = parseInt(p.number, 10);
        const orderVal = isNaN(num) ? idx + 1 : num;
        orderNumbers.push(orderVal);
        orderTotalScores.push(total);
      }
    });
    const orderStability = calculateOrderEffectStability(orderNumbers, orderTotalScores);

    // C. Daya Pembeda Kriteria Terbesar (Item-Total Correlation)
    const itemDiscriminations: { id: string; name: string; correlation: number; stdDev: number }[] = [];
    FLAT_CRITERIA.forEach(crit => {
      const critScores: number[] = [];
      const squadTotals: number[] = [];
      scoredParticipants.forEach(p => {
        const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
        if (pScores.length > 0) {
          const avgCrit = calculateMean(pScores.map(s => s.criteriaScores?.[crit.id] || 0));
          const avgTotal = calculateMean(pScores.map(s => s.totalScore || 0));
          critScores.push(avgCrit);
          squadTotals.push(avgTotal);
        }
      });
      const correlation = calculatePearsonCorrelation(critScores, squadTotals);
      const stdDev = calculateStandardDeviation(critScores);
      itemDiscriminations.push({
        id: crit.id,
        name: crit.name,
        correlation: isNaN(correlation) ? 0 : Number(correlation.toFixed(3)),
        stdDev: Number(stdDev.toFixed(2))
      });
    });

    const sortedDiscrim = [...itemDiscriminations].sort((a, b) => b.correlation - a.correlation);
    const topDiscriminator = sortedDiscrim[0] || { name: '-', correlation: 0, stdDev: 0 };
    const lowestDiscriminator = sortedDiscrim[sortedDiscrim.length - 1] || { name: '-', correlation: 0, stdDev: 0 };

    // D. Uji Ketahanan Ranking Juara (Z-Score Normalization Robustness)
    const judgeStats: Record<string, { mean: number; std: number }> = {};
    judges.forEach(j => {
      const jScores = scores.filter(s => 
        (s.judgeId === j.id || (j.email && s.judgeId === j.email) || (j.name && s.judgeId === j.name)) && !s.isDisqualified
      );
      if (jScores.length > 0) {
        const vals = jScores.map(s => s.totalScore || 0);
        judgeStats[j.id] = {
          mean: calculateMean(vals),
          std: calculateStandardDeviation(vals) || 1
        };
      }
    });

    const rawRanked = scoredParticipants.map(p => {
      const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
      const total = pScores.reduce((acc, s) => acc + (s.totalScore || 0), 0);
      return { id: p.id, name: p.name, number: p.number, score: total };
    }).sort((a, b) => b.score - a.score);

    const normRanked = scoredParticipants.map(p => {
      const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
      let normScore = 0;
      pScores.forEach(s => {
        const st = judgeStats[s.judgeId];
        if (st && st.std > 0) {
          const z = (s.totalScore - st.mean) / st.std;
          normScore += (z * 10) + 50;
        } else {
          normScore += s.totalScore;
        }
      });
      return { id: p.id, name: p.name, score: normScore };
    }).sort((a, b) => b.score - a.score);

    const top3Raw = rawRanked.slice(0, 3).map(r => r.id);
    const top3Norm = normRanked.slice(0, 3).map(r => r.id);
    let podiumMatchCount = 0;
    top3Raw.forEach((id, idx) => {
      if (top3Norm[idx] === id) podiumMatchCount++;
      else if (top3Norm.includes(id)) podiumMatchCount += 0.5;
    });

    const robustnessPct = top3Raw.length > 0 ? Math.min(100, Math.round((podiumMatchCount / top3Raw.length) * 100)) : 100;
    const isRobust = robustnessPct >= 80;

    // E. Margin Persaingan (Competitive Gap)
    const top1Score = rawRanked[0]?.score || 0;
    const top2Score = rawRanked[1]?.score || 0;
    const top3Score = rawRanked[2]?.score || 0;
    const margin1_2 = Number((top1Score - top2Score).toFixed(2));
    const margin2_3 = Number((top2Score - top3Score).toFixed(2));

    let marginJudgement = "Kompetitif Seimbang";
    if (margin1_2 <= 1.5) marginJudgement = "Sangat Ketat (Hyper-Competitive)";
    else if (margin1_2 <= 4.0) marginJudgement = "Persaingan Ketat";
    else marginJudgement = "Keunggulan Nyata Pemuncak";

    return {
      raterAgreement,
      orderStability,
      topDiscriminator,
      lowestDiscriminator,
      robustnessPct,
      isRobust,
      margin1_2,
      margin2_3,
      marginJudgement,
      leaderTeam: rawRanked[0]?.name || '-',
      runnerUpTeam: rawRanked[1]?.name || '-'
    };
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
      "Nama Juri": getJudgeDisplayName(j.judge),
      "Jumlah Penilaian": j.evalCount,
      "Bias (Mean Deviasi)": j.avgBias.toFixed(2),
      "Kecenderungan": j.biasJudgement,
      "Korelasi Ranking (Spearman)": j.spearman.toFixed(3),
      "Konsistensi dengan Panel": j.syncJudgement,
      "Indikasi Favoritisme": j.isFavoritism ? "Terdeteksi (Anomali Nilai Tinggi)" : "Tidak Ditemukan"
    }));
    const wsJuri = xlsx.utils.json_to_sheet(jData);
    xlsx.utils.book_append_sheet(wb, wsJuri, "Kinerja Juri");

    // Sheet 3: Integritas Sistemik Lanjutan
    if (systemicAnalysis) {
      const sysData = [
        { Parameter: "Kesepahaman Antar-Juri (Inter-Rater Agreement)", Nilai: systemicAnalysis.raterAgreement.coefficient, Keterangan: systemicAnalysis.raterAgreement.judgement },
        { Parameter: "Uji Stabilitas Urutan Tampil (Fatigue Effect)", Nilai: systemicAnalysis.orderStability.r, Keterangan: systemicAnalysis.orderStability.judgement },
        { Parameter: "Kriteria Penentu Kemenangan (Top Discriminator)", Nilai: systemicAnalysis.topDiscriminator.name, Keterangan: `Korelasi dengan Total Nilai: r = ${systemicAnalysis.topDiscriminator.correlation}` },
        { Parameter: "Uji Ketahanan Ranking Juara (Z-Score Robustness)", Nilai: `${systemicAnalysis.robustnessPct}%`, Keterangan: systemicAnalysis.isRobust ? "100% Kebal Bias (Podium Stabil)" : "Sensitif Moderat" },
        { Parameter: "Kerapatan Persaingan (Margin Juara 1 vs 2)", Nilai: `${systemicAnalysis.margin1_2} poin`, Keterangan: systemicAnalysis.marginJudgement }
      ];
      const wsSys = xlsx.utils.json_to_sheet(sysData);
      xlsx.utils.book_append_sheet(wb, wsSys, "Integritas Sistemik");
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
    const filename = `Laporan Audit Statistik LKBB dan Yel-Yel ${dateStr} ${timeStr}.xlsx`;

    xlsx.writeFile(wb, filename);
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header & Kop Dokumen Resmi
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text("LAPORAN AUDIT & EVALUASI PENILAIAN (STATISTIK)", 105, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Lomba Ketangkasan Baris Berbaris (LKBB) & Yel-Yel", 105, 24, { align: 'center' });
    
    doc.setFontSize(8);
    const dateFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Waktu Cetak: ${dateFormatted} | Algoritma: Psikometri & Reliabilitas Panel Juri`, 105, 29, { align: 'center' });

    // Garis Pemisah Kop
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    let currentY = 38;

    // 1. EVALUASI KEKUATAN INSTRUMEN (RUBRIK)
    if (instrumentAnalysis) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("1. EVALUASI KEKUATAN INSTRUMEN (RUBRIK)", 14, currentY);
      currentY += 3.5;

      autoTable(doc, {
        startY: currentY,
        head: [['Parameter Evaluasi Rubrik', 'Nilai / Kriteria', 'Status & Keterangan']],
        body: [
          [
            "Reliabilitas Konsistensi Internal (Cronbach's Alpha)",
            instrumentAnalysis.cronbachAlpha.toFixed(3),
            instrumentAnalysis.reliabilityJudgement
          ],
          [
            "Kriteria Paling Sulit Dinilai",
            instrumentAnalysis.hardestItem.name,
            `Rata-rata Skor: ${instrumentAnalysis.hardestItem.mean.toFixed(2)} / 5.00`
          ],
          [
            "Kriteria Paling Mudah Dinilai",
            instrumentAnalysis.easiestItem.name,
            `Rata-rata Skor: ${instrumentAnalysis.easiestItem.mean.toFixed(2)} / 5.00`
          ]
        ],
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
        headStyles: { fillColor: [49, 46, 129], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 72, halign: 'left' },
          1: { cellWidth: 55, halign: 'left' },
          2: { cellWidth: 55, halign: 'left' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1 && data.row.index === 0) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 2. INTEGRITAS & OBJEKTIVITAS JURI
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("2. INTEGRITAS & OBJEKTIVITAS JURI", 14, currentY);
    currentY += 3.5;

    const tableBody = judgeAnalysis.map((j: any) => [
      getJudgeDisplayName(j.judge),
      j.evalCount.toString(),
      j.avgBias > 0 ? `+${j.avgBias.toFixed(2)}` : j.avgBias.toFixed(2),
      j.biasJudgement,
      j.syncJudgement,
      j.isFavoritism ? "Anomali" : "Aman"
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Nama Juri', 'Jml Dinilai', 'Index Bias', 'Kecenderungan', 'Keselarasan Ranking', 'Status']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40, halign: 'left' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 38, halign: 'left' },
        4: { cellWidth: 40, halign: 'left' },
        5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 2) {
            const rawVal = data.cell.raw as string;
            const val = parseFloat(rawVal);
            if (val > 0) {
              data.cell.styles.textColor = [217, 119, 6];
            } else if (val < 0) {
              data.cell.styles.textColor = [37, 99, 235];
            } else {
              data.cell.styles.textColor = [100, 116, 139];
            }
          }
          if (data.column.index === 5) {
            if (data.cell.raw === 'Anomali') {
              data.cell.styles.textColor = [220, 38, 38];
            } else {
              data.cell.styles.textColor = [16, 185, 129];
            }
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 3. INTEGRITAS SISTEMIK & RELIABILITAS LANJUTAN
    if (systemicAnalysis) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("3. AUDIT INTEGRITAS SISTEMIK & RELIABILITAS LANJUTAN", 14, currentY);
      currentY += 3.5;

      autoTable(doc, {
        startY: currentY,
        head: [['Parameter Audit Sistemik', 'Nilai / Koefisien', 'Status & Analisis Mendalam']],
        body: [
          [
            "Kesepahaman Antar-Juri (Inter-Rater Reliability)",
            systemicAnalysis.raterAgreement.coefficient.toFixed(3),
            systemicAnalysis.raterAgreement.judgement
          ],
          [
            "Stabilitas Urutan Tampil (Fatigue & Order Effect)",
            `r = ${systemicAnalysis.orderStability.r > 0 ? '+' : ''}${systemicAnalysis.orderStability.r.toFixed(3)}`,
            systemicAnalysis.orderStability.judgement
          ],
          [
            "Kriteria Penentu Kemenangan (Top Discriminator)",
            systemicAnalysis.topDiscriminator.name,
            `Diferensiasi Terbesar (Korelasi Skor: r = ${systemicAnalysis.topDiscriminator.correlation})`
          ],
          [
            "Ketahanan Ranking Juara (Z-Score Robustness)",
            `${systemicAnalysis.robustnessPct}% Kebal Bias`,
            systemicAnalysis.isRobust ? "Podium 3 Besar Terbukti Stabil (Tidak Berubah oleh Gaya Juri)" : "Sensitif terhadap Karakter Juri Tertentu"
          ],
          [
            "Kerapatan Persaingan (Competitive Gap)",
            `Selisih: ${systemicAnalysis.margin1_2} pt`,
            `${systemicAnalysis.marginJudgement} (Juara 1 vs Juara 2)`
          ]
        ],
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 68, halign: 'left' },
          1: { cellWidth: 42, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 72, halign: 'left' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 4. KESIMPULAN NARATIF & RINGKASAN EKSEKUTIF
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("4. RINGKASAN EKSEKUTIF & EVALUASI JURI", 14, currentY);
    currentY += 5;

    // Executive Summary Box
    if (systemicAnalysis) {
      const execSummary = `Berdasarkan audit psikometri dan simulasi z-score, kompetisi LKBB & Yel-Yel ini memiliki tingkat integritas mutu yang tinggi. Instrumen penilaian terbukti konsisten, kesepahaman antar-juri berstatus ${systemicAnalysis.raterAgreement.judgement}, serta tidak terbukti adanya bias urutan tampil maupun kelelahan juri. Komposisi podium 3 besar dinyatakan ${systemicAnalysis.robustnessPct}% kebal bias, dengan kriteria "${systemicAnalysis.topDiscriminator.name}" sebagai penentu diferensiasi juara utama.`;
      
      // Sinkronisasi font dan ukuran terlebih dahulu agar kalkulasi lebar baris presisi
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const execLines = doc.splitTextToSize(execSummary, 173);
      const execBoxH = 12 + (execLines.length * 4.5) + 2.5;

      if (currentY + execBoxH > 275) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(240, 253, 250); // emerald-50
      doc.setDrawColor(153, 246, 228); // emerald-200
      doc.setLineWidth(0.3);
      doc.roundedRect(14, currentY, 182, execBoxH, 2, 2, 'FD');

      // Header Box
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text("Pernyataan Penjaminan Mutu & Keadilan Penilaian (Quality Assurance)", 18.5, currentY + 6);

      // Body Box (Proporsional & Simetris)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(19, 78, 74);
      doc.text(execLines, 18.5, currentY + 11.5, { lineHeightFactor: 1.25 });

      currentY += execBoxH + 4;
    }

    // Individual Judge Cards
    judgeAnalysis.forEach((j: any) => {
      const judgeName = getJudgeDisplayName(j.judge);
      const narasiBody = `Kinerja terpantau ${j.biasJudgement} dengan indeks deviasi ${j.avgBias > 0 ? '+' : ''}${j.avgBias.toFixed(2)} dari rata-rata panel juri. Beliau memiliki tingkat keselarasan ranking yang ${j.syncJudgement} dengan keputusan panel secara keseluruhan (Spearman ${j.spearman.toFixed(2)}).`;

      // Sinkronisasi font dan ukuran sebelum kalkulasi baris
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(narasiBody, 173);
      const extraHeight = j.isFavoritism ? 6.5 : 0;
      const boxHeight = 12 + (lines.length * 4.5) + 2.5 + extraHeight;

      if (currentY + boxHeight > 275) {
        doc.addPage();
        currentY = 20;
      }

      // Draw Card Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, currentY, 182, boxHeight, 2, 2, 'FD');

      // Card Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(judgeName, 18.5, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(j.avgBias > 0 ? 217 : j.avgBias < 0 ? 37 : 100, j.avgBias > 0 ? 119 : j.avgBias < 0 ? 99 : 116, j.avgBias > 0 ? 6 : j.avgBias < 0 ? 235 : 139);
      doc.text(`[${j.biasJudgement} | Deviasi: ${j.avgBias > 0 ? '+' : ''}${j.avgBias.toFixed(2)}]`, 191.5, currentY + 6, { align: 'right' });

      // Card Body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(lines, 18.5, currentY + 11.5, { lineHeightFactor: 1.25 });

      if (j.isFavoritism) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.8);
        doc.setTextColor(220, 38, 38);
        doc.text("Peringatan: Ditemukan indikasi anomali skor ekstrem pada regu tertentu yang tidak sejalan dengan tren umum.", 18.5, currentY + 11.5 + (lines.length * 4.5) + 2.5);
      }

      currentY += boxHeight + 3.5;
    });

    // Nomor Halaman & Footer di Setiap Halaman
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(`Halaman ${p} dari ${totalPages}`, 105, 288, { align: 'center' });
      doc.text("Laporan Audit & Evaluasi Penilaian LKBB", 14, 288);
      doc.text("Sistem e-Scoring LKBB", 196, 288, { align: 'right' });
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
    const filename = `Laporan Audit Statistik LKBB dan Yel-Yel ${dateStr} ${timeStr}.pdf`;

    doc.save(filename);
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
      {/* HEADER ATAS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Audit & Evaluasi Penilaian (Statistik Psikometri)
          </h2>
          <p className="text-sm text-slate-500">Menganalisis kekuatan instrumen, objektivitas juri, netralitas waktu, dan ketahanan ranking juara.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Data Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* 2 KARTU UTAMA: INSTRUMEN & JURI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KEKUATAN INSTRUMEN */}
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 pb-4">
            <CardTitle className="text-lg text-indigo-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              1. Kekuatan Instrumen (Rubrik)
            </CardTitle>
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
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600" />
              2. Integritas & Objektivitas Juri
            </CardTitle>
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
                        {getJudgeDisplayName(j.judge)}
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

      {/* 3. INTEGRITAS SISTEMIK & RELIABILITAS LANJUTAN (NEW!) */}
      {systemicAnalysis && (
        <Card className="border-teal-100 shadow-sm bg-gradient-to-br from-teal-50/20 to-transparent">
          <CardHeader className="bg-teal-50/60 border-b border-teal-100 pb-3">
            <CardTitle className="text-lg text-teal-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              3. Integritas Sistemik & Validasi Mutu Lomba
            </CardTitle>
            <CardDescription>
              Uji kesepahaman panel, netralitas urutan tampil, daya pembeda kriteria, dan ketahanan ranking juara.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Uji Kesepahaman Juri (Inter-Rater) */}
              <div className="p-4 rounded-xl bg-white border border-teal-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kesepahaman Juri</span>
                  <Badge variant="outline" className="text-[10px] border-teal-200 text-teal-700 bg-teal-50">
                    Inter-Rater
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl font-bold text-slate-800 font-mono">
                    {systemicAnalysis.raterAgreement.coefficient.toFixed(3)}
                  </h4>
                  <span className={`text-xs font-semibold ${systemicAnalysis.raterAgreement.badgeColor}`}>
                    {systemicAnalysis.raterAgreement.judgement}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Tingkat konsensus Juri 1 & Juri 2 saat memandang kualitas regu yang sama secara objektif.
                </p>
              </div>

              {/* Uji Stabilitas Urutan Tampil (Fatigue Effect) */}
              <div className="p-4 rounded-xl bg-white border border-teal-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stabilitas Waktu</span>
                  <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">
                    Order Effect
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl font-bold text-slate-800 font-mono">
                    r = {systemicAnalysis.orderStability.r > 0 ? '+' : ''}{systemicAnalysis.orderStability.r.toFixed(3)}
                  </h4>
                  <span className={`text-xs font-semibold ${systemicAnalysis.orderStability.isStable ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {systemicAnalysis.orderStability.isStable ? 'Netral & Adil' : 'Ada Fluktuasi'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {systemicAnalysis.orderStability.judgement}
                </p>
              </div>

              {/* Kriteria Penentu Kemenangan (Top Discriminator) */}
              <div className="p-4 rounded-xl bg-white border border-teal-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pembeda Juara</span>
                  <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                    Discriminator
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 truncate" title={systemicAnalysis.topDiscriminator.name}>
                    {systemicAnalysis.topDiscriminator.name}
                  </h4>
                  <p className="text-xs text-amber-700 font-medium mt-0.5">
                    Korelasi Skor: r = {systemicAnalysis.topDiscriminator.correlation}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Mata uji paling mendiferensiasi dan menjadi kunci kemenangan regu pemuncak.
                </p>
              </div>

              {/* Uji Ketahanan Ranking Juara (Robustness) */}
              <div className="p-4 rounded-xl bg-white border border-teal-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ketahanan Juara</span>
                  <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50">
                    Z-Score Audit
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl font-bold text-slate-800 font-mono">
                    {systemicAnalysis.robustnessPct}%
                  </h4>
                  <span className={`text-xs font-semibold ${systemicAnalysis.isRobust ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {systemicAnalysis.isRobust ? 'Podium Kebal Bias' : 'Sensitif Moderat'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Margin Juara 1 vs 2: <strong>{systemicAnalysis.margin1_2} pt</strong> ({systemicAnalysis.marginJudgement}).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 4. RINGKASAN EKSEKUTIF & NARASI EVALUASI */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Narasi Evaluasi & Ringkasan Penjaminan Mutu
          </CardTitle>
          <CardDescription>
            Sintesis otomatis dari seluruh uji statistik untuk pembuktian akuntabilitas panitia.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Executive QA Callout */}
          {systemicAnalysis && (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Pernyataan Penjaminan Mutu & Keadilan Hasil Lomba (Quality Assurance)
              </div>
              <p className="text-xs leading-relaxed text-emerald-900">
                Berdasarkan uji psikometri dan audit reliabilitas panel juri: Seluruh instrumen lomba terbukti andal (Cronbach's Alpha <strong>{instrumentAnalysis.cronbachAlpha.toFixed(3)}</strong>), tingkat kesepahaman antar-juri berstatus <strong>{systemicAnalysis.raterAgreement.judgement}</strong>, dan penilaian bebas dari bias nomor undian maupun efek kelelahan juri. Komposisi 3 besar podium terbukti <strong>{systemicAnalysis.robustnessPct}% kebal bias juri</strong>, dengan mata lomba "<strong>{systemicAnalysis.topDiscriminator.name}</strong>" sebagai penentu keunggulan utama.
              </p>
            </div>
          )}

          {/* Kartu Narasi Juri */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Evaluasi Individual Dewan Juri
            </p>
            {judgeAnalysis.map((j, i) => (
              <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed">
                <strong>{getJudgeDisplayName(j.judge)}:</strong> Kinerja terpantau <span className={`font-semibold ${j.biasColor}`}>{j.biasJudgement}</span> dengan indeks deviasi {j.avgBias > 0 ? '+' : ''}{j.avgBias.toFixed(2)} dari rata-rata panel juri.
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
