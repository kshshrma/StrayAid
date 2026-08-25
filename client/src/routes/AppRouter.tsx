import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotificationProvider from "../context/NotificationProvider";
import NotificationDrawer from "../components/notifications/NotificationDrawer";

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
  return (
    <NotificationProvider>
      <BrowserRouter>
        <NotificationDrawer />
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route path="/map" element={<Map />} />

          <Route path="/lost-found" element={<LostFound />} />

          <Route path="/connect" element={<Connect />} />

          <Route path="/rewards" element={<Rewards />} />

          <Route path="/report" element={<Report />} />

          <Route path="/community" element={<Community />} />

          <Route path="/profile" element={<Profile />} />

          <Route path="/test" element={<TestConnection />} />
          <Route path="/test-auth" element={<TestAuth />} />
          <Route path="/register" element={<Register />} />

          <Route path="/login" element={<Login />} />

          <Route path="/reports" element={<ReportsFeed />} />

          <Route
            path="/reports/immediate"
            element={<ImmediateRescuesPage />}
          />

          <Route
            path="/reports/nearby"
            element={<NearbyReportsPage />}
          />

          <Route
            path="/reports/:id"
            element={<ReportDetails />}
          />

          <Route
            path="/guardian"
            element={<Guardian  />}
          />

          <Route
            path="/admin"
            element={<AdminDashboard />}
          />
          
        </Routes>

        <BottomNav />
      </BrowserRouter>
    </NotificationProvider>
  );
}