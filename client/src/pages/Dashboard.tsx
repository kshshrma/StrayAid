import DashboardLayout from "../layouts/DashboardLayout";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import HeroCard from "../components/dashboard/HeroCard";
import StatCard from "../components/dashboard/StatCard";
import MapPreview from "../components/dashboard/MapPreview";
import RescueRequests from "../components/dashboard/RescueRequests";

import BottomNavigation from "../components/navigation/BottomNavigation";
import FloatingReportButton from "../components/navigation/FloatingReportButton";

import { dashboardStats } from "../data/dashboardData";

export default function Dashboard() {
  return (
    <>
      <DashboardLayout>
        <div className="space-y-6 pb-28">
          <DashboardHeader />

          <HeroCard />

          <section className="grid grid-cols-2 gap-4">
            {dashboardStats.map((stat) => (
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

      <BottomNavigation />
    </>
  );
}