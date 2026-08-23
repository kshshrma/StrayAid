import { useEffect, useState } from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import HeroCard from "../components/dashboard/HeroCard";
import StatCard from "../components/dashboard/StatCard";
import MapPreview from "../components/dashboard/MapPreview";
import ImmediateRescueRequests from "../features/reports/ImmediateRescueRequests";
import NearbyReports from "../features/reports/NearbyReports";
import FloatingReportButton from "../components/navigation/FloatingReportButton";

import { dashboardStats } from "../data/dashboardData";
import { getDashboardStats } from "../services/dashboard/getDashboardStats";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeRescues: 0,
    nearbyReports: 0,
    guardiansOnline: 0,
    animalsHelped: 0,
  });

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [activeSection, setActiveSection] = useState<"immediate" | "nearby" | null>(null);

  async function loadDashboardStats() {
    try {
      const data = await getDashboardStats(coords?.lat, coords?.lon);
      setStats(data);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    }
  }

  useEffect(() => {
    loadDashboardStats();
  }, [coords]);

  useEffect(() => {
    // Acquire browser coordinates on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Dashboard geolocation error:", error);
        },
        { enableHighAccuracy: true }
      );
    }

    // Subscribe to real-time updates on reports
    const reportsChannel = supabase
      .channel("public:reports:dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        loadDashboardStats();
      })
      .subscribe();

    // Subscribe to changes in active online guardians availability
    const guardiansChannel = supabase
      .channel("public:guardians:dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "guardians" }, () => {
        loadDashboardStats();
      })
      .subscribe();

    return () => {
      reportsChannel.unsubscribe();
      guardiansChannel.unsubscribe();
    };
  }, []);

  const liveStats = [
    {
      ...dashboardStats[0],
      value: stats.activeRescues.toString(),
    },
    {
      ...dashboardStats[1],
      value: stats.nearbyReports.toString(),
    },
  ];

  const handleCardClick = (section: "immediate" | "nearby") => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6 pb-24">

          <DashboardHeader />

          <HeroCard animalsHelped={stats.animalsHelped} />

          <section className="grid grid-cols-2 gap-4">
            <StatCard
              title={liveStats[0].title}
              value={liveStats[0].value}
              icon={liveStats[0].icon}
              onClick={() => handleCardClick("immediate")}
              isActive={activeSection === "immediate"}
            />
            <StatCard
              title={liveStats[1].title}
              value={liveStats[1].value}
              icon={liveStats[1].icon}
              onClick={() => handleCardClick("nearby")}
              isActive={activeSection === "nearby"}
            />
          </section>

          <MapPreview />

          {activeSection === "immediate" && <ImmediateRescueRequests />}

          {activeSection === "nearby" && <NearbyReports />}

        </div>
      </DashboardLayout>

      <FloatingReportButton />
    </>
  );
}