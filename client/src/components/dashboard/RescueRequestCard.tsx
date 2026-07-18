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
  const badgeColor =
    severity === "Critical"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 transition hover:bg-gray-50">
      <div>
        <h3 className="font-semibold">{animal}</h3>

        <p className="mt-1 text-sm text-gray-500">
          {time}
        </p>
      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}
      >
        {severity}
      </span>
    </div>
  );
}