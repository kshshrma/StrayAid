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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition active:scale-95 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        <LivesSaved />
      </div>
    </DashboardLayout>
  );
}
