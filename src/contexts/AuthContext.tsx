import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../lib/activityLogger';

export interface AppUser {
  uid: string; // username
  appRole: 'super_admin' | 'admin' | 'admin_leaderboard' | 'judge';
  post?: number;
  posts?: number[];
  assignedCategories?: string[];
  originalRole?: 'super_admin' | 'admin';
  originalUid?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  loginCustom: (user: AppUser, rememberMe?: boolean) => void;
  logoutCustom: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  loginCustom: () => {}, 
  logoutCustom: () => {} 
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const storedUser = sessionStorage.getItem('app_user_session') || localStorage.getItem('app_user_session');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as AppUser;
          
          if (parsedUser.appRole === 'super_admin') {
            setUser(parsedUser);
          } else {
            // Verify with Firestore
            const userDocRef = doc(db, 'users', parsedUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUser({
                uid: parsedUser.uid,
                appRole: data.role || 'judge',
                post: data.post,
                posts: data.posts,
                assignedCategories: data.assignedCategories || [],
                originalRole: parsedUser.originalRole,
                originalUid: parsedUser.originalUid
              });
            } else {
              sessionStorage.removeItem('app_user_session');
              localStorage.removeItem('app_user_session');
              setUser(null);
            }
          }
        } catch (error) {
          console.error("Session error:", error);
          sessionStorage.removeItem('app_user_session');
          localStorage.removeItem('app_user_session');
        }
      }
      setLoading(false);
    };
    
    checkSession();
  }, []);

  useEffect(() => {
    if (!user || user.appRole === 'super_admin' || user.uid === 'superadmin') return;

    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: true,
          lastActiveAt: serverTimestamp()
        });
      } catch (err) {
        // ignore
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 3 * 60 * 1000);

    const handleBeforeUnload = () => {
      updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastLogoutAt: serverTimestamp() }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const loginCustom = (newUser: AppUser, rememberMe: boolean = true) => {
    const data = JSON.stringify(newUser);
    if (rememberMe) {
      localStorage.setItem('app_user_session', data);
      sessionStorage.removeItem('app_user_session');
    } else {
      sessionStorage.setItem('app_user_session', data);
      localStorage.removeItem('app_user_session');
    }
    setUser(newUser);
  };

  const logoutCustom = async () => {
    if (user && user.uid && user.uid !== 'superadmin') {
      try {
        await updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastLogoutAt: serverTimestamp() });
        await logActivity(user.uid, user.uid, user.appRole, 'Logout', 'Keluar dari sistem');
      } catch (err) {
        console.error("Error logging out activity:", err);
      }
    }
    localStorage.removeItem('app_user_session');
    sessionStorage.removeItem('app_user_session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginCustom, logoutCustom }}>
      {children}
    </AuthContext.Provider>
  );
};
