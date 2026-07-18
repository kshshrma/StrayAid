import { Plus } from "lucide-react";

export default function FloatingReportButton() {
  return (
    <button
      className="
      fixed
      bottom-20
      left-1/2
      z-50
      flex
      h-16
      w-16
      -translate-x-1/2
      items-center
      justify-center
      rounded-full
      bg-green-700
      text-white
      shadow-xl
      transition
      hover:scale-105
      "
    >
      <Plus size={30} />
    </button>
  );
}