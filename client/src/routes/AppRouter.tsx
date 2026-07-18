import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Map from "../pages/Map";
import Report from "../pages/Report";
import Community from "../pages/Community";
import Profile from "../pages/Profile";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/map" element={<Map />} />

        <Route path="/report" element={<Report />} />

        <Route
          path="/community"
          element={<Community />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />
      </Routes>
    </BrowserRouter>
  );
}