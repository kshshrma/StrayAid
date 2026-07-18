import Card from "../ui/Card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
}: StatCardProps) {
  return (
    <Card className="p-5 hover:-translate-y-1">
      <Icon
        className="text-green-700"
        size={26}
      />

      <h2 className="mt-4 text-3xl font-bold">
        {value}
      </h2>

      <p className="mt-1 text-gray-500">
        {title}
      </p>
    </Card>
  );
}