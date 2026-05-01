import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Admin Pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProjects from './pages/admin/Projects';
import AdminTrainingDetail from './pages/admin/TrainingDetail';
import AdminAnalytics from './pages/admin/Analytics';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Attendee Pages
import AttendancePage from './pages/attendee/AttendancePage';
import PreTestPage from './pages/attendee/PreTestPage';
import PostTestPage from './pages/attendee/PostTestPage';
import EvaluationPage from './pages/attendee/EvaluationPage';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Attendee-Facing Routes (public, Arabic RTL) */}
      <Route path="/attendance" element={<AttendancePage />} />
      <Route path="/pretest" element={<PreTestPage />} />
      <Route path="/posttest" element={<PostTestPage />} />
      <Route path="/evaluation" element={<EvaluationPage />} />

      {/* Admin Auth */}
      <Route
        path="/admin/login"
        element={session ? <Navigate to="/admin" replace /> : <AdminLogin />}
      />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="trainings/:id" element={<AdminTrainingDetail />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
