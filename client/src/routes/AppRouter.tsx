import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Map from "../pages/Map";
import ReportPage from "../features/report/ReportPage";
import Community from "../pages/Community";
import Profile from "../pages/Profile";
import TestConnection from "../pages/TestConnection";
import Register from "../features/auth/Register";
import Login from "../features/auth/Login";
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/map" element={<Map />} />

        <Route path="/report" element={<ReportPage />} />

        <Route path="/community" element={<Community />} />

        <Route path="/profile" element={<Profile />} />

        <Route
          path="/test"
          element={<TestConnection />}
        />
        <Route path="/register" element={<Register />} />
<Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}