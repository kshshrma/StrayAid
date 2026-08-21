import { useEffect, useState } from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import HeroCard from "../components/dashboard/HeroCard";
import StatCard from "../components/dashboard/StatCard";
import MapPreview from "../components/dashboard/MapPreview";
import RescueRequests from "../components/dashboard/RescueRequests";
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

  async function loadDashboardStats() {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    }
  }

  useEffect(() => {
    loadDashboardStats();

    // Subscribe to real-time updates on reports (status updates, inserts, deletes)
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

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6 pb-24">

          <DashboardHeader />

          <HeroCard animalsHelped={stats.animalsHelped} />

          <section className="grid grid-cols-2 gap-4">
            {liveStats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
              />
            ))}
          </section>

          <MapPreview />

          <RescueRequests />

        </div>
      </DashboardLayout>

      <FloatingReportButton />
    </>
  );
}