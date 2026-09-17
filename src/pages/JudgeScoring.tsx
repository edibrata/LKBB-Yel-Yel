import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { SCORING_CRITERIA } from '../lib/constants';
import { ArrowLeft, Save, AlertCircle, ChevronDown, ChevronUp, Check, Play } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { BiasGuidelineModal } from '../components/BiasGuidelineModal';

export function JudgeScoring() {
  const { user } = useAuth();
  const { participantId } = useParams();
  const [searchParams] = useSearchParams();
  const post = parseInt(searchParams.get('post') || '1');
  const navigate = useNavigate();

  const [participant, setParticipant] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hasExistingScore, setHasExistingScore] = useState(false);

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasTimerReachedLimit, setHasTimerReachedLimit] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          const next = prev + 1;
          if (next === 300 && !hasTimerReachedLimit) {
            setHasTimerReachedLimit(true);
            showToast("Waktu 5 Menit Telah Habis!", 'error');
          }
          return next;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, hasTimerReachedLimit]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setHasTimerReachedLimit(false);
  };
  
  const formatTime = (elapsedSeconds: number) => {
    const remaining = 300 - elapsedSeconds;
    const isNegative = remaining < 0;
    const absRemaining = Math.abs(remaining);
    const m = Math.floor(absRemaining / 60).toString().padStart(2, '0');
    const s = (absRemaining % 60).toString().padStart(2, '0');
    return isNegative ? `-${m}:${s}` : `${m}:${s}`;
  };


  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const criteriaRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const criteriaList = SCORING_CRITERIA[post as keyof typeof SCORING_CRITERIA] || [];

  // Warn before unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (isLoaded && !expandedCriteria && criteriaList.length > 0) {
      // Find the first unscored criteria
      const unscored = criteriaList.find(c => scores[c.id] === undefined);
      setExpandedCriteria(unscored ? unscored.id : criteriaList[0].id);
    }
  }, [isLoaded, scores, criteriaList, expandedCriteria]);

  useEffect(() => {
    if (expandedCriteria && criteriaRefs.current[expandedCriteria]) {
      setTimeout(() => {
        criteriaRefs.current[expandedCriteria]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 150);
    }
  }, [expandedCriteria]);

  useEffect(() => {
    async function loadData() {
      if (!participantId || !user) return;
      const docRef = doc(db, 'participants', participantId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setParticipant({ id: snap.id, ...snap.data() });
      }

      const q = query(
        collection(db, 'scores'), 
        where('participantId', '==', participantId),
        where('judgeId', '==', user.uid),
        where('post', '==', post)
      );
      const scoreSnaps = await getDocs(q);

      let dbScores = {};
      if (!scoreSnaps.empty) {
        dbScores = scoreSnaps.docs[0].data().criteriaScores || {};
        setHasExistingScore(true);
      }

      const draftKey = `draft_score_${user.uid}_${participantId}_${post}`;
      // Clean up dbScores based on valid criteria for this post
      const validCriteriaIds = criteriaList.map(c => c.id);
      const cleanedDbScores = {};
      for (const key in dbScores) {
        if (validCriteriaIds.includes(key)) {
          cleanedDbScores[key] = dbScores[key];
        }
      }
      dbScores = cleanedDbScores;
      
      const draftStr = localStorage.getItem(draftKey);

      if (draftStr) {
        try {
          const draftScores = JSON.parse(draftStr);
          
          const cleanedDraftScores = {};
          for (const key in draftScores) {
            if (validCriteriaIds.includes(key)) {
              cleanedDraftScores[key] = draftScores[key];
            }
          }
          setScores({ ...dbScores, ...cleanedDraftScores });
          setIsDirty(true);
          if (Object.keys(dbScores).length > 0 || Object.keys(cleanedDraftScores).length > 0) setHasStarted(true);
        } catch (e) {
          setScores(dbScores);
          if (Object.keys(dbScores).length > 0) setHasStarted(true);
        }
      } else {
        setScores(dbScores);
        if (Object.keys(dbScores).length > 0) setHasStarted(true);
      }
      setIsLoaded(true);
    }
    loadData();
  }, [participantId, user, post]);

  const handleScoreChange = (criteriaId: string, value: number) => {
    setScores(prev => {
      const newScores = { ...prev, [criteriaId]: value };
      if (user && participantId) {
        const draftKey = `draft_score_${user.uid}_${participantId}_${post}`;
        localStorage.setItem(draftKey, JSON.stringify(newScores));
      }
      return newScores;
    });
    setIsDirty(true);
    
    // Automatically expand the next criteria
    const currentIndex = criteriaList.findIndex(c => c.id === criteriaId);
    if (currentIndex !== -1 && currentIndex < criteriaList.length - 1) {
      setExpandedCriteria(criteriaList[currentIndex + 1].id);
    } else {
      setExpandedCriteria(null);
    }
  };

  const handleSave = async () => {
    if (!participantId || !user) return;
    
    // Validate all scores are filled
    const allFilled = criteriaList.every(c => scores[c.id] !== undefined);
    if (!allFilled) {
      showToast("Harap isi semua kriteria penilaian (1-5).", 'error');
      return;
    }

    setIsSaving(true);
    try {
      const docId = `${participantId}_${user.uid}_${post}`;
      // Recalculate based on valid keys only
      const validCriteriaIds = criteriaList.map(c => c.id);
      const cleanedScores = {};
      for (const key in scores) {
        if (validCriteriaIds.includes(key)) {
          cleanedScores[key] = scores[key];
        }
      }
      
      // Calculate weighted score
      let totalScore = 0;
      const aspects: Record<string, {total: number, count: number, weight: number}> = {};
      criteriaList.forEach(c => {
        if (!aspects[c.aspectId]) {
          aspects[c.aspectId] = { total: 0, count: 0, weight: c.aspectWeight };
        }
        aspects[c.aspectId].total += (cleanedScores[c.id] || 0);
        aspects[c.aspectId].count += 1;
      });
      
      for (const asp in aspects) {
        const avg = aspects[asp].total / aspects[asp].count;
        totalScore += (avg * 20 * (aspects[asp].weight / 100));
      }
      
      // Calculate penalty
      let timePenalty = 0;
              let excessSeconds = 0;
              if (timerSeconds > 300) {
                excessSeconds = timerSeconds - 300;
                timePenalty = excessSeconds * (5 / 60);
              }
      const finalScore = totalScore - timePenalty;

      
      setDoc(doc(db, 'scores', docId), {
        participantId,
        judgeId: user.uid,
        judgeName: user.uid.charAt(0).toUpperCase() + user.uid.slice(1),
        post,
        criteriaScores: cleanedScores,
        totalScore, timePenalty, finalScore, timerSeconds,
        timestamp: new Date().toISOString()
      });

      const draftKey = `draft_score_${user.uid}_${participantId}_${post}`;
      localStorage.removeItem(draftKey);
      setIsDirty(false);

      navigate('/judge');
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan nilai.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) return <div className="p-8 text-center">Loading...</div>;
  if (!participant) return <div className="p-8 text-center text-red-500">Peserta tidak ditemukan</div>;

  return (
    <>
    <div className="min-h-screen bg-slate-50 pb-24 relative">
    {!hasStarted && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 ml-1" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Mulai Penilaian</h2>
          <p className="text-sm text-slate-500 mb-6">
            Peserta <strong>No. {participant?.number}</strong>. Pastikan regu sudah bersiap di lapangan sebelum memulai timer.
          </p>
          <Button 
            size="lg" 
            className="w-full text-base h-12 bg-blue-600 hover:bg-blue-700 font-bold"
            onClick={() => {
              setHasStarted(true);
              if (!isTimerRunning && timerSeconds === 0) {
                setIsTimerRunning(true);
              }
            }}
          >
            Aktifkan Timer & Mulai
          </Button>
        </div>
      </div>
    )}

      {toast && (
        <div className={`fixed bottom-20 sm:bottom-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all animate-in slide-in-from-bottom-4 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
          {toast.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          {toast.message}
        </div>
      )}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 flex flex-col shadow-md">
        {isDirty && (
          <div className="bg-amber-100 text-amber-800 px-4 py-1.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 border-b border-amber-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Ada nilai yang belum disimpan.</span>
          </div>
        )}
        <div className="max-w-3xl mx-auto px-2 py-2 flex items-center justify-between w-full gap-2 overflow-x-auto">
          {/* Left: Back + Info */}
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800 shrink-0 h-8 w-8" onClick={() => {
              if (isDirty) {
                setIsConfirmingExit(true);
                return;
              }
              navigate('/judge');
            }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <Badge className="px-2 py-0.5 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700">
                  {participant?.number || '...'}
                </Badge>
                <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                  {participant?.category}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Juri {post}</p>
            </div>
          </div>
          
          {/* Right: Timer & Controls (Inline) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Timer Box */}
            <div className={`flex items-center justify-center bg-slate-950 px-2.5 py-1 rounded-md shadow-inner border border-slate-800 min-w-[70px] ${
                hasTimerReachedLimit ? 'bg-red-950/40 border-red-900/50' : ''
            }`}>
              <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums tracking-tight leading-none ${
                timerSeconds >= 300 
                  ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                  : timerSeconds >= 240 
                    ? 'text-amber-400' 
                    : 'text-emerald-400'
              }`}>
                {formatTime(timerSeconds)}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1">
              <Button 
                variant={isTimerRunning ? "destructive" : "default"} 
                size="sm" 
                className={`h-8 px-2 sm:px-3 text-xs font-bold ${!isTimerRunning ? "bg-blue-600 hover:bg-blue-500 text-white" : ""}`} 
                onClick={toggleTimer}
              >
                {isTimerRunning ? 'Jeda' : (timerSeconds > 0 ? 'Lanjut' : 'Mulai')}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetTimer} 
                className="h-8 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 py-8 space-y-6">

        <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <BiasGuidelineModal />
        </div>

        <div className="space-y-8">
          {Object.entries(
            criteriaList.reduce((acc, criteria) => {
              // Gunakan aspectName resmi dari struktur baru jika ada, atau fallback kapitalisasi
              const aspectName = (criteria as any).aspectName || 
                (criteria.id.split('_')[0].charAt(0).toUpperCase() + criteria.id.split('_')[0].slice(1));
                
              if (!acc[aspectName]) acc[aspectName] = [];
              acc[aspectName].push(criteria);
              return acc;
            }, {} as Record<string, typeof criteriaList>)
          ).map(([aspectName, aspectCriteria]) => (
            <div key={aspectName} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 border-b pb-2">{aspectName}</h2>
              {aspectCriteria.map((criteria) => {
                const isExpanded = expandedCriteria === criteria.id;
                const currentScore = scores[criteria.id];
                const globalIndex = criteriaList.findIndex(c => c.id === criteria.id);
                
                return (
                  <div 
                    key={criteria.id} 
                    ref={(el) => (criteriaRefs.current[criteria.id] = el)}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all scroll-mt-20"
                  >
                    <button 
                      onClick={() => setExpandedCriteria(isExpanded ? null : criteria.id)}
                      className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 pr-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold flex-shrink-0 text-sm ${
                          currentScore ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {globalIndex + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{criteria.name}</h3>
                          {!isExpanded && <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{criteria.desc}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {currentScore ? (
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">
                            {currentScore}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-xs font-medium">
                            Belum
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-sm text-slate-600 mb-3">{criteria.desc}</p>
                                                <div className="flex flex-col space-y-2 mt-2">
                          {(criteria as any).rubrics?.map((rubric: any) => (
                            <button
                              key={rubric.score}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScoreChange(criteria.id, rubric.score);
                              }}
                              className={`text-left p-3 rounded-lg border transition-all flex gap-3 ${
                                currentScore === rubric.score 
                                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' 
                                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold flex-shrink-0 text-sm ${
                                currentScore === rubric.score ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {rubric.score}
                              </div>
                              <span className={`text-sm ${currentScore === rubric.score ? 'text-blue-900 font-medium' : 'text-slate-600'}`}>
                                {rubric.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-slate-600 font-medium">
            Total: <span className="text-2xl text-slate-900 font-bold ml-1">
            {(() => {
              let displayTotal = 0;
              const aspects: Record<string, {total: number, count: number, weight: number}> = {};
              criteriaList.forEach(c => {
                if (!aspects[c.aspectId]) {
                  aspects[c.aspectId] = { total: 0, count: 0, weight: c.aspectWeight };
                }
                aspects[c.aspectId].total += (scores[c.id] || 0);
                aspects[c.aspectId].count += 1;
              });
              
              for (const asp in aspects) {
                const avg = aspects[asp].total / aspects[asp].count;
                displayTotal += (avg * 20 * (aspects[asp].weight / 100));
              }
              
              let timePenalty = 0;
              let excessSeconds = 0;
              if (timerSeconds > 300) {
                excessSeconds = timerSeconds - 300;
                timePenalty = excessSeconds * (5 / 60);
              }
              const displayFinalScore = displayTotal - timePenalty;
              
              return (
                <div className="flex flex-col">
                  <div className="text-slate-600 font-medium">
                    Total: <span className="text-2xl text-slate-900 font-bold ml-1">{displayFinalScore.toFixed(2)}</span>
                  </div>
                  {timePenalty > 0 && <div className="text-red-500 text-xs font-bold">- {timePenalty.toFixed(2)} pt (Lebih {excessSeconds} dtk)</div>}
                </div>
              );
            })()}
</span>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="lg" className="px-8">
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? 'Menyimpan...' : (hasExistingScore ? 'Perbarui Nilai' : 'Simpan Nilai')}
          </Button>
        </div>
      </div>
    </div>
      {/* Exit Confirm Modal */}
      {isConfirmingExit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Perubahan Belum Disimpan!</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Anda memiliki nilai yang belum disimpan. Jika Anda keluar sekarang, nilai tersebut akan hilang. Yakin ingin keluar?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsConfirmingExit(false)}>Batal</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                if (user && participantId) {
                  const draftKey = `draft_score_${user.uid}_${participantId}_${post}`;
                  localStorage.removeItem(draftKey);
                }
                navigate('/judge');
              }}>Ya, Keluar</Button>
            </div>
          </div>
        </div>
      )}

  
    </>
  );
}