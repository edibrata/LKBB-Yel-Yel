import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { logActivity } from '../lib/activityLogger';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { LogOut, Search, MapPin, CheckCircle, ChevronDown, AlertCircle } from 'lucide-react';
import { BiasGuidelineModal } from '../components/BiasGuidelineModal';

interface Participant {
  id: string;
  number: string;
  name: string;
  category: string;
}

export function JudgeDashboard() {
  const { user, logoutCustom, loginCustom } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    return sessionStorage.getItem('judgeActiveCategory') || 'all';
  });

  useEffect(() => {
    sessionStorage.setItem('judgeActiveCategory', activeCategory);
  }, [activeCategory]);
  const [scoredParticipants, setScoredParticipants] = useState<Set<string>>(new Set());
  const [disqualifiedParticipants, setDisqualifiedParticipants] = useState<Set<string>>(new Set());
  const [alertParticipant, setAlertParticipant] = useState<Participant | null>(null);
  const [confirmParticipant, setConfirmParticipant] = useState<Participant | null>(null);
  const [isDisqualifying, setIsDisqualifying] = useState(false);


  useEffect(() => {
    const q = query(collection(db, 'participants'), orderBy('number'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant)).filter((p: any) => !p.deletedAt);
      
      // Filter by assigned categories if user is a judge
      if (user?.appRole === 'judge' && user.assignedCategories && user.assignedCategories.length > 0) {
        data = data.filter(p => user.assignedCategories?.includes(p.category));
      }
      
      setParticipants(data);
    }, (error) => {
      console.error("Firestore onSnapshot error (participants):", error);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'scores'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scored = new Set<string>();
      const disqualified = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.judgeId === user.uid && !data.deletedAt) {
          if (data.isDisqualified) {
            disqualified.add(data.participantId);
          } else {
            scored.add(data.participantId);
          }
        }
      });
      setScoredParticipants(scored);
      setDisqualifiedParticipants(disqualified);
    }, (error) => {
      console.error("Firestore onSnapshot error (scores):", error);
    });
    return unsubscribe;
  }, [user]);

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.number.includes(search);
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  
  const handleDisqualify = async (participant: Participant) => {
    if (!user) return;
    setIsDisqualifying(true);
    try {
      const docId = `${participant.id}_${user.uid}`;
      localStorage.removeItem(`draft_score_${user.uid}_${participant.id}`);
      const scoreRef = doc(db, 'scores', docId);
      setDoc(scoreRef, {
        participantId: participant.id,
        judgeId: user.uid,
        totalScore: 0,
        criteriaScores: {},
        updatedAt: new Date().toISOString(),
        isDisqualified: true,
        disqualificationReason: 'Peserta Campuran'
      });
      logActivity(
        user.uid, 
        user.uid,
        user.appRole,
        'Diskualifikasi Peserta', 
        `Peserta ${participant.number} (Kategori: ${participant.category}) diskualifikasi`
      );
      setConfirmParticipant(null);
    } catch (error) {
      console.error("Error disqualifying:", error);
    } finally {
      setIsDisqualifying(false);
    }
  };


  // Get available categories for the judge
  const availableCategories = user?.appRole === 'judge' && user.assignedCategories && user.assignedCategories.length > 0
    ? user.assignedCategories
    : Array.from(new Set(participants.map(p => p.category)));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Juri App - LKBB dan Yel-Yel</h1>
            <p className="text-sm text-slate-500">
              {user?.uid && user.uid.charAt(0).toUpperCase() + user.uid.slice(1)}
              {user?.assignedPosts?.length ? ` (${user.assignedPosts.join(', ')})` : ''}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {(user?.appRole === 'super_admin' || user?.appRole === 'admin' || user?.originalRole === 'super_admin' || user?.originalRole === 'admin') && (
              <Button variant="outline" size="sm" onClick={() => {
                if (user?.originalRole && user?.originalUid) {
                  loginCustom({
                    uid: user.originalUid,
                    appRole: user.originalRole
                  }, false);
                  window.location.href = '/admin';
                } else {
                  window.location.href = '/admin';
                }
              }}>
                Kembali ke Admin
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => logoutCustom()}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4 text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-800 w-full sm:w-auto">Daftar Peserta</h2>
            <div className="flex-shrink-0">
              <BiasGuidelineModal />
            </div>
          </div>


          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 text-center sm:text-left">Kategori Penilaian Saat Ini</h2>
            <div className="relative">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              >
                <option value="all">Semua Kategori</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <Input 
              placeholder="Cari nomor peserta..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {filteredParticipants.map(p => {
            const isScored = scoredParticipants.has(p.id);
            const isDisqualified = disqualifiedParticipants.has(p.id);
            return (
              <Card 
                key={p.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${isDisqualified ? 'border-red-200 bg-red-50/30' : isScored ? 'border-green-200 bg-green-50/30' : ''}`}
                onClick={() => {
                  if (isDisqualified) {
                    setAlertParticipant(p);
                  } else if (isScored) {
                    navigate(`/judge/scoring/${p.id}`);
                  } else {
                    setConfirmParticipant(p);
                  }
                }}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={isDisqualified ? 'destructive' : isScored ? 'secondary' : 'default'} className={`text-base px-3 py-1 ${isScored && !isDisqualified ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}`}>
                      {p.number}
                    </Badge>
                    <span className="font-semibold text-slate-800 text-sm sm:text-base">{p.category}</span>
                  </div>
                  {isDisqualified ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Diskualifikasi</span>
                    </div>
                  ) : isScored ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Selesai</span>
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                      Belum
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
          {filteredParticipants.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-500">
              Tidak ada peserta ditemukan.
            </div>
          )}
        </div>
      </main>

      {confirmParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Konfirmasi Peserta</h3>
            <p className="text-slate-600 mb-6">
              Apakah peserta nomor <strong>{confirmParticipant.number}</strong> (Kategori {confirmParticipant.category}) mencampur putra dan putri dalam satu pasukan?
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                variant="destructive" 
                onClick={() => handleDisqualify(confirmParticipant)}
                disabled={isDisqualifying}
              >
                {isDisqualifying ? "Memproses..." : "Ya, Peserta Campuran (Diskualifikasi)"}
              </Button>
              <Button 
                variant="default" 
                onClick={() => {
                  setConfirmParticipant(null);
                  navigate(`/judge/scoring/${confirmParticipant.id}`);
                }}
                disabled={isDisqualifying}
              >
                Tidak, Lanjut Penilaian
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setConfirmParticipant(null)}
                disabled={isDisqualifying}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
