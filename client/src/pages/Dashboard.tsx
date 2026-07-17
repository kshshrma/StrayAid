import DashboardLayout from "../layouts/DashboardLayout";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import HeroCard from "../components/dashboard/HeroCard";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardHeader />
        <HeroCard />
      </div>
    </DashboardLayout>
  );
}