import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc, updateDoc, limit, writeBatch, getDocs } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { CATEGORIES, SCORING_CRITERIA, FLAT_CRITERIA } from '../lib/constants';
import { Maximize, Minimize, LogOut, Download, Plus, Search, Check, AlertCircle, Upload, Users, UserCog, ClipboardList, Eye, EyeOff, Edit2, Trash2, FileText, Printer, FileDown, Trophy, Info, RotateCcw, X, BarChart3, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import AuditEvaluasi from "../components/AuditEvaluasi";
import StatistikLomba from "../components/StatistikLomba";
import { utils, writeFile, read } from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatScore, roundTwoDecimals } from '../lib/utils';

interface Participant {
  id: string;
  number: string;
  name: string;
  category: string;
}

interface ScoreRecord {
  id: string;
  participantId: string;
  totalScore: number;
  finalScore?: number;
  timePenalty?: number;
  timerSeconds?: number;
  criteriaScores?: Record<string, number>;
  isDisqualified?: boolean;
  disqualificationReason?: string;
}

interface AppUserDoc {
  id: string;
  email: string; // we'll use this for username
  role: string;
  assignedCategories?: string[];
  assignedPosts?: string[];
  password?: string;
}

export function AdminDashboard() {
  const { user, logoutCustom, loginCustom } = useAuth();
  const isSuperAdmin = user?.appRole === 'super_admin';
  const canManageParticipants = isSuperAdmin || user?.appRole === 'admin';
  const [activeMainTab, setActiveMainTab] = useState<'peserta' | 'rekap' | 'leaderboard' | 'users' | 'ekspor' | 'statistik' | 'trash'>(user?.appRole === 'admin_leaderboard' ? 'leaderboard' : 'peserta');
  const [statSubTab, setStatSubTab] = useState<'lomba' | 'audit' | 'semua'>('lomba');
  const [trashParticipants, setTrashParticipants] = useState<Participant[]>([]);
  const [trashScores, setTrashScores] = useState<ScoreRecord[]>([]);
  const [trashSearch, setTrashSearch] = useState('');
  const [trashConfirm, setTrashConfirm] = useState<{
    action: 'delete' | 'delete-bulk';
    type: 'participant' | 'score';
    id?: string;
  } | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [search, setSearch] = useState('');
  const [rekapSortConfig, setRekapSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleRekapSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (rekapSortConfig && rekapSortConfig.key === key) {
      if (rekapSortConfig.direction === 'asc') direction = 'desc';
      else {
        setRekapSortConfig(null);
        return;
      }
    }
    setRekapSortConfig({ key, direction });
  };
  const [isImpersonateModalOpen, setIsImpersonateModalOpen] = useState(false);
  const [selectedJudgeToImpersonate, setSelectedJudgeToImpersonate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua Kategori');
  
  // Add participant form
  const [institutionName, setInstitutionName] = useState('');
  const [newSquads, setNewSquads] = useState<{ id: string, number: string, category: string, customName?: string }[]>([{ id: 'init', number: '', category: CATEGORIES[0] }]);
  const [isAdding, setIsAdding] = useState(false);

  // Bulk import form
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // User Management
  const [appUsers, setAppUsers] = useState<AppUserDoc[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSortConfig, setUserSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [newUserRole, setNewUserRole] = useState<'admin' | 'admin_leaderboard' | 'judge'>('judge');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [localToast, setLocalToast] = useState<{ message: string, x: number, y: number } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleShowLocalToast = (message: string, e: React.MouseEvent) => {
    setLocalToast({ message, x: e.clientX, y: e.clientY });
    setTimeout(() => setLocalToast(null), 2500);
  };

      const [newUserCategories, setNewUserCategories] = useState<string[]>([]);
  const [newUserPosts, setNewUserPosts] = useState<string[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [participantToReset, setParticipantToReset] = useState<any>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [participantForDetail, setParticipantForDetail] = useState<any>(null);
  const [participantToRestoreDisqualified, setParticipantToRestoreDisqualified] = useState<any>(null);
  const [judgeToReset, setJudgeToReset] = useState<string>('all');
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [showTieBreakerInfo, setShowTieBreakerInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isImportUserModalOpen, setIsImportUserModalOpen] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedParticipantsForDelete, setSelectedParticipantsForDelete] = useState<string[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedScoresForBulk, setSelectedScoresForBulk] = useState<string[]>([]);
  const [isBulkProcessingScores, setIsBulkProcessingScores] = useState(false);
  const [isConfirmingBulkReset, setIsConfirmingBulkReset] = useState(false);
  const [isConfirmingBulkRestore, setIsConfirmingBulkRestore] = useState(false);


  useEffect(() => {
    setSelectedScoresForBulk([]);
    setSelectedParticipantsForDelete([]);
  }, [selectedCategory, search]);

  useEffect(() => {
    setSelectedScoresForBulk([]);
    setSelectedParticipantsForDelete([]);
  }, [selectedCategory, search]);

  const handleBulkResetScores = () => {
    if (selectedScoresForBulk.length === 0) return;
    setIsConfirmingBulkReset(true);
  };
  
  const executeBulkResetScores = async () => {
    setIsConfirmingBulkReset(false);
    
    setIsBulkProcessingScores(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      selectedScoresForBulk.forEach(pId => {
        const pScores = scores.filter((s: any) => s.participantId === pId);
        pScores.forEach((score: any) => {
          batch.update(doc(db, 'scores', score.id), { deletedAt: new Date().toISOString() });
          count++;
        });
      });
      if (count > 0) {
        await batch.commit();
        showToast(`Berhasil mereset ${count} nilai`, 'success');
      } else {
        showToast('Tidak ada nilai untuk direset', 'error');
      }
      setSelectedScoresForBulk([]);
    } catch (err) {
      console.error(err);
      showToast('Gagal melakukan reset massal', 'error');
    } finally {
      setIsBulkProcessingScores(false);
    }
  };

  const handleBulkRestoreDisqualified = () => {
    if (selectedScoresForBulk.length === 0) return;
    setIsConfirmingBulkRestore(true);
  };
  
  const executeBulkRestoreDisqualified = async () => {
    setIsConfirmingBulkRestore(false);

    setIsBulkProcessingScores(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      selectedScoresForBulk.forEach(pId => {
        const pScores = scores.filter((s: any) => s.participantId === pId && s.isDisqualified);
        pScores.forEach((score: any) => {
          batch.update(doc(db, 'scores', score.id), { deletedAt: new Date().toISOString() });
          count++;
        });
      });
      if (count > 0) {
        await batch.commit();
        showToast(`Berhasil memulihkan status diskualifikasi`, 'success');
      } else {
        showToast('Tidak ada status diskualifikasi untuk dipulihkan', 'error');
      }
      setSelectedScoresForBulk([]);
    } catch (err) {
      console.error(err);
      showToast('Gagal melakukan pemulihan massal', 'error');
    } finally {
      setIsBulkProcessingScores(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (leaderboardRef.current?.requestFullscreen) {
        leaderboardRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'participants'), orderBy('number'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
      setParticipants(data.filter((p: any) => !p.deletedAt));
      setTrashParticipants(data.filter((p: any) => p.deletedAt).sort((a: any, b: any) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()));
    }, (error) => {
      console.error("Firestore onSnapshot error (participants):", error);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'scores'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScoreRecord));
      setScores(data.filter((s: any) => !s.deletedAt));
      setTrashScores(data.filter((s: any) => s.deletedAt).sort((a: any, b: any) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()));
    }, (error) => {
      console.error("Firestore onSnapshot error (scores):", error);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (canManageParticipants) {
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUserDoc));
        setAppUsers(data);
      }, (error) => {
        console.error("Firestore onSnapshot error (users):", error);
      });
      return () => unsubscribe();
    }
  }, [canManageParticipants]);

  useEffect(() => {
    if (canManageParticipants) {
      const qLogs = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(100));
      const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActivityLogs(logs);
      }, (error) => {
        console.error("Firestore onSnapshot error (activity_logs):", error);
      });

      return () => {
        unsubscribeLogs();
      };
    }
  }, [canManageParticipants]);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName) return;
    setIsAdding(true);
    try {
      const batch = writeBatch(db);
      for (const squad of newSquads) {
        if (!squad.number) continue;
        const participantName = squad.customName || institutionName;
        const docId = `P_${squad.number}_${squad.category.replace(/[^a-zA-Z0-9]/g, '')}`;
        batch.set(doc(db, 'participants', docId), {
          number: squad.number,
          name: participantName,
          category: squad.category
        });
      }
      await batch.commit();
      
      setInstitutionName('');
      setNewSquads([{ id: Date.now().toString(), number: '', category: CATEGORIES[0] }]);
    } catch(err) {
      console.error(err);
      showToast('Gagal menambahkan peserta', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    try {
      await setDoc(doc(db, 'participants', editingParticipant.id), {
        number: editingParticipant.number,
        name: editingParticipant.name,
        category: editingParticipant.category
      }, { merge: true });
      setEditingParticipant(null);
      setSelectedParticipantId(null);
      showToast('Berhasil memperbarui peserta', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal memperbarui peserta', 'error');
    }
  };

  const handleRestoreDisqualified = async () => {
    if (!participantToRestoreDisqualified) return;
    try {
      const disqualifiedScores = participantToRestoreDisqualified.pScores.filter((s: any) => s.isDisqualified);
      for (const score of disqualifiedScores) {
         await updateDoc(doc(db, 'scores', score.id), { deletedAt: new Date().toISOString() });
      }
      setParticipantToRestoreDisqualified(null);
      showToast('Diskualifikasi berhasil dibatalkan', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal membatalkan diskualifikasi', 'error');
    }
  };

  const handleDeleteParticipant = async () => {
    if (!participantToDelete) return;
    try {
      await updateDoc(doc(db, 'participants', participantToDelete), { deletedAt: new Date().toISOString() });
      setParticipantToDelete(null);
      setSelectedParticipantId(null);
      showToast('Berhasil menghapus peserta', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal menghapus peserta', 'error');
    }
  };

  const handleBulkDeleteParticipants = async () => {
    if (selectedParticipantsForDelete.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const deletePromises = selectedParticipantsForDelete.map(id => 
        updateDoc(doc(db, 'participants', id), {
          deletedAt: new Date().toISOString()
        })
      );
      await Promise.all(deletePromises);
      showToast(`${selectedParticipantsForDelete.length} peserta berhasil dihapus`, 'success');
      setSelectedParticipantsForDelete([]);
      setIsConfirmingBulkDelete(false);
    } catch (error) {
      console.error("Error bulk deleting participants:", error);
      showToast('Gagal menghapus beberapa peserta', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  

  const generateDetailPDF = (participant: any, detailScores: ScoreRecord[], autoDownload = true, docParam?: jsPDF) => {
    const doc = docParam || new jsPDF('p', 'mm', 'a4');
    
    const validScores = detailScores.filter(s => !s.isDisqualified);
    const s1 = validScores[0];
    const s2 = validScores[1];

    let validTimer = 0;
    const timers = validScores.map(s => s.timerSeconds || 0).filter(t => t > 0);
    if (timers.length > 0) validTimer = Math.min(...timers);
    
    const maxExcess = Math.max(0, validTimer - 300);
    const totalPenalty = roundTwoDecimals(maxExcess * (5 / 60));

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
    const grandTotal = roundTwoDecimals(avgRaw - totalPenalty);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NILAI LKBB DAN YEL-YEL", 105, 15, { align: 'center' });
    
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "normal");
    
    doc.text("Kategori", 14, 23); doc.text(`: ${participant.category}`, 45, 23);
    doc.text("Nomor Peserta", 14, 28); doc.text(`: ${participant.number}`, 45, 28);
    doc.text("Nama Regu", 14, 33); doc.text(`: ${participant.name}`, 45, 33);
    doc.text("Nilai Akhir", 14, 38); doc.text(`: ${formatScore(grandTotal)}`, 45, 38);

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
       doc.text(`STATUS: DISKUALIFIKASI`, 14, currentY);
       doc.setTextColor(0, 0, 0);
       currentY += 10;
    }

    const tableData: any[] = [];
    
    pdfGroups.forEach(group => {
      tableData.push([
        { content: group.title, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], cellPadding: 2 } }
      ]);
      const groupCriteria = criteriaDef.filter((c: any) => c.id.startsWith(group.prefix));
      groupCriteria.forEach((crit: any, index: number) => {
        const numberStr = groupCriteria.length > 1 ? (index + 1) + '.' : '';
        tableData.push([
          { content: numberStr, styles: { cellPadding: { left: 1.5, top: 1.5, bottom: 1.5, right: 1 }, halign: 'right' } },
          { content: `${crit.name}\n${crit.desc}`, styles: { cellPadding: { left: 1, top: 1.5, bottom: 1.5, right: 1.5 } } },
          { content: s1?.criteriaScores?.[crit.id] ?? '-', styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', cellPadding: 1.5 } },
          { content: s2?.criteriaScores?.[crit.id] ?? '-', styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', cellPadding: 1.5 } }
        ]);
      });
    });
    tableData.push([
      { content: 'Total Nilai (Sebelum Penalti)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250], cellPadding: 2 } },
      { content: s1 ? formatScore(raw1) : '-', styles: { fontStyle: 'bold', halign: 'center', fillColor: [250, 250, 250], cellPadding: 2 } },
      { content: s2 ? formatScore(raw2) : '-', styles: { fontStyle: 'bold', halign: 'center', fillColor: [250, 250, 250], cellPadding: 2 } }
    ]);
    
    tableData.push([
      { content: maxExcess > 0 ? `Penalti Waktu (Kelebihan: ${maxExcess} dtk)` : 'Penalti Waktu (Aman/Tepat Waktu)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 240, 240], cellPadding: 2 } },
      { content: totalPenalty > 0 ? `-${formatScore(totalPenalty)}` : '-', styles: { fontStyle: 'bold', halign: 'center', textColor: [200,0,0], fillColor: [255, 240, 240], cellPadding: 2 } },
      { content: totalPenalty > 0 ? `-${formatScore(totalPenalty)}` : '-', styles: { fontStyle: 'bold', halign: 'center', textColor: [200,0,0], fillColor: [255, 240, 240], cellPadding: 2 } }
    ]);
    
    tableData.push([
      { content: 'NILAI AKHIR GABUNGAN', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [220, 240, 220], cellPadding: 3, fontSize: 11 } },
      { content: formatScore(grandTotal), styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 240, 220], cellPadding: 3, fontSize: 11 } }
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[{content: 'Kriteria Penilaian', colSpan: 2}, 'Juri 1', 'Juri 2']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 5 },
        1: { cellWidth: 125 },
        2: { cellWidth: 26 },
        3: { cellWidth: 26 }
      },
      styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: [200, 200, 200] },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.raw.length === 4) {
          if (data.column.index === 0) {
            data.cell.styles.lineWidth = { top: 0.1, right: 0, bottom: 0.1, left: 0.1 };
          } else if (data.column.index === 1) {
            data.cell.styles.lineWidth = { top: 0.1, right: 0.1, bottom: 0.1, left: 0 };
          }
        }
      },
      didDrawPage: (data: any) => {
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
        const pad = (n: number) => String(n).padStart(2, '0');
        const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
        
        doc.text(timeStr, 14, footerY);
        
        const pageStr = `Hal. ${data.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`;
        doc.text(pageStr, pageWidth / 2, footerY, { align: 'center' });
        
        const pInfo = `${participant.number} ${participant.name}`;
        doc.text(pInfo, pageWidth - 14, footerY, { align: 'right' });
      }
    });

    if (autoDownload) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
      const cleanName = participant.name.replace(/[^a-zA-Z0-9 ]/g, '');
      const filename = `LKBB dan Yel-Yel Nilai Rinci ${participant.number} ${participant.category} ${cleanName} ${timeStr}.pdf`;
      doc.save(filename);
    }
  };

  const exportSemuaNilaiRinci = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const allParticipants = participants.filter(p => {
        const pScores = scores.filter(s => s.participantId === p.id);
        return pScores.length > 0;
      });
      
      if (allParticipants.length === 0) {
        showToast('Belum ada data nilai peserta.', 'error');
        return;
      }

      allParticipants.forEach((p, index) => {
        if (index > 0) doc.addPage();
        const pScores = scores.filter(s => s.participantId === p.id);
        generateDetailPDF(p, pScores, false, doc);
      });
      
      const now = new Date();
      doc.save(generateExportFilename('Semua Nilai Rinci Regu', 'pdf'));
      showToast('Berhasil mengekspor semua nilai rinci', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor nilai rinci', 'error');
    }
  };

  const handleResetParticipantScore = async () => {
    if (!participantToReset) return;
    try {
      const pScores = scores.filter(s => s.participantId === participantToReset.id);
      const scoresToDelete = judgeToReset === 'all' 
    ? pScores 
    : pScores.filter((score: any) => (score.judgeName || score.judgeId) === judgeToReset);

      if (scoresToDelete.length === 0) {
        showToast('Tidak ada nilai untuk juri tersebut', 'error');
        return;
      }

      for (const score of scoresToDelete) {
        await updateDoc(doc(db, 'scores', score.id), { deletedAt: new Date().toISOString() });
      }
      setParticipantToReset(null);
      setJudgeToReset('all');
      showToast('Berhasil mereset nilai peserta', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mereset nilai peserta', 'error');
    }
  };

  const handleResetAllScores = async () => {
    try {
      const maxBatchSize = 500;
      for (let i = 0; i < scores.length; i += maxBatchSize) {
        const batch = writeBatch(db);
        const chunk = scores.slice(i, i + maxBatchSize);
        for (const score of chunk) {
          batch.update(doc(db, 'scores', score.id), { deletedAt: new Date().toISOString() });
        }
        await batch.commit();
      }
      setIsResettingAll(false);
      showToast('Berhasil mereset semua nilai', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mereset semua nilai', 'error');
    }
  };

  
  const handleRestoreParticipant = async (id: string) => {
    try {
      await updateDoc(doc(db, 'participants', id), { deletedAt: null });
      showToast('Peserta berhasil dipulihkan', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal memulihkan peserta', 'error');
    }
  };

  const executeTrashAction = async () => {
    if (!trashConfirm) return;
    const { action, type, id } = trashConfirm;
    try {
      if (action === 'delete') {
        if (type === 'participant' && id) await deleteDoc(doc(db, 'participants', id));
        if (type === 'score' && id) await deleteDoc(doc(db, 'scores', id));
        showToast(`${type === 'participant' ? 'Peserta' : 'Nilai'} dihapus permanen`, 'success');
      } else if (action === 'delete-bulk') {
        if (type === 'participant') {
          for (const p of trashParticipants) await deleteDoc(doc(db, 'participants', p.id));
        }
        if (type === 'score') {
          for (const s of trashScores) await deleteDoc(doc(db, 'scores', s.id));
        }
        showToast(`Semua ${type === 'participant' ? 'peserta' : 'nilai'} dihapus permanen`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus permanen', 'error');
    }
    setTrashConfirm(null);
  };

  const handleBulkRestoreParticipants = async () => {
    try {
      for (const p of trashParticipants) {
        await updateDoc(doc(db, 'participants', p.id), { deletedAt: null });
      }
      showToast('Semua peserta berhasil dipulihkan', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal memulihkan peserta', 'error');
    }
  };

  const handleBulkRestoreScores = async () => {
    try {
      for (const s of trashScores) {
        await updateDoc(doc(db, 'scores', s.id), { deletedAt: null });
      }
      showToast('Semua nilai berhasil dipulihkan', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal memulihkan nilai', 'error');
    }
  };

  const handleHardDeleteParticipant = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'participants', id));
      showToast('Peserta dihapus permanen', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal menghapus permanen', 'error');
    }
  };

  const handleRestoreScore = async (id: string) => {
    try {
      await updateDoc(doc(db, 'scores', id), { deletedAt: null });
      showToast('Nilai berhasil dipulihkan', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal memulihkan nilai', 'error');
    }
  };

  const handleHardDeleteScore = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scores', id));
      showToast('Nilai dihapus permanen', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal menghapus permanen', 'error');
    }
  };


  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    worksheet.columns = [
      { header: 'No Urut', key: 'number', width: 15 },
      { header: 'Nama Regu', key: 'name', width: 40 },
      { header: 'Kategori', key: 'category', width: 25 },
    ];
    worksheet.addRow({ number: '001', name: 'SDN SUKARESMI 1', category: 'SD PUTRA' });
    worksheet.addRow({ number: '002', name: 'SDN SIDAMUKTI 2', category: 'SD PUTRI' });
    
    // Add dropdown validation for the Category column
    const categoryCol = worksheet.getColumn('C');
    categoryCol.eachCell((cell, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${CATEGORIES.join(',')}"`]
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `Template Impor Peserta ${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}.xlsx`;
    link.setAttribute("download", filename);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) {
      showToast('Pilih file Excel terlebih dahulu', 'error');
      return;
    }
    setIsBulkAdding(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await bulkFile.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      
      const getCellText = (cell: ExcelJS.Cell) => {
        if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
          return (cell.value as any).richText.map((rt: any) => rt.text).join('').trim();
        }
        return cell.text ? cell.text.trim() : (cell.value ? String(cell.value).trim() : '');
      };

      const rowsToImport: { num: string, name: string, category: string }[] = [];
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        const numberCell = getCellText(row.getCell(1));
        const nameCell = getCellText(row.getCell(2));
        const categoryCell = getCellText(row.getCell(3));
        
        if (numberCell && nameCell && categoryCell) {
          const num = numberCell.padStart(3, '0');
          const name = nameCell;
          const category = categoryCell;
          
          const validCategory = CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
          if (!validCategory) {
            console.warn(`Kategori tidak valid: ${category}`);
            return;
          }
          
          rowsToImport.push({ num, name, category: validCategory });
        }
      });
      
      let imported = 0;
      for (const data of rowsToImport) {
          const docId = `P_${data.num}_${data.category.replace(/[^a-zA-Z0-9]/g, '')}`;
          await setDoc(doc(db, 'participants', docId), {
            number: data.num,
            name: data.name,
            category: data.category
          });
          imported++;
      }
      
      setBulkFile(null);
      showToast(`Berhasil mengimpor ${imported} peserta`, 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mengimpor file Excel. Pastikan format sesuai template.', 'error');
    } finally {
      setIsBulkAdding(false);
    }
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const closeUserModal = () => {
    setEditingUserId(null);
    setNewUserEmail('');
    setNewUserPass('');
    setNewUserPosts([]);
    
    setIsUserModalOpen(false);
  };

  const startEditUser = (u: AppUserDoc) => {
    setEditingUserId(u.id);
    setNewUserEmail(u.email);
    setNewUserPass('');
    setNewUserRole(u.role as 'admin' | 'admin_leaderboard' | 'judge');
            setNewUserCategories((u.assignedCategories && u.assignedCategories.length > 0) ? u.assignedCategories : (u.role === 'judge' ? CATEGORIES : []));
    
    setNewUserPosts((u.assignedPosts && u.assignedPosts.length > 0) ? u.assignedPosts : (u.role === 'judge' ? ['Juri 1', 'Juri 2'] : []));
    setIsUserModalOpen(true);
  };

  const confirmDeleteUser = (userId: string) => {
    setUserToDelete(userId);
  };

  const handleBulkDeleteUsers = () => {
    if (selectedUsers.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const executeBulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;
    try {
      const batch = writeBatch(db);
      selectedUsers.forEach(id => {
        batch.delete(doc(db, 'users', id));
      });
      await batch.commit();
      setSelectedUsers([]);
      showToast(`Berhasil menghapus ${selectedUsers.length} pengguna`, 'success');
    } catch (err: any) {
      showToast('Gagal menghapus pengguna: ' + err.message, 'error');
    } finally {
      setShowBulkDeleteConfirm(false);
    }
  };

  const generateExportFilename = (name: string, ext: string) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${name} ${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}.${ext}`;
  };

  const exportUsersXlsx = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Pengguna');
    
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama Pengguna', key: 'username', width: 25 },
      { header: 'Password', key: 'password', width: 20 },
      { header: 'Peran', key: 'role', width: 20 },
      { header: 'Kategori Akses', key: 'categories', width: 30 }
    ];
    
    // Style headers
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
    
    appUsers.forEach((u, i) => {
      worksheet.addRow({
        no: i + 1,
        username: u.email,
        password: u.password || '',
        role: u.role === 'admin' ? 'Admin' : u.role === 'admin_leaderboard' ? 'Admin Leaderboard' : u.role === 'super_admin' ? 'Super Admin' : 'Juri',
        categories: u.assignedCategories ? u.assignedCategories.join(', ') : '-'
      });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateExportFilename("Data Pengguna LKBB dan Yel-Yel", "xlsx");
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const requestUserSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (userSortConfig && userSortConfig.key === key && userSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setUserSortConfig({ key, direction });
  };
  
  const sortedAppUsers = React.useMemo(() => {
    let sortableUsers = [...appUsers];
    if (userSortConfig !== null) {
      sortableUsers.sort((a, b) => {
        let valA = '';
        let valB = '';
        if (userSortConfig.key === 'username') { valA = a.email; valB = b.email; }
        else if (userSortConfig.key === 'role') { valA = a.role; valB = b.role; }
        
        else if (userSortConfig.key === 'categories') { valA = a.assignedCategories?.join(',') || ''; valB = b.assignedCategories?.join(',') || ''; }
        
        if (valA < valB) return userSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return userSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableUsers;
  }, [appUsers, userSortConfig]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setUserToDelete(null);
      showToast('Pengguna berhasil dihapus', 'success');
    } catch (err: any) {
      showToast('Gagal menghapus pengguna: ' + err.message, 'error');
    }
  };

  const handleDownloadUserTemplate = () => {
    const ws = utils.aoa_to_sheet([
      ['Nama Pengguna', 'Password', 'Peran', 'Kategori'],
      ['juri_sd1', 'rahasia123', 'juri', 'SD Putra, SD Putri'],
      ['juri_smp2', 'rahasia123', 'juri', 'SMP Putra, SMP Putri'],
      ['admin_pusat', 'admin123', 'admin', ''],
      ['admin_nilai', 'admin123', 'admin_leaderboard', '']
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template Juri");
    writeFile(wb, "Template_Import_Akun.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Skip header
        const usersToImport = rows.slice(1).filter(row => row[0] && row[1]); 

        if (usersToImport.length === 0) {
          showToast('File Excel kosong atau tidak sesuai format', 'error');
          return;
        }

        setIsCreatingUser(true);
        const batch = writeBatch(db);
        let count = 0;

        for (const row of usersToImport) {
          const username = String(row[0]).trim();
          const password = String(row[1]);
          const peranText = String(row[2] || 'juri').toLowerCase();
          const role = peranText.includes('leaderboard') ? 'admin_leaderboard' : peranText.includes('admin') ? 'admin' : 'judge';
          
          const posRaw = String(row[3] || '');
          

          const catRaw = String(row[4] || '');
          const cats = catRaw ? catRaw.split(',').map(c => {
            const rawCat = c.trim().toLowerCase().replace(/\s+/g, '');
            return CATEGORIES.find(cat => cat.toLowerCase().replace(/\s+/g, '') === rawCat) || '';
          }).filter(Boolean) : [];

          if (role === 'judge' && cats.length === 0) {
            // Jika kosong, berikan semua kategori agar tidak gagal impor
            cats.push(...CATEGORIES);
          }

          const userData = {
            email: username,
            password: password,
            role: role,
                                    assignedCategories: role === 'judge' ? cats : null,
            createdAt: new Date().toISOString()
          };

          batch.set(doc(db, 'users', username), userData);
          count++;
        }

        await batch.commit();
        showToast(`Berhasil mengimpor ${count} akun`, 'success');
        setIsImportUserModalOpen(false);
      } catch (error) {
        console.error(error);
        showToast('Gagal memproses file Excel', 'error');
      } finally {
        setIsCreatingUser(false);
        if (importFileInputRef.current) {
          importFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return;
    if (newUserRole === 'judge' && (newUserCategories.length === 0 || newUserPosts.length === 0)) {
      showToast("Pilih minimal satu kategori dan satu tugas untuk juri", 'error');
      return;
    }
    if (newUserRole === 'judge' && newUserCategories.length === 0) {
      showToast("Pilih minimal satu kategori untuk juri", 'error');
      return;
    }
    setIsCreatingUser(true);
    try {
      const processedEmail = newUserEmail.trim();
      const targetDocId = processedEmail;
      
      const payload: any = {
        email: processedEmail,
        role: newUserRole,
                        assignedCategories: newUserRole === 'judge' ? newUserCategories : null,
        assignedPosts: newUserRole === 'judge' ? newUserPosts : null
      };
      
      if (newUserPass) {
         payload.password = newUserPass;
      }
      
      if (editingUserId && editingUserId !== targetDocId) {
        // Username changed
        const oldDocRef = doc(db, 'users', editingUserId);
        const newDocRef = doc(db, 'users', targetDocId);
        
        // Find existing user in appUsers to copy password if not set
        const oldUser = appUsers.find(u => u.id === editingUserId);
        if (oldUser && !newUserPass && oldUser.password) {
           payload.password = oldUser.password;
        }
        
        await setDoc(newDocRef, payload, { merge: true });
        
        // Update all scores that belonged to this judge to point to the new ID
        const scoresRef = collection(db, 'scores');
        const scoresSnap = await getDocs(scoresRef);
        const batch = writeBatch(db);
        let batchCount = 0;
        scoresSnap.forEach(sDoc => {
           if (sDoc.data().judgeId === editingUserId) {
              batch.update(doc(db, 'scores', sDoc.id), { judgeId: targetDocId });
              batchCount++;
           }
        });
        if (batchCount > 0) {
           await batch.commit();
        }

        await deleteDoc(oldDocRef);
      } else {
        const userDocRef = doc(db, 'users', targetDocId);
        await setDoc(userDocRef, payload, { merge: true });
      }
      
      showToast(editingUserId ? 'Berhasil memperbarui akun' : 'Berhasil mendaftarkan akun', 'success');
      setEditingUserId(null);
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserCategories([]);
    setNewUserPosts([]);
    
      setIsUserModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menyimpan akun: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const filteredParticipants = participants.filter(p => 
    (p.name.toLowerCase().includes(search.toLowerCase()) || 
     p.number.includes(search)) &&
    (selectedCategory === 'Semua Kategori' || p.category === selectedCategory)
  );

  const activeCategories = selectedCategory === 'Semua Kategori' ? CATEGORIES : [selectedCategory];

  const groupedParticipants = activeCategories.map(category => ({
    category,
    participants: filteredParticipants.filter(p => p.category === category).sort((a, b) => a.number.localeCompare(b.number))
  })).filter(group => group.participants.length > 0 || search === '');

  const groupedScores = activeCategories.map(category => {
    const catParticipants = filteredParticipants.filter(p => p.category === category);
    
    
    const participantsWithScores = catParticipants.map(p => {
      const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
      
      const isDisqualified = scores.some(s => s.participantId === p.id && s.isDisqualified);
      const disqualificationReason = scores.find(s => s.participantId === p.id && s.isDisqualified)?.disqualificationReason || '';
      
      let juri1Total = 0;
      let juri2Total = 0;
      let totalPenalty = 0;
      let grandTotal = 0;
      let excess = 0;
      if (pScores.length > 0) {
        const validScores = pScores.filter((s:any) => !s.isDisqualified);
        
        let s1: any = null;
        let s2: any = null;

        validScores.forEach((s: any) => {
          const judgeUser = appUsers.find(u => u.id === s.judgeId);
          if (judgeUser && judgeUser.role === 'judge') {
            const hasCorrectCategory = !judgeUser.assignedCategories || judgeUser.assignedCategories.length === 0 || judgeUser.assignedCategories.includes(p.category);
            if (hasCorrectCategory) {
              if (judgeUser.assignedPosts?.includes('Juri 1')) {
                if (!s1) s1 = s;
              } else if (judgeUser.assignedPosts?.includes('Juri 2')) {
                if (!s2) s2 = s;
              } else {
                if (!s1) s1 = s;
                else if (!s2) s2 = s;
              }
            }
          } else {
            if (!s1) s1 = s;
            else if (!s2) s2 = s;
          }
        });

        juri1Total = roundTwoDecimals(s1?.totalScore || 0);
        juri2Total = roundTwoDecimals(s2?.totalScore || 0);

        const raw1 = juri1Total;
        const raw2 = juri2Total;

        let validTimer = 0;
        const usedScores = [s1, s2].filter(Boolean);
        const timers = usedScores.map((s:any) => s.timerSeconds || 0).filter((t:number) => t > 0);
        if (timers.length > 0) validTimer = Math.min(...timers);
        
        excess = Math.max(0, validTimer - 300);
        totalPenalty = roundTwoDecimals(excess * (5 / 60));

        let avgRaw = 0;
        if (s1 && s2) {
           avgRaw = raw1 + raw2; 
        } else if (s1) {
           avgRaw = raw1;
        } else if (s2) {
           avgRaw = raw2;
        }
        
        grandTotal = roundTwoDecimals(avgRaw - totalPenalty);
      }
      
      return { 
        ...p, 
        juri1Total, 
        juri2Total,
        totalPenalty,
        excessSeconds: excess,
        grandTotal,
        isDisqualified,
        disqualificationReason
      };
    });

        return {
      category,
      participants: (() => {
        // First sort by grand total descending
        const sorted = participantsWithScores.sort((a, b) => b.grandTotal - a.grandTotal);
        // Then assign rank based on grandTotal > 0, handling ties
        let currentRank = 1;
        let previousScore = null;
        let tieCount = 0;
        
        return sorted.map((p, index) => {
          if (p.isDisqualified) {
             return { ...p, rank: '-' };
          }
          if (p.grandTotal === 0) {
             return { ...p, rank: '-' };
          }
          if (previousScore !== null && p.grandTotal === previousScore) {
             tieCount++;
             return { ...p, rank: currentRank };
          }
          currentRank += tieCount;
          if (previousScore === null) {
             currentRank = 1; // reset for first element just in case
          }
          previousScore = p.grandTotal;
          tieCount = 1;
          const assignedRank = currentRank;
          return { ...p, rank: assignedRank };
        });
      })()
    };
  });

  // Rekap Nilai: Urutkan default sesuai nomor urut peserta, atau sesuai kolom yang dipilih via rekapSortConfig
  const displayGroupedScores = useMemo(() => {
    return groupedScores.map(group => {
      const sorted = [...group.participants].sort((a, b) => {
        if (!rekapSortConfig) {
          // Default: Diurutkan sesuai nomor urut peserta
          return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true, sensitivity: 'base' });
        }
        const { key, direction } = rekapSortConfig;
        let valA: any = a[key as keyof typeof a];
        let valB: any = b[key as keyof typeof b];

        // Normalisasi sorting
        if (key === 'number') {
          return direction === 'asc'
            ? (a.number || '').localeCompare(b.number || '', undefined, { numeric: true, sensitivity: 'base' })
            : (b.number || '').localeCompare(a.number || '', undefined, { numeric: true, sensitivity: 'base' });
        }
        if (key === 'name') {
          return direction === 'asc'
            ? (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            : (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' });
        }
        if (key === 'rank') {
          const rankA = a.rank === '-' || a.rank === undefined ? 9999 : Number(a.rank);
          const rankB = b.rank === '-' || b.rank === undefined ? 9999 : Number(b.rank);
          return direction === 'asc' ? rankA - rankB : rankB - rankA;
        }

        // Nilai angka (p1Total, p2Total, p3Total, grandTotal, dll)
        const numA = typeof valA === 'number' ? valA : 0;
        const numB = typeof valB === 'number' ? valB : 0;
        return direction === 'asc' ? numA - numB : numB - numA;
      });

      return {
        ...group,
        participants: sorted
      };
    });
  }, [groupedScores, rekapSortConfig]);

  
  const exportDaftarPesertaExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      CATEGORIES.forEach(category => {
        const catParticipants = participants.filter(p => p.category === category);
        if (catParticipants.length === 0) return;
        
        const worksheet = workbook.addWorksheet(category.substring(0, 31).replace(/[\\/*?:\[\]]/g, ''));
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
  };

    const exportFormatPenilaian = async () => {
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
            { content: `${crit.name}\n${crit.desc}`, styles: { cellPadding: { left: 1, top: 1.5, bottom: 1.5, right: 1.5 } } },
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
        doc.text("Kategori", 14, 30); doc.text(`: ${p.category}`, 45, 30);
        doc.text("Nomor Peserta", 14, 35); doc.text(`: ${p.number}`, 45, 35);
        
        
        
        autoTable(doc, {
          startY: 40,
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
            if (data.section === 'body' && Array.isArray(data.row.raw) && data.row.raw.length === 3) {
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
            
            const pageStr = `Hal. ${data.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`;
            doc.text(pageStr, pageWidth / 2, footerY, { align: 'center' });
            
            const pInfo = `${p.number} ${p.category}`;
            doc.text(pInfo, pageWidth - 14, footerY, { align: 'right' });
          }
        });
        
                // Add signature box
        let finalY = ((doc as any).lastAutoTable?.finalY || 240) + 8; // Dikurangi dari 15 ke 8 agar lebih compact
        if (finalY > 260) {
          doc.addPage();
          finalY = 30;
        }
        doc.setFontSize(10);
        doc.text("Sukaresmi, ........................... 202...", 130, finalY); // Serang -> Sukaresmi
        doc.text("Juri Penilai,", 145, finalY + 4); // Jarak dikompres
        doc.text("( .......................................... )", 130, finalY + 22); // Jarak kurung ditarik ke atas
      });
      
      doc.save(generateExportFilename("Blanko Penilaian LKBB", "pdf"));
      showToast('Berhasil mengekspor blanko penilaian', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor blanko penilaian', 'error');
    }
  };

            const exportHasilLomba = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      if (participants.length === 0) {
        showToast('Belum ada data peserta', 'error');
        return;
      }
      
      const dateStr = "19 September 2026";
      const dayStr = "Sabtu";
      const year = "2026";
      
      // Cari Juri yang benar-benar memberikan nilai
      const judgeIdsWithScores = Array.from(new Set(scores.map((s:any) => s.judgeId)));
      const activeJudges = appUsers.filter(u => judgeIdsWithScores.includes(u.id) && u.role === 'judge');

      const j1 = activeJudges.find(u => u.assignedPosts?.includes('Juri 1')) || activeJudges[0];
      const j2 = activeJudges.find(u => u.assignedPosts?.includes('Juri 2')) || activeJudges.find(u => u.id !== j1?.id);

      const juri1Name = j1 ? (j1.name || j1.email || j1.id) : ".........................";
      const juri2Name = j2 ? (j2.name || j2.email || j2.id) : ".........................";

      let validCategories = CATEGORIES.filter(category => {
        const catGroup = groupedScores.find(g => g.category === category);
        return catGroup && catGroup.participants.length > 0;
      });

      if (validCategories.length === 0) {
        showToast('Belum ada data nilai untuk diekspor', 'error');
        return;
      }

      // --- PAGE 1: BERITA ACARA ---
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.text("BERITA ACARA HASIL LOMBA", 105, 25, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont("times", "normal");
      
      const baText = `Pada hari ini ${dayStr} tanggal Sembilan Belas bulan September tahun Dua Ribu Dua Puluh Enam bertempat di Cikuya Kecamatan Sukaresmi telah dilaksanakan Lomba Keterampilan Baris Berbaris (LKBB) dan Yel-Yel dalam Kegiatan Penjelajahan Pramuka Penggalang Tahun 2026.\n\nBerdasarkan kegiatan tersebut diperoleh hasil sebagaimana terlampir.\n\nDemikian Berita Acara ini dibuat untuk diketahui dan digunakan sebagaimana mestinya.`;
      
      const paragraphs = baText.split('\n\n');
      let currentY = 40;
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          // jsPDF secara otomatis akan men-justify seluruh baris KECUALI baris terakhir
          // jika kita memberikan string utuh (paragraf) beserta maxWidth
          doc.text(paragraph, 25, currentY, { align: 'justify', maxWidth: 160 });
          
          const lines = doc.splitTextToSize(paragraph, 160);
          // Tinggi bawaan jsPDF untuk size 11 adalah ~4.5mm per baris. 
          // Ditambah jarak antar paragraf 4mm.
          currentY += (lines.length * 4.5) + 4;
        }
      });
      
      doc.text(`Sukaresmi, ${dateStr}`, 105, 80, { align: 'center' });
      
      // Generate dynamic signature rows for judges
      const signatureData: any[] = [
        [1, "Mulyadi", "Ketua Kwarran", ""],
        [2, "Deden Sanarudin", "Koordinator Kegiatan", ""]
      ];

      // Ambil semua juri yang aktif dari database
      const allJudges = appUsers.filter(u => u.role === 'judge');
      
      // Prioritaskan juri resmi jika ada juri dengan nama sungguhan (bukan akun coba/test)
      const realJudges = allJudges.filter(u => {
        const username = (u.email || u.name || u.id || '').toLowerCase();
        return !username.includes('coba') && !username.includes('test');
      });
      const activeJudgesList = realJudges.length > 0 ? realJudges : allJudges;

      // Urutkan juri secara rapi: Putra terlebih dahulu, lalu Putri; Juri 1 lalu Juri 2
      const sortedJudges = [...activeJudgesList].sort((a, b) => {
        const catA = (a.assignedCategories || []).join(' ');
        const catB = (b.assignedCategories || []).join(' ');
        const postA = (a.assignedPosts || []).join(' ');
        const postB = (b.assignedPosts || []).join(' ');
        
        if (catA.includes('Putra') && !catB.includes('Putra')) return -1;
        if (!catA.includes('Putra') && catB.includes('Putra')) return 1;
        return postA.localeCompare(postB);
      });

      let sigIndex = 3;
      sortedJudges.forEach(j => {
        const judgeName = (j.email || j.name || j.id || '').trim();
        const posts = j.assignedPosts && j.assignedPosts.length > 0 ? j.assignedPosts.join(', ') : 'Juri';
        const cats = j.assignedCategories || [];
        
        let roleStr = posts;
        const isAllPutra = cats.length > 0 && cats.every((c) => c.toLowerCase().includes('putra'));
        const isAllPutri = cats.length > 0 && cats.every((c) => c.toLowerCase().includes('putri'));
        
        // Format persis: [Juri 1 atau Juri 2] - [Kategori]
        // Contoh: Juri 1 - SD & SMP Putra
        const hasSDPutra = cats.includes('SD Putra');
        const hasSMPPutra = cats.includes('SMP Putra');
        const hasSDPutri = cats.includes('SD Putri');
        const hasSMPPutri = cats.includes('SMP Putri');

        if (hasSDPutra && hasSMPPutra) {
          roleStr = `${posts} - SD & SMP Putra`;
        } else if (hasSDPutri && hasSMPPutri) {
          roleStr = `${posts} - SD & SMP Putri`;
        } else if (cats.length === 1) {
          roleStr = `${posts} - ${cats[0]}`;
        } else if (cats.length > 0) {
          roleStr = `${posts} - ${cats.join(' & ')}`;
        } else {
          roleStr = posts;
        }

        signatureData.push([
          sigIndex++,
          judgeName || ".........................",
          roleStr,
          ""
        ]);
      });

      // Fallback jika belum ada juri sama sekali di database
      if (sortedJudges.length === 0) {
        signatureData.push([sigIndex++, ".........................", "Juri 1", ""]);
        signatureData.push([sigIndex++, ".........................", "Juri 2", ""]);
      }

      autoTable(doc, {
        startY: 85,
        head: [['No.', 'Nama', 'Jabatan', 'Tanda Tangan']],
        body: signatureData,
        theme: 'plain',
        styles: { font: 'times', fontSize: 11, textColor: [0, 0, 0] },
        headStyles: { fontStyle: 'bold', halign: 'center', lineWidth: { top: 0.8, bottom: 0.4 }, lineColor: [0, 0, 0] },
        bodyStyles: { minCellHeight: 15, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 65, halign: 'center' },
          3: { cellWidth: 40 }
        },
        margin: { left: 20, right: 20 },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            let yPos = data.cell.y + (data.cell.height / 2) + 2;
            let xPos = data.cell.x + 5;
            let xEnd = data.cell.x + data.cell.width - 5;
            
            if (data.row.index % 2 === 0) {
              xEnd = xPos + 20;
            } else {
              xPos = xEnd - 20;
            }
            doc.line(xPos, yPos, xEnd, yPos);
          }
        }
      });
      
      doc.setFontSize(10);
      doc.text(`Hal. 1 dari ${validCategories.length + 2}`, 105, 285, { align: 'center' });

      // --- PAGE 2: LAMPIRAN 1 (DAFTAR JUARA) ---
      doc.addPage();
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.text("Lampiran 1", 15, 20);
      
      doc.setFont("times", "bold");
      doc.text("DAFTAR JUARA LKBB DAN YEL-YEL", 105, 30, { align: 'center' });
      doc.text("DALAM KEGIATAN PENJELAJAHAN PRAMUKA PENGGALANG", 105, 35, { align: 'center' });
      doc.text("TINGKAT KECAMATAN SUKARESMI TAHUN " + year, 105, 40, { align: 'center' });
      
      const juaraData = [];
      let catCounter = 1;
      
      validCategories.forEach((category) => {
        const catGroup = groupedScores.find(g => g.category === category);
        if (catGroup && catGroup.participants.length > 0) {
          let top3 = catGroup.participants.filter(p => p.rank !== '-' && parseInt(p.rank.toString()) <= 3);
          top3.sort((a, b) => parseInt(a.rank.toString()) - parseInt(b.rank.toString()));
          
          if (top3.length > 0) {
            top3.forEach((p, idx) => {
              const r = parseInt(p.rank.toString());
              const rankStr = r === 1 ? 'I' : r === 2 ? 'II' : r === 3 ? 'III' : p.rank;
              const nilaiStr = formatScore(p.grandTotal);
              
              if (idx === 0) {
                juaraData.push([
                  { content: catCounter, rowSpan: top3.length, styles: { halign: 'center', valign: 'middle' } },
                  { content: category, rowSpan: top3.length, styles: { valign: 'middle' } },
                  rankStr,
                  nilaiStr,
                  p.number,
                  p.name
                ]);
              } else {
                juaraData.push([
                  rankStr,
                  nilaiStr,
                  p.number,
                  p.name
                ]);
              }
            });
            catCounter++;
          }
        }
      });

      autoTable(doc, {
        startY: 50,
        head: [['No.', 'Kategori', 'Juara', 'Nilai', 'Nomor\nPeserta', 'Pangkalan / Regu']],
        body: juaraData,
        theme: 'grid',
        styles: { font: 'times', fontSize: 9.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, cellPadding: 1.5 },
        headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 40 },
          2: { cellWidth: 15, halign: 'center', valign: 'middle' },
          3: { cellWidth: 15, halign: 'center', valign: 'middle' },
          4: { cellWidth: 20, halign: 'center', valign: 'middle' },
          5: { cellWidth: 'auto', valign: 'middle' }
        },
        margin: { left: 15, right: 15 }
      });

      let finalY1 = ((doc as any).lastAutoTable?.finalY || 240) + 10;
      doc.setFontSize(10);
      doc.setFont("times", "normal");
      doc.text("Catatan:", 15, finalY1);
      doc.text("Sesuai ketentuan, bahwa apabila terdapat total nilai yang sama, penentuan peringkat didasarkan berturut-turut pada akumulasi nilai tertinggi juri dan pengurangan penalti yang lebih kecil.", 15, finalY1 + 5, { maxWidth: 180, align: 'justify' });
      
      doc.text(`Sukaresmi, ${dateStr}`, 140, finalY1 + 25);
      doc.text("Koordinator Kegiatan,", 140, finalY1 + 30);
      doc.setFont("times", "bold");
      doc.text("Deden Sanarudin", 140, finalY1 + 50);
      doc.setFont("times", "normal");
      
      doc.text(`Hal. 2 dari ${validCategories.length + 2}`, 105, 285, { align: 'center' });

      // --- PAGE 3+: LAMPIRAN 2, 3... (REKAPITULASI NILAI) ---
      validCategories.forEach((category, catIdx) => {
        const catGroup = groupedScores.find(g => g.category === category);
        
        doc.addPage();
        doc.setFontSize(11);
        doc.text(`Lampiran ${catIdx + 2}`, 15, 20);
        
        doc.setFont("times", "bold");
        doc.text("REKAPITULASI NILAI LKBB DAN YEL-YEL", 105, 30, { align: 'center' });
        doc.text("DALAM KEGIATAN PENJELAJAHAN PRAMUKA PENGGALANG", 105, 35, { align: 'center' });
        doc.text("TINGKAT KECAMATAN SUKARESMI TAHUN " + year, 105, 40, { align: 'center' });
        doc.text(`KATEGORI ${category.toUpperCase()}`, 105, 45, { align: 'center' });
        
        const tableData = [];
        
        let sortedParticipants = [...catGroup.participants].sort((a,b) => {
           let aR = a.rank === '-' ? 999 : parseInt(a.rank);
           let bR = b.rank === '-' ? 999 : parseInt(b.rank);
           if (aR !== bR) return aR - bR;
           return a.number.localeCompare(b.number);
        });

        sortedParticipants.forEach((p, index) => {
          tableData.push([
            index + 1,
            p.number,
            p.name,
            p.juri1Total > 0 ? formatScore(p.juri1Total) : '-',
            p.juri2Total > 0 ? formatScore(p.juri2Total) : '-',
            p.totalPenalty > 0 ? `-${formatScore(p.totalPenalty)}` : '-',
            p.grandTotal > 0 ? formatScore(p.grandTotal) : '-',
            p.isDisqualified ? 'Diskualifikasi' : (p.rank !== '-' ? p.rank : '-')
          ]);
        });
        
        autoTable(doc, {
          startY: 55,
          head: [[
            { content: 'Nomor', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Pangkalan / Regu', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Nilai', colSpan: 4, styles: { halign: 'center' } },
            { content: 'Rank', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
          ], [
            { content: 'Urut', styles: { halign: 'center' } },
            { content: 'Peserta', styles: { halign: 'center' } },
            { content: 'Juri 1', styles: { halign: 'center' } },
            { content: 'Juri 2', styles: { halign: 'center' } },
            { content: 'Penalti', styles: { halign: 'center' } },
            { content: 'Jumlah', styles: { halign: 'center' } }
          ]],
          body: tableData,
          theme: 'grid',
          styles: { font: 'times', fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, cellPadding: 1 },
          headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 16, halign: 'center' },
            4: { cellWidth: 16, halign: 'center' },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 16, halign: 'center' },
            7: { cellWidth: 12, halign: 'center' }
          },
          margin: { left: 15, right: 15 }
        });
        
        let finalY2 = ((doc as any).lastAutoTable?.finalY || 240) + 15;
        if (finalY2 > 250) {
            doc.addPage();
            finalY2 = 30;
        }
        
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.text(`Sukaresmi, ${dateStr}`, 140, finalY2);
        doc.text("Koordinator Kegiatan,", 140, finalY2 + 5);
        doc.setFont("times", "bold");
        doc.text("Deden Sanarudin", 140, finalY2 + 25);
        doc.setFont("times", "normal");
        
        doc.text(`Hal. ${catIdx + 3} dari ${validCategories.length + 2}`, 105, 285, { align: 'center' });
      });
      
      doc.save(generateExportFilename("Hasil Lomba LKBB", "pdf"));
      showToast('Berhasil mengekspor hasil lomba', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor hasil lomba', 'error');
    }
  };

  const exportToXLSX = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      let hasData = false;
      CATEGORIES.forEach(category => {
        const catGroup = groupedScores.find(g => g.category === category);
        if (!catGroup || catGroup.participants.length === 0) return;
        
        hasData = true;
        const worksheet = workbook.addWorksheet(category.substring(0, 31).replace(/[\\/*?:\[\]]/g, ''));
        
        worksheet.columns = [
          { header: 'Rank', key: 'rank', width: 8 },
          { header: 'No. Undian', key: 'number', width: 12 },
          { header: 'Pangkalan / Regu', key: 'name', width: 40 },
          { header: 'Juri 1', key: 'juri1', width: 12 },
          { header: 'Juri 2', key: 'juri2', width: 12 },
          { header: 'Penalti', key: 'penalty', width: 12 },
          { header: 'Nilai Akhir', key: 'final', width: 15 },
          { header: 'Keterangan', key: 'status', width: 25 },
        ];
        
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        
        catGroup.participants.forEach((p, idx) => {
          worksheet.addRow({
            rank: p.rank !== '-' ? p.rank : '-',
            number: p.number,
            name: p.name,
            juri1: p.juri1Total > 0 ? roundTwoDecimals(p.juri1Total) : '-',
            juri2: p.juri2Total > 0 ? roundTwoDecimals(p.juri2Total) : '-',
            penalty: p.totalPenalty > 0 ? -roundTwoDecimals(p.totalPenalty) : 0,
            final: p.grandTotal > 0 ? roundTwoDecimals(p.grandTotal) : 0,
            status: p.isDisqualified ? p.disqualificationReason || 'Diskualifikasi' : (p.rank !== '-' ? `Juara ${p.rank}` : '-')
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
      
      if (!hasData) {
        showToast('Belum ada data nilai untuk diekspor', 'error');
        return;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", generateExportFilename("Rekap Hasil Lomba LKBB", "xlsx"));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor hasil lomba', 'error');
    }
  };

  const exportFullRealDataExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Admin';
    workbook.created = new Date();
    
    // For each category, create a sheet
    CATEGORIES.forEach(category => {
      const catGroup = groupedScores.find(g => g.category === category);
      if (catGroup && catGroup.participants.length > 0) {
        const worksheet = workbook.addWorksheet(category.substring(0, 31).replace(/[\\/*?:\[\]]/g, ''));
        
        // Define columns
        worksheet.columns = [
          { header: 'No. Urut', key: 'number', width: 10 },
          { header: 'Pangkalan', key: 'name', width: 25 },
          { header: 'Juri 1', key: 'juri1', width: 15 },
          { header: 'Juri 2', key: 'juri2', width: 15 },
          { header: 'Total Penalti', key: 'penalty', width: 15 },
          { header: 'Nilai Akhir', key: 'final', width: 15 },
          { header: 'Status Diskualifikasi', key: 'disqualified', width: 30 }
        ];

        // Add rows
        catGroup.participants.forEach(p => {
          worksheet.addRow({
            number: p.number,
            name: p.name,
            juri1: p.juri1Total > 0 ? formatScore(p.juri1Total) : '-',
            juri2: p.juri2Total > 0 ? formatScore(p.juri2Total) : '-',
            penalty: p.totalPenalty > 0 ? `-${formatScore(p.totalPenalty)}` : '-',
            final: p.grandTotal > 0 ? formatScore(p.grandTotal) : '-',
            disqualified: p.isDisqualified ? 'Ya - ' + p.disqualificationReason : '-'
          });
        });
        
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", generateExportFilename("Laporan Lengkap Real Data", "xlsx"));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-10">
      {isImpersonateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Pilih Juri</h3>
            <p className="text-sm text-slate-500 mb-4">Sebagai Super Admin, Anda akan beralih peran dan bertindak sebagai juri yang Anda pilih.</p>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 block mb-2">Pilih Juri Penilai</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedJudgeToImpersonate}
                onChange={(e) => setSelectedJudgeToImpersonate(e.target.value)}
              >
                <option value="">-- Pilih Juri --</option>
                {appUsers.filter(u => u.role === 'judge').map(j => (
                  <option key={j.id} value={j.id}>Juri: {j.id.charAt(0).toUpperCase() + j.id.slice(1)} {j.assignedCategories ? `(${j.assignedCategories.join(', ')})` : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsImpersonateModalOpen(false)}>
                Batal
              </Button>
              <Button 
                onClick={() => {
                  if (selectedJudgeToImpersonate && user) {
                    const targetJudge = appUsers.find(u => u.id === selectedJudgeToImpersonate);
                    if (targetJudge) {
                      loginCustom({
                        uid: targetJudge.id,
                        appRole: 'judge',
                                                assignedCategories: targetJudge.assignedCategories || [],
                        originalRole: 'super_admin',
                        originalUid: user.uid
                      }, false);
                      window.location.href = '/judge';
                    }
                  }
                }}
                disabled={!selectedJudgeToImpersonate}
              >
                Alih Peran
              </Button>
            </div>
          </div>
        </div>
      )}
      {localToast && (
        <div 
          className="fixed z-[9999] bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded shadow-lg pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-200"
          style={{ top: localToast.y - 40, left: localToast.x - 50 }}
        >
          {localToast.message}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      )}
      {toast && (
        <div className={`fixed top-20 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
          {toast.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          {toast.message}
        </div>
      )}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="text-center sm:text-left flex flex-col items-center sm:items-start w-full sm:w-auto">
              <h1 className="text-xl font-bold text-slate-900 leading-tight flex flex-col sm:block">
                <span>{isSuperAdmin ? 'Super Admin Dasbor' : user?.appRole === 'admin_leaderboard' ? 'Admin Leaderboard' : 'Admin Dasbor'}</span>
                <span className="hidden sm:inline"> - </span>
                <span className="text-lg sm:text-xl font-medium sm:font-bold text-blue-600 sm:text-slate-900">
                  {activeMainTab === 'peserta' ? 'Registrasi Peserta' : activeMainTab === 'rekap' ? 'Rekapitulasi Nilai' : activeMainTab === 'leaderboard' ? 'Leaderboard' : activeMainTab === 'ekspor' ? 'Ekspor Laporan' : activeMainTab === 'statistik' ? 'Statistik Data' : 'Manajemen Pengguna'}
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5 whitespace-nowrap">Penilaian</p>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 truncate max-w-[120px] sm:max-w-none">
                {user?.uid && user.uid.charAt(0).toUpperCase() + user.uid.slice(1)}
              </div>
              <div className="flex items-center space-x-2">
                {isSuperAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setIsImpersonateModalOpen(true)}>
                    Mode Juri
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => logoutCustom()}>
                  <LogOut className="w-5 h-5 text-slate-600" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex space-x-6 sm:space-x-8 justify-around sm:justify-start border-b overflow-x-auto scrollbar-hide pb-1">
              {user?.appRole !== 'admin_leaderboard' && (
              <>
              <button
                className={`pb-2 font-medium flex flex-col sm:flex-row items-center transition-colors whitespace-nowrap ${activeMainTab === 'peserta' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveMainTab('peserta')}
              >
                <Users className="w-6 h-6 sm:w-4 sm:h-4 sm:mr-2 mb-1 sm:mb-0" />
                <span className="text-[10px] sm:text-base">Peserta</span>
              </button>
              <button
                className={`pb-2 font-medium flex flex-col sm:flex-row items-center transition-colors whitespace-nowrap ${activeMainTab === 'rekap' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveMainTab('rekap')}
              >
                <ClipboardList className="w-6 h-6 sm:w-4 sm:h-4 sm:mr-2 mb-1 sm:mb-0" />
                <span className="text-[10px] sm:text-base">Rekap Nilai</span>
              </button>
              </>
              )}
              <button
                className={`pb-2 font-medium flex flex-col sm:flex-row items-center transition-colors whitespace-nowrap ${activeMainTab === 'leaderboard' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveMainTab('leaderboard')}
              >
                <Trophy className="w-6 h-6 sm:w-4 sm:h-4 sm:mr-2 mb-1 sm:mb-0" />
                <span className="text-[10px] sm:text-base">Leaderboard</span>
              </button>
              {isSuperAdmin && (
              <>
              <button
                className={`pb-2 font-medium flex flex-col sm:flex-row items-center transition-colors whitespace-nowrap ${activeMainTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveMainTab('users')}
              >
                <UserCog className="w-6 h-6 sm:w-4 sm:h-4 sm:mr-2 mb-1 sm:mb-0" />
                <span className="text-[10px] sm:text-base">Pengguna</span>
              </button>
              </>
              )}
              
              {user?.appRole !== 'admin_leaderboard' && (
              <>
              <button
                className={`pb-2 font-medium flex flex-col sm:flex-row items-center transition-colors whitespace-nowrap ${activeMainTab === 'statistik' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveMainTab('statistik')}
              >
                <BarChart3 className="w-6 h-6 sm:w-4 sm:h-4 sm:mr-2 mb-1 sm:mb-0" />
                <span className="text-[10px] sm:text-base">Statistik</span>
              </button>
              <button
                className={`pb-2 font-medium flex flex-col sm:flex-row items-center transition-colors whitespace-nowrap ${activeMainTab === 'ekspor' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveMainTab('ekspor')}
              >
                <FileDown className="w-6 h-6 sm:w-4 sm:h-4 sm:mr-2 mb-1 sm:mb-0" />
                <span className="text-[10px] sm:text-base">Ekspor</span>
              </button>
              </>
              )}
              
              {isSuperAdmin && (
              <>
              <div className="hidden sm:block w-px h-6 bg-slate-300 self-center mx-2 sm:mx-4" />

              <button
                className={`pb-2 font-medium flex flex-col sm:flex-row items-center transition-colors whitespace-nowrap ${activeMainTab === 'trash' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveMainTab('trash')}
              >
                <Trash2 className="w-6 h-6 sm:w-4 sm:h-4 sm:mr-2 mb-1 sm:mb-0" />
                <span className="text-[10px] sm:text-base">Kotak Sampah</span>
              </button>
              </>
              )}
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 py-8">
        {activeMainTab === 'peserta' && (
          <div className="flex flex-col gap-8">
            <div className="w-full">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-center sm:items-center pb-4 sm:pb-2 gap-4 sm:gap-0">
                  <div className="text-center sm:text-left w-full sm:w-auto">
                    <CardTitle>Daftar Peserta</CardTitle>
                    <CardDescription>Semua regu yang telah didaftarkan</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    {canManageParticipants && (
                    <div className="group relative hidden sm:inline-block">
                      <Button 
                        size="icon" 
                        variant="default" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                      <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Tambah Peserta</span>
                    </div>
                    )}
                    {canManageParticipants && selectedParticipantsForDelete.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setIsConfirmingBulkDelete(true)}
                        className="h-10 px-4 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus ({selectedParticipantsForDelete.length})
                      </Button>
                    )}
                    <select
                      className="flex h-10 w-full sm:w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                    >
                      <option value="Semua Kategori">Semua Kategori</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input 
                        placeholder="Cari peserta..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 w-full"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto overflow-y-auto max-h-[500px] border border-slate-200 rounded-md">
                    <table className="w-full text-xs sm:text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sm:text-xs sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-1 sm:px-3 py-2 font-medium rounded-tl-md text-center w-8 sm:w-10">
                            {canManageParticipants && (
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                              checked={filteredParticipants.length > 0 && filteredParticipants.every(p => selectedParticipantsForDelete.includes(p.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParticipantsForDelete(filteredParticipants.map(p => p.id));
                                } else {
                                  setSelectedParticipantsForDelete([]);
                                }
                              }}
                            />
                            )}
                          </th>
                          <th className="px-1 sm:px-3 py-2 font-medium text-center whitespace-nowrap">No. Urut</th>
                          <th className="px-1 sm:px-3 py-2 font-medium text-center whitespace-nowrap">No. Peserta</th>
                          <th className="px-1 sm:px-3 py-2 font-medium text-left">Nama Regu</th>
                          <th className="px-1 sm:px-3 py-2 font-medium rounded-tr-md text-center">Kategori</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupedParticipants.map(group => (
                          <React.Fragment key={group.category}>
                            {group.participants.length > 0 && (
                              <tr className="bg-slate-100/50">
                                <td colSpan={5} className="px-1 sm:px-3 py-1.5 font-semibold text-slate-700 text-[9px] sm:text-[10px] uppercase tracking-wider">
                                  {group.category}
                                </td>
                              </tr>
                            )}
                            {group.participants.map((p, index) => (
                              <tr 
                                key={p.id} 
                                className={`transition-colors cursor-pointer group ${selectedParticipantId === p.id ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50'}`}
                                onClick={() => setSelectedParticipantId(selectedParticipantId === p.id ? null : p.id)}
                              >
                                <td className="px-1 sm:px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  {canManageParticipants && (
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                    checked={selectedParticipantsForDelete.includes(p.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedParticipantsForDelete([...selectedParticipantsForDelete, p.id]);
                                      } else {
                                        setSelectedParticipantsForDelete(selectedParticipantsForDelete.filter(id => id !== p.id));
                                      }
                                    }}
                                  />
                                  )}
                                </td>
                                <td className="px-1 sm:px-3 py-1.5 text-center text-slate-500">
                                  {index + 1}
                                </td>
                                <td className="px-1 sm:px-3 py-1.5 font-medium text-center">
                                  <Badge variant="secondary" className="px-1 sm:px-1.5 py-0 text-[10px] sm:text-xs font-semibold">{p.number}</Badge>
                                </td>
                                <td className="px-1 sm:px-3 py-1.5 font-medium text-slate-900 relative">
                                  <div className="flex items-center min-h-[24px]">
                                    <span className="transition-colors group-hover:text-blue-600 line-clamp-2 sm:line-clamp-none">{p.name}</span>
                                    {canManageParticipants && selectedParticipantId === p.id && (
                                      <div className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/90 sm:bg-white/50 backdrop-blur-sm p-1 rounded-md shadow-sm" onClick={(e) => e.stopPropagation()}>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={() => setEditingParticipant(p)}>
                                          <Edit2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => setParticipantToDelete(p.id)}>
                                          <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-1 sm:px-3 py-1.5 text-slate-600 text-center whitespace-nowrap text-[10px] sm:text-sm">{p.category}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                        {filteredParticipants.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                              Tidak ada peserta yang ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        
        {/* Floating Action Button for Mobile Add User */}
        {activeMainTab === 'users' && isSuperAdmin && (

          <button
            onClick={() => setIsUserModalOpen(true)}
            className="sm:hidden fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-transform active:scale-95"
            aria-label="Buat Akun Baru"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Floating Action Button for Mobile Add Participant */}
        {activeMainTab === 'peserta' && canManageParticipants && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="sm:hidden fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-transform active:scale-95"
            aria-label="Tambah Peserta"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {activeMainTab === 'rekap' && (
          <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-center sm:items-center pb-4 sm:pb-2 gap-4 sm:gap-0">
              <div className="text-center sm:text-left w-full sm:w-auto">
                <CardTitle>Progres Penilaian</CardTitle>
                <CardDescription>Status real-time dari semua juri</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                
                <select
                  className="flex h-10 w-full sm:w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="Semua Kategori">Semua Kategori</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input 
                    placeholder="Cari peserta..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedScoresForBulk.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center text-blue-800 text-sm font-medium">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">
                      {selectedScoresForBulk.length}
                    </span>
                    Regu terpilih
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100 flex-1 sm:flex-none"
                      onClick={handleBulkRestoreDisqualified}
                      disabled={isBulkProcessingScores}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Pulihkan Status
                    </Button>
                    {isSuperAdmin && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="flex-1 sm:flex-none"
                        onClick={handleBulkResetScores}
                        disabled={isBulkProcessingScores}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Reset Nilai
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div className="overflow-x-auto overflow-y-auto max-h-[500px] border border-slate-200 rounded-md">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sm:text-xs sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-2 py-2 font-medium rounded-tl-md text-center w-8">
                        {canManageParticipants && (
                              <input 
                                type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                          checked={filteredParticipants.length > 0 && selectedScoresForBulk.length === filteredParticipants.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScoresForBulk(filteredParticipants.map(p => p.id));
                            } else {
                              setSelectedScoresForBulk([]);
                            }
                          }}
                        />
                        )}
                      </th>
                      <th className="px-2 py-2 font-medium text-center whitespace-nowrap text-slate-400 select-none">No. Urut</th>
                      <th className="px-2 py-2 font-medium text-center whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleRekapSort('number')} title="Urutkan No. Peserta">
                        No. Peserta {rekapSortConfig?.key === 'number' ? (rekapSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="px-2 py-2 font-medium text-center cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleRekapSort('name')} title="Urutkan Regu">
                        Regu {rekapSortConfig?.key === 'name' ? (rekapSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="px-2 py-2 font-medium text-center cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleRekapSort('p1Total')} title="Urutkan Nilai Juri 1">
                        Juri 1 {rekapSortConfig?.key === 'p1Total' ? (rekapSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="px-2 py-2 font-medium text-center cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleRekapSort('p2Total')} title="Urutkan Nilai Juri 2">
                        Juri 2 {rekapSortConfig?.key === 'p2Total' ? (rekapSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="px-2 py-2 font-medium text-center cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleRekapSort('p3Total')} title="Urutkan Total Penalti">
                        Penalti {rekapSortConfig?.key === 'p3Total' ? (rekapSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="px-2 py-2 font-medium text-center cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleRekapSort('grandTotal')} title="Urutkan Jumlah Nilai">
                        Jumlah {rekapSortConfig?.key === 'grandTotal' ? (rekapSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="px-2 py-2 font-medium text-center rounded-tr-md cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleRekapSort('rank')} title="Urutkan Peringkat">
                        Rank {rekapSortConfig?.key === 'rank' ? (rekapSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayGroupedScores.map(group => (
                      <React.Fragment key={group.category}>
                        {group.participants.length > 0 && (
                          <tr className="bg-slate-100/50">
                            <td colSpan={9} className="px-3 py-1.5 font-semibold text-slate-700 text-[10px] uppercase tracking-wider">
                              {group.category}
                            </td>
                          </tr>
                        )}
                        {group.participants.map((p, index) => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 py-1.5 text-center">
                              {canManageParticipants && (
                              <input 
                                type="checkbox"
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                checked={selectedScoresForBulk.includes(p.id)}
                                onChange={() => {
                                  setSelectedScoresForBulk(prev => 
                                    prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                  );
                                }}
                              />
                              )}
                            </td>
                            <td className="px-2 py-1.5 font-medium text-center text-slate-600">
                              {index + 1}
                            </td>
                            <td className="px-2 py-1.5 font-medium text-center">
                              <Badge variant="secondary" className="px-1.5 py-0 text-xs font-semibold">{p.number}</Badge>
                            </td>
                            <td className="px-2 py-1.5 text-left relative">
                              <div className="flex items-center min-h-[24px]">
                                <span 
                                  className={`font-semibold transition-colors ${canManageParticipants ? 'hover:text-blue-600 cursor-pointer' : 'text-slate-900'} line-clamp-2 sm:line-clamp-none`}
                                  onClick={(e) => {
                                    if (canManageParticipants) {
                                      setActiveActionMenuId(activeActionMenuId === p.id ? null : p.id);
                                    }
                                  }}
                                >
                                  {p.name}
                                </span>
                                {canManageParticipants && activeActionMenuId === p.id && (
                                  <div className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/90 sm:bg-white/50 backdrop-blur-sm p-1 rounded-md shadow-sm animate-in fade-in slide-in-from-right-2 duration-200" onClick={(e) => e.stopPropagation()}>
                                    {isSuperAdmin && (
<div className="group relative inline-block">
<Button size="sm" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 transition-colors"
                                      
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Allow resetting as long as there is some juri total (or disqualified state)
                                        if (scores.some(s => s.participantId === p.id)) {
                                          setParticipantToReset(p);
                                        } else {
                                          handleShowLocalToast('Regu ini belum memiliki nilai', e);
                                        }
                                        setActiveActionMenuId(null);
                                      }}
                                    >
                                      <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                    </Button>
<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm z-50 whitespace-nowrap">Reset Nilai</span>
</div>
)}
                                    <div className="group relative inline-block">
<Button size="sm" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition-colors"
                                      
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (p.grandTotal > 0) {
                                          setParticipantForDetail(p);
                                        } else {
                                          handleShowLocalToast('Regu ini belum memiliki nilai', e);
                                        }
                                        setActiveActionMenuId(null);
                                      }}
                                    >
                                      <FileText className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                    </Button>
<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm z-50 whitespace-nowrap">Detail Nilai</span>
</div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {p.juri1Total > 0 ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 px-1.5 py-0">
                                  {formatScore(p.juri1Total)} pt
                                </Badge>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {p.juri2Total > 0 ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 px-1.5 py-0">
                                  {formatScore(p.juri2Total)} pt
                                </Badge>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {p.totalPenalty > 0 ? (
                                <div className="flex flex-col items-center group relative">
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 px-1.5 py-0 cursor-help">
                                    -{formatScore(p.totalPenalty)} pt
                                  </Badge>
                                  <span className="absolute bottom-full mb-1 hidden group-hover:block w-max max-w-[200px] text-center bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm z-10">
                                    Potongan -{formatScore(p.totalPenalty)} pt<br/>(Lebih {p.excessSeconds} dtk)<br/><span className="text-[8px] text-slate-300">Berdasarkan waktu terkecil Juri</span>
                                  </span>
                                </div>
                              ) : p.juri1Total > 0 || p.juri2Total > 0 ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 px-1.5 py-0 font-normal">
                                  Aman
                                </Badge>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center font-bold text-slate-900 text-base">
                              {p.isDisqualified ? <span className="text-red-500 text-sm">0</span> : formatScore(p.grandTotal)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {p.isDisqualified ? (
                                <div className="flex flex-col items-center justify-center gap-1 group relative">
                                  <div onClick={() => isSuperAdmin && setParticipantToRestoreDisqualified(p)}>
                                  <Badge 
                                    variant="destructive" 
                                    className={`bg-red-100 text-red-700 border-none transition-colors ${isSuperAdmin ? 'cursor-pointer hover:bg-red-600 hover:text-white' : 'hover:bg-red-200'}`}
                                  >{p.disqualificationReason || 'Diskualifikasi'}</Badge>
                                  </div>
                                  {isSuperAdmin && (
                                    <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-slate-800 text-white text-[10px] rounded px-2 py-1 shadow-lg z-10">
                                      Batal Diskualifikasi
                                    </div>
                                  )}
                                </div>
                              ) : p.rank !== '-' ? (
                                <Badge variant={p.rank === 1 ? 'default' : p.rank === 2 ? 'secondary' : 'outline'} className={p.rank === 1 ? 'bg-amber-400 hover:bg-amber-500 text-amber-900 border-none' : p.rank === 2 ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : p.rank === 3 ? 'bg-orange-200 hover:bg-orange-300 text-orange-800' : ''}>
                                  {p.rank}
                                </Badge>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {filteredParticipants.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          Tidak ada peserta yang ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {activeMainTab === 'leaderboard' && (
          <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 overflow-y-auto' : 'space-y-6'}`} ref={leaderboardRef}>
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${isFullscreen ? 'sticky top-0 bg-slate-50 z-30 p-6 pb-4 border-b border-slate-200 shadow-sm' : ''}`}>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                  <Trophy className="w-6 h-6 mr-3 text-amber-500" />
                  Leaderboard
                </h2>
                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors focus:outline-none ml-2 group relative"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowTieBreakerInfo(true)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors focus:outline-none group relative"
                >
<Info className="w-4 h-4" />
<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm z-50 whitespace-nowrap">Informasi Tie-Breaker</span>
</button>
              </div>
              <select
                className="flex h-10 w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="Semua Kategori">Semua Kategori</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className={`space-y-12 ${isFullscreen ? 'p-6 pt-6' : ''}`}>
              {groupedScores.map(group => (
                <div key={group.category} className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-800 border-b pb-2">{group.category}</h3>
                  
                  {(() => {
                    const validParticipants = group.participants.filter((p: any) => p.grandTotal > 0 && !p.isDisqualified);
                    return validParticipants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      {/* Top 3 Podium Cards */}
                      {validParticipants.slice(0, 3).map((p) => (
                        <Card key={p.id} className={`relative overflow-hidden border-2 ${p.rank === 1 ? 'border-amber-400 shadow-amber-100 shadow-md' : p.rank === 2 ? 'border-slate-300 shadow-sm' : 'border-orange-300 shadow-sm'} transition-transform hover:-translate-y-1`}>
                          <div className={`absolute top-0 inset-x-0 h-1.5 ${p.rank === 1 ? 'bg-amber-400' : p.rank === 2 ? 'bg-slate-300' : 'bg-orange-300'}`}></div>
                          <CardContent className="p-3 sm:p-4 flex flex-row sm:flex-col items-center justify-between sm:justify-center">
                            <div className="flex flex-row sm:flex-col items-center flex-1 min-w-0 mr-3 sm:mr-0">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold mr-3 sm:mr-0 sm:mb-2 ${p.rank === 1 ? 'bg-amber-100 text-amber-700' : p.rank === 2 ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-800'}`}>
                                #{p.rank}
                              </div>
                              <div className="flex flex-col text-left sm:text-center min-w-0 flex-1">
                                <h4 className="font-bold text-base sm:text-lg text-slate-900 mb-0 sm:mb-0.5 truncate w-full" >{p.name}</h4>
                                <div className="text-xs sm:text-sm text-slate-500 sm:mb-3">No. {p.number}</div>
                              </div>
                            </div>
                            <div className="inline-block bg-slate-50 border rounded-lg px-2 py-1.5 sm:px-3 sm:py-1.5 flex-shrink-0">
                              <span className="text-lg sm:text-xl font-black text-slate-800">{formatScore(p.grandTotal)}</span>
                              <span className="text-[10px] sm:text-xs font-medium text-slate-500 ml-1">pts</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Rest of the list if any */}
                      {validParticipants.length > 3 && (
                        <div className="md:col-span-3 mt-4">
                          <Card>
                            <CardContent className="p-0">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                  <tbody className="divide-y divide-slate-100">
                                    {validParticipants.slice(3).map((p) => (
                                      <tr key={p.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 w-16 text-center font-medium text-slate-500">#{p.rank}</td>
                                        <td className="px-4 py-2">
                                          <div className="font-semibold text-slate-900">{p.name}</div>
                                          <div className="text-xs text-slate-500">No. {p.number}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold text-slate-900 text-base">
                                          {formatScore(p.grandTotal)} pt
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed">
                      Belum ada data nilai sah untuk kategori ini.
                    </div>
                  );
                  })()}
                </div>
              ))}
              
              {filteredParticipants.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  Tidak ada peserta yang ditemukan.
                </div>
              )}
            </div>
          </div>
        )}
        {activeMainTab === 'users' && isSuperAdmin && (
          <div className="flex flex-col gap-8">
            <div className="w-full">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-center sm:items-center pb-4 sm:pb-2 gap-4 sm:gap-0">
                <div className="text-center sm:text-left w-full sm:w-auto">
                  <CardTitle>Daftar Pengguna</CardTitle>
                  <CardDescription>Akun juri dan admin yang telah terdaftar</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                  {selectedUsers.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDeleteUsers}
                      className="bg-red-600 hover:bg-red-700 text-white shadow-sm mr-2"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hapus Terpilih ({selectedUsers.length})
                    </Button>
                  )}
                  <div className="group relative hidden sm:inline-block">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={exportUsersXlsx}
                      className="h-10 w-10 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 rounded-md shadow-sm mr-2"
                    >
                      <FileDown className="w-5 h-5" />
                    </Button>
                    <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10 right-0 sm:right-auto">Ekspor Excel</span>
                  </div>
                  <div className="group relative hidden sm:inline-block">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => setIsImportUserModalOpen(true)}
                      className="h-10 w-10 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 rounded-md shadow-sm mr-2"
                    >
                      <Upload className="w-5 h-5" />
                    </Button>
                    <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10 right-0 sm:right-auto">Impor Excel</span>
                  </div>
                  <div className="group relative hidden sm:inline-block">
                    <Button 
                      size="icon" 
                      variant="default" 
                      onClick={() => setIsUserModalOpen(true)}
                      className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                    <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10 right-0 sm:right-auto">Buat Akun Baru</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                  <table className="w-full text-xs sm:text-sm text-center">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sm:text-xs sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-3 py-3 rounded-tl-md">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={appUsers.length > 0 && selectedUsers.length === appUsers.filter(u => u.email !== 'superadmin').length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(appUsers.filter(u => u.email !== 'superadmin').map(u => u.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                          />
                        </th>
                        <th className="px-1 sm:px-3 py-2 font-medium">NO.</th>
                        <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('username')}>NAMA PENGGUNA</th>
                        <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('role')}>PERAN</th>
                                                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('categories')}>KATEGORI AKSES</th>
                        <th className="px-4 py-3 font-medium rounded-tr-md cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('posts')}>TUGAS JURI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedAppUsers.map((u, index) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-center">
                            {u.email !== 'superadmin' && (
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={selectedUsers.includes(u.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUsers(prev => [...prev, u.id]);
                                  } else {
                                    setSelectedUsers(prev => prev.filter(id => id !== u.id));
                                  }
                                }}
                              />
                            )}
                          </td>
                          <td className="px-1 sm:px-3 py-2">{index + 1}</td>
                          <td className="px-4 py-3 flex items-center justify-center gap-2">
                            <div className="group relative inline-flex items-center justify-center">
                              <span className="relative flex h-3 w-3 mt-1">
                                {u.isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${u.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                              </span>
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-max bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm z-10 whitespace-nowrap">{u.isOnline ? "Sedang Aktif" : "Offline"}</span>
                            </div>
                            <button
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                              className="font-medium text-slate-900 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-blue-50 focus:outline-none group relative inline-block"
                            >
                              {visiblePasswords[u.id] && u.password ? u.password : (u.email.charAt(0).toUpperCase() + u.email.slice(1))}
                            </button>
                          </td>
                          <td className="px-4 py-3 relative">
                            {u.role !== 'super_admin' && u.email !== 'superadmin' ? (
                              <button 
                                onClick={() => setActiveActionMenuId(activeActionMenuId === u.id ? null : u.id)}
                                className="group inline-flex items-center justify-center p-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none relative"
                              >
                                <Badge variant={u.role === 'admin' || u.role === 'admin_leaderboard' ? 'default' : 'outline'} className={u.role === 'admin' ? 'bg-indigo-100 text-indigo-800 group-hover:bg-indigo-200 cursor-pointer' : u.role === 'admin_leaderboard' ? 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 cursor-pointer' : 'group-hover:bg-slate-200 cursor-pointer'}>
                                  {u.role === 'admin' ? 'Admin' : u.role === 'admin_leaderboard' ? 'Admin Leaderboard' : 'Juri'}
                                </Badge>
                              </button>
                            ) : (
                                <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                  Super Admin
                                </Badge>
                            )}

                            {activeActionMenuId === u.id && u.role !== 'super_admin' && u.email !== 'superadmin' && (
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 bg-white p-1.5 rounded-md shadow-md border z-20 animate-in fade-in zoom-in duration-150">
                                <div className="group/edit relative">
                                  <button onClick={() => { startEditUser(u); setActiveActionMenuId(null); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <span className="absolute bottom-full mb-1 hidden group-hover/edit:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10 left-1/2 -translate-x-1/2">Edit</span>
                                </div>
                                <div className="group/delete relative">
                                  <button onClick={() => { confirmDeleteUser(u.id); setActiveActionMenuId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <span className="absolute bottom-full mb-1 hidden group-hover/delete:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10 left-1/2 -translate-x-1/2">Hapus</span>
                                </div>
                                <button onClick={() => setActiveActionMenuId(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-md focus:outline-none">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                                                    <td className="px-4 py-3">
                            {u.role === 'judge' && u.assignedCategories ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {u.assignedCategories.map(c => (
                                  <span key={c} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full border border-slate-200">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">Semua Akses</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.role === 'judge' && u.assignedPosts ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {u.assignedPosts.map(p => (
                                  <span key={p} className="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded-full border border-indigo-200">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic text-center block">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {appUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            Belum ada akun terdaftar
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Log Aktivitas Juri</CardTitle>
                <CardDescription>Riwayat aksi dan perubahan yang dilakukan oleh para juri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-tl-md w-1/4">Waktu</th>
                        <th className="px-4 py-3 font-medium">Juri</th>
                        <th className="px-4 py-3 font-medium">Aksi</th>
                        <th className="px-4 py-3 font-medium rounded-tr-md w-1/2">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activityLogs.length > 0 ? (
                        activityLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('id-ID') : 'Baru saja'}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700 capitalize">
                              {log.userName || log.userId}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                log.action === 'Login' ? 'bg-emerald-100 text-emerald-800' : 
                                log.action === 'Logout' ? 'bg-slate-100 text-slate-800' : 
                                log.action.includes('Nilai') ? 'bg-blue-100 text-blue-800' :
                                log.action.includes('Diskualifikasi') ? 'bg-red-100 text-red-800' :
                                'bg-indigo-100 text-indigo-800'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {log.details}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            Belum ada aktivitas tercatat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeMainTab === 'statistik' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Sub-tab Navigation Bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setStatSubTab('lomba')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  statSubTab === 'lomba'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Statistik & Progres Lomba
              </button>
              <button
                type="button"
                onClick={() => setStatSubTab('audit')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  statSubTab === 'audit'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Audit & Evaluasi Penilaian
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStatSubTab(statSubTab === 'semua' ? 'lomba' : 'semua')}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors self-end sm:self-auto ${
                statSubTab === 'semua'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {statSubTab === 'semua' ? '✓ Menampilkan Semua' : 'Tampilkan Keduanya'}
            </button>
          </div>

          {/* Konten Tab 1: Statistik & Progres Lomba */}
          {(statSubTab === 'lomba' || statSubTab === 'semua') && (
            <div className="space-y-4">
              {statSubTab === 'semua' && (
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Statistik & Progres Kompetisi
                  </h3>
                </div>
              )}
              <StatistikLomba participants={participants} scores={scores} appUsers={appUsers} />
            </div>
          )}

          {statSubTab === 'semua' && (
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-3 text-xs uppercase font-semibold text-slate-400">
                  Modul Audit & Evaluasi Penilaian
                </span>
              </div>
            </div>
          )}

          {/* Konten Tab 2: Audit & Evaluasi Penilaian */}
          {(statSubTab === 'audit' || statSubTab === 'semua') && (
            <div className="space-y-4">
              {statSubTab === 'semua' && (
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    Audit & Evaluasi Kinerja Penilaian
                  </h3>
                </div>
              )}
              <AuditEvaluasi participants={participants} scores={scores} appUsers={appUsers} />
            </div>
          )}
        </div>
      )}
      {activeMainTab === 'ekspor' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Ekspor Laporan & Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card 
              className="hover:border-green-300 transition-colors cursor-pointer group relative" 
              onClick={exportDaftarPesertaExcel}
              
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Daftar Peserta</h3>
                  <p className="text-sm text-slate-500 mt-1">Unduh spreadsheet seluruh peserta per kategori</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover:border-purple-300 transition-colors cursor-pointer group relative" 
              onClick={exportSemuaNilaiRinci}
              
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-purple-50 rounded-full group-hover:bg-purple-100 transition-colors">
                  <Printer className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Nilai Rinci Peserta</h3>
                  <p className="text-sm text-slate-500 mt-1">Unduh detail nilai seluruh regu</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover:border-blue-300 transition-colors cursor-pointer group relative" 
              onClick={exportFormatPenilaian}
              
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Blanko Penilaian Juri</h3>
                  <p className="text-sm text-slate-500 mt-1">Unduh formulir rubrik (F4) per regu untuk 2 juri</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="hover:border-blue-300 transition-colors cursor-pointer group relative" 
              onClick={exportHasilLomba}
              
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <Printer className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Hasil Lomba</h3>
                  <p className="text-sm text-slate-500 mt-1">Unduh PDF Berita Acara & Lampiran Juara</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover:border-green-300 transition-colors cursor-pointer group relative" 
              onClick={exportToXLSX}
              
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                  <Download className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Laporan Akhir (.xlsx)</h3>
                  <p className="text-sm text-slate-500 mt-1">Unduh spreadsheet multi-sheet siap cetak</p>
                </div>
              </CardContent>
            </Card>

            {isSuperAdmin && (
              <Card 
                className="hover:border-indigo-300 transition-colors cursor-pointer group relative" 
                onClick={exportUsersXlsx}
                
              >
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                    <Users className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Daftar Pengguna</h3>
                    <p className="text-sm text-slate-500 mt-1">Unduh kredensial & password (XLSX)</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeMainTab === 'trash' && isSuperAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <Trash2 className="w-5 h-5 mr-2 text-red-600" />
                Kotak Sampah & Zona Bahaya
              </h2>
              <p className="text-sm text-slate-500">Data peserta dan nilai yang telah dihapus sementara.</p>
            </div>
            <div className="flex items-center gap-3">
              {scores.length > 0 && (
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 w-full sm:w-auto" onClick={() => setIsResettingAll(true)}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Reset Semua Nilai Aktif
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari data terhapus (nama regu, no urut)..." 
              className="pl-9 bg-white"
              value={trashSearch}
              onChange={(e) => setTrashSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Peserta Terhapus</CardTitle>
                  <CardDescription>Peserta yang dihapus masuk ke sini.</CardDescription>
                </div>
                {trashParticipants.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="group relative flex items-center justify-center">
                      <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleBulkRestoreParticipants}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Pulihkan Semua</span>
                    </div>
                    <div className="group relative flex items-center justify-center">
                      <Button size="icon" variant="destructive" className="h-8 w-8 bg-red-600 hover:bg-red-700" onClick={() => setTrashConfirm({ action: 'delete-bulk', type: 'participant' })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Kosongkan Semua</span>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {trashParticipants.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Kotak sampah peserta kosong.</p>
                ) : (
                  <div className="space-y-3">
                    {trashParticipants.filter((p: any) => p.name.toLowerCase().includes(trashSearch.toLowerCase()) || p.number.includes(trashSearch)).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded-md bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-900">{p.number} - {p.name}</p>
                          <p className="text-xs text-slate-500">{p.category}</p>
                          {p.deletedAt && <p className="text-[10px] text-slate-400 mt-1">Dihapus pada {new Date(p.deletedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                        </div>
                        <div className="flex space-x-2">
                          <div className="group relative flex items-center justify-center">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleRestoreParticipant(p.id)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Pulihkan</span>
                          </div>
                          <div className="group relative flex items-center justify-center">
                            <Button size="icon" variant="destructive" className="h-8 w-8 bg-red-600 hover:bg-red-700" onClick={() => setTrashConfirm({ action: 'delete', type: 'participant', id: p.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Hapus Permanen</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Nilai Terhapus</CardTitle>
                  <CardDescription>Nilai peserta yang direset.</CardDescription>
                </div>
                {trashScores.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="group relative flex items-center justify-center">
                      <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleBulkRestoreScores}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Pulihkan Semua</span>
                    </div>
                    <div className="group relative flex items-center justify-center">
                      <Button size="icon" variant="destructive" className="h-8 w-8 bg-red-600 hover:bg-red-700" onClick={() => setTrashConfirm({ action: 'delete-bulk', type: 'score' })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Kosongkan Semua</span>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {trashScores.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Kotak sampah nilai kosong.</p>
                ) : (
                  <div className="space-y-3">
                    {trashScores.filter((s: any) => {
                      const participant = participants.find(p => p.id === s.participantId) || trashParticipants.find((p: any) => p.id === s.participantId);
                      const name = participant?.name || '';
                      return name.toLowerCase().includes(trashSearch.toLowerCase());
                    }).map((s: any) => {
                      const participant = participants.find(p => p.id === s.participantId) || trashParticipants.find((p: any) => p.id === s.participantId);
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 border rounded-md bg-slate-50">
                          <div>
                            <p className="font-medium text-slate-900">{participant?.name || 'Peserta tidak ditemukan'}</p>
                            <p className="text-xs text-slate-500">Juri: {s.judgeName}</p>
                            {s.deletedAt && <p className="text-[10px] text-slate-400 mt-1">Dihapus pada {new Date(s.deletedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                          </div>
                          <div className="flex space-x-2">
                            <div className="group relative flex items-center justify-center">
                              <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleRestoreScore(s.id)}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Pulihkan</span>
                            </div>
                            <div className="group relative flex items-center justify-center">
                              <Button size="icon" variant="destructive" className="h-8 w-8 bg-red-600 hover:bg-red-700" onClick={() => setTrashConfirm({ action: 'delete', type: 'score', id: s.id })}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <span className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-10">Hapus Permanen</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      </main>


      {/* Trash Confirm Modal */}
      {trashConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Konfirmasi Hapus Permanen</h3>
            </div>
            <p className="text-slate-600 mb-6 pl-13">
              {trashConfirm.action === 'delete-bulk'
                ? `Apakah Anda yakin ingin mengosongkan semua ${trashConfirm.type === 'participant' ? 'peserta' : 'nilai'} dari kotak sampah? Data yang dihapus permanen tidak dapat dipulihkan kembali.`
                : `Apakah Anda yakin ingin menghapus permanen ${trashConfirm.type === 'participant' ? 'peserta' : 'nilai'} ini? Data tidak dapat dipulihkan kembali.`}
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setTrashConfirm(null)}>Batal</Button>
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={executeTrashAction}>
                Hapus Permanen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Hapus Pengguna?</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus pengguna ini? Akses mereka akan dicabut secara permanen dan tidak dapat dikembalikan.
            </p>
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm mb-6 border border-red-200">
              <strong>Peringatan:</strong> Menghapus akun ini tidak akan menghapus nilai yang sudah ia masukkan. Jangan gunakan nama pengguna yang sama untuk orang lain di masa depan agar data nilai tidak tercampur.
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setUserToDelete(null)}>
                Batal
              </Button>
              <Button variant="default" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteUser}>
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      
        {/* Import User Modal */}
      {isImportUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Impor Pengguna dari Excel</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsImportUserModalOpen(false)} className="h-8 w-8 text-slate-500">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-slate-600 mb-6">Unggah file Excel yang berisi daftar pengguna (Juri/Admin).</p>
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => importFileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">Klik untuk memilih file Excel</p>
                <p className="text-xs text-slate-500 mt-1">.xlsx, .xls</p>
                <input 
                  type="file" 
                  ref={importFileInputRef}
                  className="hidden" 
                  accept=".xlsx, .xls" 
                  onChange={handleImportExcel}
                />
              </div>
              <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleDownloadUserTemplate}>
                <Download className="w-4 h-4 mr-2" /> Unduh Template Excel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal Overlay */}
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-0 animate-in fade-in zoom-in-95">
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">{editingUserId ? 'Edit Akun' : 'Buat Akun Baru'}</h2>
                    <Button variant="ghost" size="icon" onClick={closeUserModal} className="h-8 w-8 text-slate-500 mb-2">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>{editingUserId ? 'Edit data admin atau juri' : 'Tambahkan admin atau juri baru'}</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[70vh] overflow-y-auto">
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Nama Pengguna</label>
                      <Input type="text" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Misal: juri1" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Password (Min 6 Karakter) {editingUserId && <span className="text-slate-400 font-normal">(Kosongkan jika tidak ingin mengubah)</span>}
                      </label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          value={newUserPass} 
                          onChange={e => setNewUserPass(e.target.value)} 
                          required={!editingUserId} 
                          minLength={6} 
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Peran</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        value={newUserRole} onChange={e => setNewUserRole(e.target.value as 'admin' | 'admin_leaderboard' | 'judge')}
                      >
                        <option value="judge">Juri Penilai</option>
                        <option value="admin">Admin Dashboard</option>
                        <option value="admin_leaderboard">Admin Leaderboard (Hanya Lihat)</option>
                      </select>
                    </div>
                    {newUserRole === 'judge' && (
                      <>
                        <div className="pt-2 border-t"><label className="text-sm font-medium text-slate-700 mb-2 block">Tugas Penilaian</label>
                          <div className="space-y-2 p-2 border rounded-md bg-slate-50 mb-4">
                            {['Juri 1', 'Juri 2'].map(post => (
                              <label key={post} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={newUserPosts.includes(post)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setNewUserPosts(prev => [...prev, post]);
                                    } else {
                                      setNewUserPosts(prev => prev.filter(p => p !== post));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                />
                                <span className="text-sm text-slate-700">{post}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="pt-2 border-t">
<label className="text-sm font-medium text-slate-700 mb-2 block">Kategori Peserta yang Dinilai</label>
                          <div className="space-y-2 max-h-[150px] overflow-y-auto p-2 border rounded-md bg-slate-50">
                            {CATEGORIES.map(cat => (
                              <label key={cat} className="flex items-center space-x-2">
                                <input 
                                  type="checkbox" 
                                  checked={newUserCategories.includes(cat)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setNewUserCategories(prev => [...prev, cat]);
    
                                    } else {
                                      setNewUserCategories(prev => prev.filter(c => c !== cat));
    
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                />
                                <span className="text-sm text-slate-700">{cat}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    
                    <Button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-700" disabled={isCreatingUser}>
                      <Plus className="w-4 h-4 mr-2" />
                      {isCreatingUser ? 'Menyimpan...' : (editingUserId ? 'Simpan Perubahan' : 'Buat Akun')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Add/Import Participant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-0 animate-in fade-in zoom-in-95">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200">
                  <div className="flex space-x-4">
                    <button
                      className={`pb-2 font-medium text-sm transition-colors ${activeTab === 'single' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                      onClick={() => setActiveTab('single')}
                    >
                      Tambah Satu
                    </button>
                    <button
                      className={`pb-2 font-medium text-sm transition-colors ${activeTab === 'bulk' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                      onClick={() => setActiveTab('bulk')}
                    >
                      Impor Massal
                    </button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)} className="h-8 w-8 text-slate-500 mb-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle>{activeTab === 'single' ? 'Tambah Peserta' : 'Impor Massal'}</CardTitle>
                <CardDescription>{activeTab === 'single' ? 'Daftarkan regu baru' : 'Unggah file Excel daftar regu'}</CardDescription>
              </CardHeader>
              <CardContent>
                {activeTab === 'single' ? (
                  <form onSubmit={async (e) => { await handleAddParticipant(e); setIsAddModalOpen(false); }} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Nama Instansi / Sekolah</label>
                      <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Contoh: SDN 1 Merdeka" required />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-700">Daftar Regu</label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setNewSquads([...newSquads, { id: Date.now().toString(), number: '', category: CATEGORIES[0] }])}
                          className="text-xs h-7 px-2"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Tambah Regu
                        </Button>
                      </div>
                      
                      {newSquads.map((squad, index) => (
                        <div key={squad.id} className="p-3 border border-slate-200 rounded-md bg-slate-50 relative">
                          {newSquads.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => setNewSquads(newSquads.filter(s => s.id !== squad.id))}
                              className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors shadow-sm"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Kategori</label>
                              <select 
                                className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                value={squad.category} 
                                onChange={e => {
                                  const newArr = [...newSquads];
                                  newArr[index].category = e.target.value;
                                  setNewSquads(newArr);
                                }}
                              >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Nomor Undian</label>
                              <Input 
                                value={squad.number} 
                                onChange={e => {
                                  const newArr = [...newSquads];
                                  newArr[index].number = e.target.value;
                                  setNewSquads(newArr);
                                }} 
                                placeholder="Contoh: 001" 
                                required 
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Nama Regu Spesifik (Opsional)</label>
                            <Input 
                              value={squad.customName || ''} 
                              onChange={e => {
                                const newArr = [...newSquads];
                                newArr[index].customName = e.target.value;
                                setNewSquads(newArr);
                              }} 
                              placeholder={`Kosongkan untuk memakai "${institutionName || 'Nama Instansi'}"`}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-4" disabled={isAdding || newSquads.length === 0}>
                      <Plus className="w-4 h-4 mr-2" />
                      {isAdding ? 'Menyimpan...' : 'Simpan Semua Regu'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={async (e) => { await handleBulkImport(e); setIsAddModalOpen(false); }} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">File Excel Data Peserta</label>
                      <div className="flex flex-col gap-2 mb-2">
                        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="w-fit text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
                          <Download className="w-4 h-4 mr-2" />
                          Unduh Template Excel (.xlsx)
                        </Button>
                        <p className="text-xs text-slate-500">Isi data pada template yang diunduh, lalu unggah kembali ke sini.</p>
                      </div>
                      <input 
                        type="file"
                        accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={e => setBulkFile(e.target.files?.[0] || null)}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isBulkAdding}>
                      <Upload className="w-4 h-4 mr-2" />
                      {isBulkAdding ? 'Mengimpor...' : 'Impor Peserta'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Participant Delete Modal */}
      {participantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Hapus Peserta?</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus peserta ini? Semua data nilai terkait juga akan terpengaruh.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setParticipantToDelete(null)}>Batal</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteParticipant}>Hapus</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isConfirmingBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus {selectedParticipantsForDelete.length} Peserta?</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus {selectedParticipantsForDelete.length} peserta terpilih? Semua data nilai terkait juga akan terpengaruh.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsConfirmingBulkDelete(false)} disabled={isBulkDeleting}>Batal</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleBulkDeleteParticipants} disabled={isBulkDeleting}>
                {isBulkDeleting ? 'Menghapus...' : 'Hapus Semua'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {participantForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-white rounded-t-xl sticky top-0 z-10">
              <div className="pr-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Detail Nilai</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{participantForDetail.name} • {participantForDetail.category}</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="group relative">
                  <button
                    onClick={() => {
                      const pScores = scores.filter(s => s.participantId === participantForDetail.id);
                      generateDetailPDF(participantForDetail, pScores);
                    }}
                    className="flex items-center justify-center bg-blue-50 text-blue-700 hover:bg-blue-100 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <span className="absolute top-full mt-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm z-20 right-0">Unduh PDF</span>
                </div>
                <button
                  onClick={() => setParticipantForDetail(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-slate-50 rounded-b-xl">
              <div className="space-y-3 sm:space-y-4">
                {scores.filter((s:any) => s.participantId === participantForDetail.id && !s.deletedAt).map((pScore: any) => {
                  if (!pScore) return null;
                  
                  return (
                    <div key={pScore.id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-slate-100 px-3 py-2 border-b flex justify-between items-center sticky top-0 z-10">
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm">Juri: {pScore.judgeName || pScore.judgeId}</span>
                        {pScore.isDisqualified ? (
                          <Badge variant="destructive" className="px-2 py-0 text-[10px] sm:text-xs">Diskualifikasi</Badge>
                        ) : (
                          <span className="font-bold text-blue-700 text-xs sm:text-sm">Total: {formatScore(pScore.totalScore)}</span>
                        )}
                      </div>
                      {!pScore.isDisqualified && (
                        <table className="w-full text-xs sm:text-sm">
                          <tbody>
                            {(FLAT_CRITERIA || []).map(crit => (
                              <tr key={crit.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-2 text-slate-600 align-top">
                                  <div className="font-semibold text-slate-800 leading-tight">{crit.name}</div>
                                  <div className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-tight">{crit.desc}</div>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900 align-top w-12 sm:w-16 bg-slate-50/50">
                                  {pScore.criteriaScores?.[crit.id] || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participant Reset Modal */}
      {participantToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Reset Nilai Peserta?</h3>
            <p className="text-slate-600 mb-4">
              Apakah Anda yakin ingin menghapus nilai untuk peserta <strong>No. {participantToReset.number}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mb-6">
    <label className="text-sm font-medium text-slate-700 block mb-1">Pilih Juri yang Direset:</label>
    <select
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      value={judgeToReset}
      onChange={(e) => setJudgeToReset(e.target.value)}
    >
      <option value="all">Semua Juri</option>
      {Array.from(new Set(scores.filter((s:any) => s.participantId === participantToReset?.id).map((s:any) => s.judgeName || s.judgeId))).map(jName => (
        <option key={jName as string} value={jName as string}>{jName as string}</option>
      ))}
    </select>
  </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => { setParticipantToReset(null); setJudgeToReset('all'); }}>Batal</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleResetParticipantScore}>Reset Nilai</Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Disqualified Modal */}
      {participantToRestoreDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Batal Diskualifikasi</h3>
            <p className="text-slate-600 mb-6">
              Yakin ingin membatalkan diskualifikasi untuk regu <strong>{participantToRestoreDisqualified.number}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setParticipantToRestoreDisqualified(null)}>Batal</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRestoreDisqualified}>Lanjutkan</Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Modal */}
      {isResettingAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Reset Semua Nilai?</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin <strong>menghapus seluruh nilai</strong> untuk semua peserta di semua kategori? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsResettingAll(false)}>Batal</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleResetAllScores}>Reset Semua Nilai</Button>
            </div>
          </div>
        </div>
      )}

      {/* Tie-Breaker Info Modal */}
      {showTieBreakerInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Kebijakan Tie-Breaker</h3>
            </div>
            
            <div className="text-sm text-slate-600 mb-6 space-y-3">
              <p>Jika terdapat regu dengan <strong>Grand Total</strong> yang sama, peringkat ditentukan berdasarkan urutan prioritas berikut:</p>
              
              <div className="space-y-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="font-semibold text-slate-900">Peringkat Otomatis</p>
                    <p className="text-xs text-slate-500 mt-0.5">Peringkat ditentukan berdasarkan total nilai tertinggi dari gabungan seluruh juri setelah dikurangi penalti waktu.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="font-semibold text-slate-900">Rekapitulasi Penalti</p>
                    <p className="text-xs text-slate-500 mt-0.5">Total nilai akan otomatis dikurangi jika regu tampil melebihi batas waktu (overtime).</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <p className="font-semibold text-slate-900">Total Kerapian Barisan</p>
                    <p className="text-xs text-slate-500 mt-0.5">Akumulasi nilai Struktur / Kerapian Barisan dari seluruh juri.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setShowTieBreakerInfo(false)} className="bg-slate-900 hover:bg-slate-800 text-white w-full sm:w-auto">
                Mengerti
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Edit Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Peserta</h3>
            <form onSubmit={handleUpdateParticipant} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nomor Urut</label>
                <Input 
                  value={editingParticipant.number}
                  onChange={e => setEditingParticipant({...editingParticipant, number: e.target.value})}
                  required
                  disabled
                />
                <p className="text-xs text-slate-500 mt-1">Nomor urut tidak dapat diubah (sebagai ID).</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nama Regu</label>
                <Input 
                  value={editingParticipant.name}
                  onChange={e => setEditingParticipant({...editingParticipant, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Kategori</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={editingParticipant.category}
                  onChange={e => setEditingParticipant({...editingParticipant, category: e.target.value})}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingParticipant(null)}>Batal</Button>
                <Button type="submit">Simpan Perubahan</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Reset Confirm Modal */}
      {isConfirmingBulkReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reset Massal Nilai?</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Anda yakin ingin mereset/menghapus semua nilai dari <strong>{selectedScoresForBulk.length}</strong> regu yang dipilih? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsConfirmingBulkReset(false)}>Batal</Button>
              <Button variant="destructive" onClick={executeBulkResetScores} disabled={isBulkProcessingScores}>
                {isBulkProcessingScores ? 'Memproses...' : 'Ya, Reset Nilai'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Restore Confirm Modal */}
      {isConfirmingBulkRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Pulihkan Status Diskualifikasi?</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Anda yakin ingin memulihkan status diskualifikasi untuk <strong>{selectedScoresForBulk.length}</strong> regu yang dipilih? Nilai mereka akan kembali valid dan masuk ke leaderboard.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsConfirmingBulkRestore(false)}>Batal</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={executeBulkRestoreDisqualified} disabled={isBulkProcessingScores}>
                {isBulkProcessingScores ? 'Memproses...' : 'Ya, Pulihkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Confirm Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Hapus Massal Pengguna?</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus <strong>{selectedUsers.length}</strong> pengguna yang dipilih? Akses mereka akan dicabut secara permanen.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBulkDeleteConfirm(false); }}>Batal</Button>
              <Button variant="default" className="bg-red-600 hover:bg-red-700 text-white" onClick={(e) => { e.preventDefault(); e.stopPropagation(); executeBulkDeleteUsers(); }}>Ya, Hapus Semua</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
