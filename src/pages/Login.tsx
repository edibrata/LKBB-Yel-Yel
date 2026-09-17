import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { logActivity } from '../lib/activityLogger';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Medal, AlertCircle, Eye, EyeOff, ShieldCheck, User, KeyRound } from 'lucide-react';

export function Login() {
  const { user, loading, loginCustom } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'juri' | 'admin' | 'super_admin'>('juri');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      if (user.appRole === 'super_admin' || user.appRole === 'admin' || user.appRole === 'admin_leaderboard') navigate('/admin');
      else navigate('/judge');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setErrorMsg(null);
    setIsLoggingIn(true);
    
    try {
      if (role === 'super_admin') {
        if (password === 'EdiBrata#1') {
          loginCustom({ uid: 'superadmin', appRole: 'super_admin' }, rememberMe);
        } else {
          setErrorMsg("Password Super Admin salah!");
        }
      } else {
        if (!username) {
           setErrorMsg("Nama pengguna harus diisi!");
           setIsLoggingIn(false);
           return;
        }
        
        // Cek ke Firestore (Case-insensitive & space-tolerant search)
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        
        let foundDoc = null;
        let foundData = null;
        let foundId = '';

        const searchTarget = username.trim().toLowerCase().replace(/\s+/g, '');
        console.log("Searching for:", searchTarget);

        usersSnap.forEach((d) => {
           const dId = d.id.toLowerCase().replace(/\s+/g, '');
           const dEmail = (d.data().email || '').toLowerCase().replace(/\s+/g, '');
           console.log("Comparing with DB user:", dId, "email:", dEmail);
           if (dId === searchTarget || dEmail === searchTarget) {
              foundDoc = d;
              foundData = d.data();
              foundId = d.id;
           }
        });
        
        if (foundDoc && foundData) {
          const data = foundData;
          const userDocRef = doc(db, 'users', foundId);
          if (data.password === password) {
             if (data.role === role || (role === 'juri' && data.role === 'judge') || (role === 'admin' && data.role === 'admin') || (role === 'admin_leaderboard' && data.role === 'admin_leaderboard')) {
                await updateDoc(userDocRef, { 
                  isOnline: true, 
                  lastLoginAt: serverTimestamp() 
                }).catch(console.error);
                
                await logActivity(
                  foundId, 
                  foundId,
                  data.role,
                  'Login', 
                  'Berhasil masuk ke sistem'
                );

                loginCustom({
                  uid: foundId,
                  appRole: data.role,
                  post: data.post,
                  posts: data.posts,
                  assignedCategories: data.assignedCategories || []
                }, rememberMe);
             } else {
                setErrorMsg("Peran tidak sesuai dengan data pengguna.");
             }
          } else {
             setErrorMsg("Password salah!");
          }
        } else {
          setErrorMsg(`Pengguna tidak ditemukan! (Mencari di ${usersSnap ? usersSnap.size : 0} akun. Kata kunci: ${searchTarget})`);
        }
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg("Gagal login: " + (error.message || "Terjadi kesalahan"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-white p-4 relative overflow-hidden">
      {/* Abstract Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[40%] rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[40%] rounded-full bg-slate-100/50 blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl relative z-10 rounded-2xl">
        <CardHeader className="text-center pb-0 pt-6">
          <div className="mx-auto w-20 h-20 flex items-center justify-center mb-2">
            <img 
              src="https://raw.githubusercontent.com/edibrata/image/main/LKBB%20dan%20Yel-Yel.png" 
              alt="Logo LKBB dan Yel-Yel" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 mb-0.5">
            SIGERAK
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium text-sm px-4 leading-tight">
            Penilaian Pos 1: LKBB dan Yel-Yel<br/>Penjelajahan Pramuka Penggalang Sukaresmi 2026
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-8 pb-6 pt-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 text-sm rounded-xl flex items-start border border-red-100 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="font-medium leading-snug">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-slate-400" />
                Akses Masuk
              </label>
              <div className="relative">
                <select 
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm text-slate-800 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:border-blue-600 appearance-none shadow-sm"
                  value={role} 
                  onChange={(e: any) => setRole(e.target.value)}
                >
                  <option value="juri">Juri Penilai</option>
                  <option value="admin">Admin Dashboard</option>
                  <option value="admin_leaderboard">Admin Leaderboard</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            
            {role !== 'super_admin' && (
              <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                <label className="text-sm font-semibold text-slate-700 flex items-center">
                  <User className="w-4 h-4 mr-2 text-slate-400" />
                  Nama Pengguna
                </label>
                <Input 
                  type="text" 
                  placeholder="Misal: juri1" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  required 
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-600/50 shadow-sm placeholder:text-slate-400 font-medium"
                />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center">
                <KeyRound className="w-4 h-4 mr-2 text-slate-400" />
                Kata Sandi
              </label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Masukkan kata sandi..." 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-600/50 shadow-sm pr-12 font-medium placeholder:text-slate-400"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center pt-2">
              <div className="flex items-center justify-center w-5 h-5 relative">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border border-slate-300 rounded focus:ring-blue-600/50 checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer"
                />
                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <label htmlFor="rememberMe" className="text-sm font-medium text-slate-600 ml-2.5 cursor-pointer select-none">
                Ingat saya di perangkat ini
              </label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-10 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 transition-all duration-200 mt-2" 
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Masuk...
                </span>
              ) : 'Masuk ke Sistem'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Footer Branding */}
      <div className="text-center text-slate-400 text-xs font-medium mt-8 relative z-10">
        &copy; Edi Brata {new Date().getFullYear()}
      </div>
    </div>
  );
}
