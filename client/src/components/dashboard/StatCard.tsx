import Card from "../ui/Card";
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
    <Card
      onClick={onClick}
      className={`p-5 transition hover:-translate-y-1 cursor-pointer select-none border-2 ${
        isActive
          ? "border-green-600 bg-green-50/30 shadow-md"
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      <Icon
        className={isActive ? "text-green-600 animate-pulse" : "text-green-700"}
        size={26}
      />

      <h2 className="mt-4 text-3xl font-bold">
        {value}
      </h2>

      <p className="mt-1 text-gray-500 font-semibold text-sm">
        {title}
      </p>
    </Card>
  );
}