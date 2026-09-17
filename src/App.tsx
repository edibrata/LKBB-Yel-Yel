/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { JudgeDashboard } from './pages/JudgeDashboard';
import { JudgeScoring } from './pages/JudgeScoring';

function PrivateRoute({ children, role }: { children: React.ReactNode, role?: 'admin' | 'judge' | 'super_admin' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (role) {
    if (role === 'admin' && (user.appRole !== 'admin' && user.appRole !== 'super_admin' && user.appRole !== 'admin_leaderboard')) {
      return <Navigate to={user.appRole === 'judge' ? '/judge' : '/admin'} />;
    }
    if (role === 'judge' && user.appRole !== 'judge' && user.appRole !== 'super_admin') {
      return <Navigate to="/admin" />;
    }
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/judge" element={<PrivateRoute role="judge"><JudgeDashboard /></PrivateRoute>} />
          <Route path="/judge/scoring/:participantId" element={<PrivateRoute role="judge"><JudgeScoring /></PrivateRoute>} />
          <Route path="/" element={<PrivateRoute><RedirectRoot /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

function RedirectRoot() {
  const { user } = useAuth();
  if (user?.appRole === 'judge') return <Navigate to="/judge" />;
  return <Navigate to="/admin" />;
}
