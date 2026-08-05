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

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeRescues: 0,
    nearbyReports: 0,
    guardiansOnline: 0,
    animalsHelped: 0,
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  async function loadDashboardStats() {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    }
  }

  const liveStats = [
    {
      ...dashboardStats[0],
      value: stats.activeRescues.toString(),
    },
    {
      ...dashboardStats[1],
      value: stats.nearbyReports.toString(),
    },
    {
      ...dashboardStats[2],
      value: stats.guardiansOnline.toString(),
    },
    {
      ...dashboardStats[3],
      value: stats.animalsHelped.toString(),
    },
  ];

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6 pb-24">

          <DashboardHeader />

          <HeroCard />

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