export default function CommunitySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm space-y-4 animate-pulse"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
            <div className="w-20 h-6 bg-slate-100 rounded-full" />
          </div>

          {/* Content */}
          <div className="space-y-2 pt-1">
            <div className="h-3.5 bg-slate-200 rounded w-full" />
            <div className="h-3.5 bg-slate-200 rounded w-5/6" />
            <div className="h-3.5 bg-slate-100 rounded w-2/3" />
          </div>

          {/* Image placeholder */}
          <div className="h-60 bg-slate-100 rounded-2xl w-full" />

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded w-16" />
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-4 bg-slate-200 rounded w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}
