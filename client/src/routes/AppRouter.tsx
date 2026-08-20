import { BrowserRouter, Routes, Route } from "react-router-dom";

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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/map" element={<Map />} />

        <Route path="/report" element={<Report />} />

        <Route path="/community" element={<Community />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/test" element={<TestConnection />} />
<Route path="/test-auth" element={<TestAuth />} />
        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/reports" element={<ReportsFeed />} />

        <Route
          path="/reports/:id"
          element={<ReportDetails />}
        />

        {/* Guardian Registration */}
        <Route
          path="/guardian"
          element={<Guardian  />}
        />
        
      </Routes>

      <BottomNav />
    </BrowserRouter>
  );
}