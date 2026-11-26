import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  onClick?: () => void;
  isActive?: boolean;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  onClick,
  isActive,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-3xl p-4 transition-all duration-200 cursor-pointer select-none active:scale-95 group ${
        isActive
          ? "border-emerald-500/80 bg-emerald-500/10 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20"
          : "hover:bg-white/95 hover:border-white hover:shadow-md"
      }`}
      role="button"
      tabIndex={0}
    >
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 ${
        isActive 
          ? "bg-emerald-600 text-white shadow-xs" 
          : "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"
      }`}>
        <Icon size={18} className="transition-transform group-hover:scale-110" />
      </div>

      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </h2>

      <p className="mt-0.5 text-slate-500 font-bold text-xs tracking-tight line-clamp-1">
        {title}
      </p>
    </div>
  );
}