interface RescueRequestCardProps {
  animal: string;
  severity: string;
  time: string;
  greyed?: boolean;
}

export default function RescueRequestCard({
  animal,
  severity,
  time,
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
    <div className={`flex items-center justify-between rounded-2xl border p-4 ${
      greyed 
        ? "bg-slate-50 border-slate-200 opacity-50 grayscale pointer-events-none" 
        : "bg-white border-gray-100 transition hover:bg-gray-50"
    }`}>

      <div>

        <h3 className="font-semibold text-slate-800">
          🐾 {animal}
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {time}
        </p>

      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor()}`}
      >
        {greyed ? "Claimed" : severity}
      </span>

    </div>
  );
}