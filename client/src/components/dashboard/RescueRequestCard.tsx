interface RescueRequestCardProps {
  animal: string;
  severity: string;
  time: string;
}

export default function RescueRequestCard({
  animal,
  severity,
  time,
}: RescueRequestCardProps) {

  function badgeColor() {
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
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 transition hover:bg-gray-50">

      <div>

        <h3 className="font-semibold">
          🐾 {animal}
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          {time}
        </p>

      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor()}`}
      >
        {severity}
      </span>

    </div>
  );
}