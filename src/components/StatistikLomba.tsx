import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { CATEGORIES } from '../lib/constants';
import { formatScore, roundTwoDecimals } from '../lib/utils';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Search, 
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface Participant {
  id: string;
  number: string;
  name: string;
  category: string;
  school?: string;
}

interface ScoreRecord {
  id: string;
  participantId: string;
  judgeId: string;
  judgeName?: string;
  totalScore: number;
  finalScore?: number;
  timerSeconds?: number;
  isDisqualified?: boolean;
}

interface AppUserDoc {
  id: string;
  email: string;
  role: string;
  assignedCategories?: string[];
  assignedPosts?: string[];
}

interface StatistikLombaProps {
  participants: Participant[];
  scores: ScoreRecord[];
  appUsers: AppUserDoc[];
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Selesai, 1 Juri, Belum

export default function StatistikLomba({ participants, scores, appUsers }: StatistikLombaProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Semua');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Data per participant (hitung juri 1, juri 2, status, total)
  const participantDetails = useMemo(() => {
    return participants.map(p => {
      const pScores = scores.filter(s => s.participantId === p.id && !s.isDisqualified);
      const isDisqualified = scores.some(s => s.participantId === p.id && s.isDisqualified);

      let s1: ScoreRecord | undefined = undefined;
      let s2: ScoreRecord | undefined = undefined;

      pScores.forEach(s => {
        const judgeUser = appUsers.find(u => u.id === s.judgeId);
        if (judgeUser && judgeUser.role === 'judge') {
          if (judgeUser.assignedPosts?.includes('Juri 1')) {
            if (!s1) s1 = s;
          } else if (judgeUser.assignedPosts?.includes('Juri 2')) {
            if (!s2) s2 = s;
          } else {
            if (!s1) s1 = s;
            else if (!s2) s2 = s;
          }
        } else {
          if (!s1) s1 = s;
          else if (!s2) s2 = s;
        }
      });

      const hasJuri1 = !!s1;
      const hasJuri2 = !!s2;
      const scoreCount = pScores.length;
      const isComplete = (hasJuri1 && hasJuri2) || scoreCount >= 2;
      const isPartial = !isComplete && scoreCount > 0;
      const isUnscored = scoreCount === 0;

      // Hitung skor sementara
      let totalScore = 0;
      if (s1 && s2) {
        totalScore = (s1.totalScore || 0) + (s2.totalScore || 0);
      } else if (s1) {
        totalScore = s1.totalScore || 0;
      } else if (s2) {
        totalScore = s2.totalScore || 0;
      } else if (pScores.length > 0) {
        totalScore = pScores.reduce((acc, curr) => acc + (curr.totalScore || 0), 0);
      }

      return {
        ...p,
        hasJuri1,
        hasJuri2,
        scoreCount,
        isComplete,
        isPartial,
        isUnscored,
        totalScore,
        isDisqualified
      };
    });
  }, [participants, scores, appUsers]);

  // 2. Metrik Global
  const totalParticipants = participants.length;
  const completedCount = participantDetails.filter(p => p.isComplete).length;
  const partialCount = participantDetails.filter(p => p.isPartial).length;
  const unscoredCount = participantDetails.filter(p => p.isUnscored).length;
  const completionPercentage = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;

  // 3. Data Pie Chart
  const pieData = useMemo(() => [
    { name: 'Selesai (2 Juri)', value: completedCount },
    { name: 'Sebagian (1 Juri)', value: partialCount },
    { name: 'Belum Dinilai', value: unscoredCount }
  ], [completedCount, partialCount, unscoredCount]);

  // 4. Data Bar Chart per Kategori
  const categoryStats = useMemo(() => {
    return CATEGORIES.map(category => {
      const catParticipants = participantDetails.filter(p => p.category === category);
      const total = catParticipants.length;
      const complete = catParticipants.filter(p => p.isComplete).length;
      const partial = catParticipants.filter(p => p.isPartial).length;
      const unscored = catParticipants.filter(p => p.isUnscored).length;
      const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

      const scoredList = catParticipants.filter(p => p.totalScore > 0 && !p.isDisqualified);
      const avgScore = scoredList.length > 0
        ? scoredList.reduce((acc, curr) => acc + curr.totalScore, 0) / scoredList.length
        : 0;

      const maxScore = scoredList.length > 0
        ? Math.max(...scoredList.map(p => p.totalScore))
        : 0;

      const topTeam = scoredList.find(p => p.totalScore === maxScore)?.name || '-';

      return {
        category,
        total,
        complete,
        partial,
        unscored,
        pct,
        avgScore: roundTwoDecimals(avgScore),
        maxScore: roundTwoDecimals(maxScore),
        topTeam
      };
    });
  }, [participantDetails]);

  // 5. Filter Tabel Peserta
  const filteredParticipants = useMemo(() => {
    return participantDetails.filter(p => {
      const matchCat = selectedCategoryFilter === 'Semua' || p.category === selectedCategoryFilter;
      let matchStatus = true;
      if (selectedStatusFilter === 'complete') matchStatus = p.isComplete;
      if (selectedStatusFilter === 'partial') matchStatus = p.isPartial;
      if (selectedStatusFilter === 'unscored') matchStatus = p.isUnscored;

      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        p.name.toLowerCase().includes(q) || 
        p.number.toLowerCase().includes(q) || 
        (p.school && p.school.toLowerCase().includes(q));

      return matchCat && matchStatus && matchSearch;
    });
  }, [participantDetails, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 4 KARTU STATISTIK UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Peserta */}
        <Card className="border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Regu Terdaftar</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalParticipants}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Semua 4 Kategori Lomba</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Selesai 2 Juri */}
        <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Selesai Dinilai Lengkap</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{completedCount} <span className="text-sm font-normal text-emerald-600">({completionPercentage}%)</span></h3>
              <p className="text-xs text-emerald-600 mt-0.5">Sudah dinilai 2 juri resmi</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Menunggu Juri 2 */}
        <Card className="border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Menunggu Juri 2</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{partialCount}</h3>
              <p className="text-xs text-amber-600 mt-0.5">Baru 1 juri yang input nilai</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Belum Dinilai */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Belum Dinilai</p>
              <h3 className="text-2xl font-bold text-slate-700 mt-1">{unscoredCount}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Menunggu giliran tampil</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRAFIK & DIAGRAM (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DIAGRAM LINGKARAN (STATUS PENILAIAN) */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Distribusi Status Penilaian Regu
            </CardTitle>
            <CardDescription className="text-xs">
              Perbandingan jumlah regu yang telah dinilai lengkap vs sebagian vs belum.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalParticipants === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                Belum ada data regu terdaftar
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val: any) => [`${val} Regu`, 'Jumlah']} 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DIAGRAM BATANG (RATA-RATA NILAI PER KATEGORI) */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Performa & Capaian Skor per Kategori
            </CardTitle>
            <CardDescription className="text-xs">
              Rata-rata capaian nilai vs skor tertinggi yang dicetak peserta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <RechartsTooltip 
                    formatter={(val: any) => [`${val} pt`, '']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="rect" />
                  <Bar dataKey="avgScore" name="Rata-rata Skor" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="maxScore" name="Skor Tertinggi" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RINCIAN PROGRES PER KATEGORI (CARD GRID) */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          Progres Penilaian Tiap Kategori Lomba
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryStats.map(stat => (
            <Card key={stat.category} className="border-slate-200 shadow-sm hover:border-blue-200 transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="font-semibold text-xs border-blue-200 text-blue-800 bg-blue-50/50">
                      {stat.category}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">{stat.total} Regu Terdaftar</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{stat.pct}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stat.pct}%` }}
                  />
                </div>

                {/* Info Angka */}
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Lengkap</span>
                    <span className="text-xs font-bold text-emerald-600">{stat.complete}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">1 Juri</span>
                    <span className="text-xs font-bold text-amber-600">{stat.partial}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Belum</span>
                    <span className="text-xs font-bold text-slate-500">{stat.unscored}</span>
                  </div>
                </div>

                {/* Juara Sementara */}
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between items-center">
                  <span className="text-slate-400">Tertinggi:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[120px]" title={stat.topTeam}>
                    {stat.topTeam} {stat.maxScore > 0 ? `(${formatScore(stat.maxScore)})` : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* TABEL MONITORING STATUS PENILAIAN PER REGU */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Monitoring Kelengkapan Penilaian Regu
              </CardTitle>
              <CardDescription className="text-xs">
                Periksa kesiapan dan status input penilaian dari Juri 1 dan Juri 2 untuk tiap regu peserta.
              </CardDescription>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Kategori */}
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="h-8 text-xs rounded-md border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Semua">Semua Kategori</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Filter Status */}
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="h-8 text-xs rounded-md border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Semua">Semua Status</option>
                <option value="complete">Selesai (2 Juri)</option>
                <option value="partial">Menunggu Juri 2</option>
                <option value="unscored">Belum Dinilai</option>
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari regu..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px]">
                <tr>
                  <th className="px-4 py-2.5 text-center w-14">No</th>
                  <th className="px-4 py-2.5">Nama Regu & Pangkalan</th>
                  <th className="px-4 py-2.5">Kategori</th>
                  <th className="px-4 py-2.5 text-center">Juri 1</th>
                  <th className="px-4 py-2.5 text-center">Juri 2</th>
                  <th className="px-4 py-2.5 text-center">Status Kelengkapan</th>
                  <th className="px-4 py-2.5 text-right">Nilai Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Tidak ada data regu yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-600">
                        {p.number}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-slate-900 block">{p.name}</span>
                        {p.school && <span className="text-[10px] text-slate-400">{p.school}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-slate-600">{p.category}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {p.hasJuri1 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-none font-normal text-[10px] px-1.5 py-0">
                            Terisi
                          </Badge>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {p.hasJuri2 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-none font-normal text-[10px] px-1.5 py-0">
                            Terisi
                          </Badge>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {p.isComplete ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Lengkap (2 Juri)
                          </Badge>
                        ) : p.isPartial ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            Menunggu Juri 2
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                            Belum Dinilai
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 text-sm">
                        {p.isDisqualified ? (
                          <span className="text-red-500 text-xs">Diskualifikasi</span>
                        ) : p.totalScore > 0 ? (
                          formatScore(p.totalScore)
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
