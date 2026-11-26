import { useNavigate } from "react-router-dom";
import { Siren } from "lucide-react";

export default function FloatingReportButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/report")}
      className="
        fixed
        bottom-20
        left-1/2
        z-40
        flex
        h-13
        px-6
        -translate-x-1/2
        items-center
        justify-center
        gap-2.5
        rounded-full
        glass-button-primary
        text-white
        shadow-xl
        shadow-emerald-600/35
        transition-all
        duration-300
        hover:scale-105
        active:scale-95
        font-bold
        text-sm
        whitespace-nowrap
        cursor-pointer
        group
      "
      aria-label="Report Injured Stray Animal"
    >
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
      </span>
      <span className="tracking-wide text-white drop-shadow-xs">Report Animal</span>
      <Siren size={18} className="text-emerald-100 group-hover:rotate-12 transition-transform duration-200" />
    </button>
  );
}