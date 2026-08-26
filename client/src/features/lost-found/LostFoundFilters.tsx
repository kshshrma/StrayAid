interface LostFoundFiltersProps {
  filter: "all" | "lost" | "found";
  setFilter: (filter: "all" | "lost" | "found") => void;
}

export default function LostFoundFilters({
  filter,
  setFilter,
}: LostFoundFiltersProps) {
  return (
    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
      <button
        onClick={() => setFilter("all")}
        className={`flex-grow py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
          filter === "all"
            ? "bg-white text-slate-800 shadow-sm border border-slate-200/20"
            : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
        }`}
      >
        All Reports
      </button>
      <button
        onClick={() => setFilter("lost")}
        className={`flex-grow py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
          filter === "lost"
            ? "bg-red-500 text-white shadow-md border border-red-500 shadow-red-100"
            : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
        }`}
      >
        🚨 Lost
      </button>
      <button
        onClick={() => setFilter("found")}
        className={`flex-grow py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
          filter === "found"
            ? "bg-blue-500 text-white shadow-md border border-blue-500 shadow-blue-100"
            : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
        }`}
      >
        ✅ Found
      </button>
    </div>
  );
}
