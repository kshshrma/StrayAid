import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotificationProvider from "../context/NotificationProvider";
import NotificationDrawer from "../components/notifications/NotificationDrawer";
import { supabase } from "../lib/supabase";

import BottomNav from "../components/layout/BottomNav";

import Dashboard from "../pages/Dashboard";
import Map from "../pages/Map";
import Report from "../pages/Report";
import Community from "../pages/Community";
import Profile from "../pages/Profile";
import TestConnection from "../pages/TestConnection";

import Register from "../features/auth/Register";
import Login from "../features/auth/Login";

import ReportsFeed from "../features/report/ReportsFeed";
import ReportDetails from "../features/report/ReportDetails";

import TestAuth from "../pages/TestAuth";
import Guardian from "../pages/Guardian";
import AdminDashboard from "../pages/AdminDashboard";

import ImmediateRescuesPage from "../pages/ImmediateRescuesPage";
import NearbyReportsPage from "../pages/NearbyReportsPage";
import LostFound from "../pages/LostFound";
import Connect from "../pages/Connect";
import Rewards from "../pages/Rewards";

export default function AppRouter() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-500 font-sans">Loading StrayAid...</p>
        </div>
      </div>
    );
  }

  function ProtectedRoute({ children }: { children: React.ReactNode }) {
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  }

  return (
    <NotificationProvider>
      <BrowserRouter>
        {session && <NotificationDrawer />}
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />

          <Route path="/lost-found" element={<ProtectedRoute><LostFound /></ProtectedRoute>} />

          <Route path="/connect" element={<ProtectedRoute><Connect /></ProtectedRoute>} />

          <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />

          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />

          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/test" element={<TestConnection />} />
          <Route path="/test-auth" element={<TestAuth />} />
          
          <Route 
            path="/register" 
            element={session ? <Navigate to="/" replace /> : <Register />} 
          />

          <Route 
            path="/login" 
            element={session ? <Navigate to="/" replace /> : <Login />} 
          />

          <Route path="/reports" element={<ProtectedRoute><ReportsFeed /></ProtectedRoute>} />

          <Route
            path="/reports/immediate"
            element={<ProtectedRoute><ImmediateRescuesPage /></ProtectedRoute>}
          />

          <Route
            path="/reports/nearby"
            element={<ProtectedRoute><NearbyReportsPage /></ProtectedRoute>}
          />

          <Route
            path="/reports/:id"
            element={<ProtectedRoute><ReportDetails /></ProtectedRoute>}
          />

          <Route
            path="/guardian"
            element={<ProtectedRoute><Guardian /></ProtectedRoute>}
          />

          <Route
            path="/admin"
            element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
          />
          
        </Routes>

        {session && <BottomNav />}
      </BrowserRouter>
    </NotificationProvider>
  );
}