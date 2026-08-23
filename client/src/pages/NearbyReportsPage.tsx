import DashboardLayout from "../layouts/DashboardLayout";
import NearbyReports from "../features/reports/NearbyReports";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NearbyReportsPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 pt-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <NearbyReports />
      </div>
    </DashboardLayout>
  );
}
