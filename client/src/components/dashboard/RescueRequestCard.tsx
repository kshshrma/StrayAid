interface RescueRequestCardProps {
  animal: string;
  severity: string;
  time: string;
  imageUrl?: string;
  greyed?: boolean;
}

export default function RescueRequestCard({
  animal,
  severity,
  time,
  imageUrl,
  greyed,
}: RescueRequestCardProps) {

  function badgeColor() {
    if (greyed) {
      return "bg-slate-200 text-slate-500 border-slate-300";
    }
    switch (severity) {
      case "Critical":
        return "bg-red-100 text-red-700";

      case "High":
        return "bg-orange-100 text-orange-700";

      case "Medium":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-green-100 text-green-700";
    }
  }

  return (
    <div className={`flex items-center justify-between rounded-2xl border p-3.5 gap-4 ${
      greyed 
        ? "bg-slate-500/10 border-slate-300 opacity-60 grayscale pointer-events-none" 
        : "bg-white border-gray-100 transition hover:bg-gray-50"
    }`}>

      <div className="flex items-center gap-3.5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={animal}
            className="h-12 w-12 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
            🐾
          </div>
        )}

        <div>
          <h3 className="font-semibold text-slate-800 text-sm">
            {animal}
          </h3>

          <p className="mt-0.5 text-xs text-slate-400">
            {time}
          </p>
        </div>
      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${badgeColor()}`}
      >
        {greyed ? "Claimed" : severity}
      </span>

    </div>
  );
}