import DashboardLayout from "../layouts/DashboardLayout";
import LivesSaved from "../features/reports/LivesSaved";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LivesSavedPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-28">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl glass-button-secondary text-xs font-bold text-slate-700 shadow-xs active:scale-95 transition-all group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        <LivesSaved />
      </div>
    </DashboardLayout>
  );
}
