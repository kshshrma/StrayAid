import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FloatingReportButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/report")}
      className="
      fixed
      bottom-20
      left-1/2
      z-50
      flex
      h-14
      px-6
      -translate-x-1/2
      items-center
      justify-center
      gap-2
      rounded-full
      bg-green-700
      text-white
      shadow-xl
      transition
      hover:scale-105
      font-semibold
      text-sm
      whitespace-nowrap
      "
    >
      <Plus size={20} />
      <span>Report Animal</span>
    </button>
  );
}