import { MapPin, Ambulance, ArrowRight } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";

export default function MapPreview() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Live Rescue Map
        </h2>

        <MapPin className="text-green-700" />
      </div>

      <div className="relative mt-5 h-52 overflow-hidden rounded-2xl bg-green-50">

        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(#d1fae5_1px,transparent_1px),linear-gradient(90deg,#d1fae5_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Rescue Markers */}
        <MapPin
          className="absolute left-10 top-12 text-red-500"
          fill="currentColor"
        />

        <Ambulance
          className="absolute right-16 top-20 text-green-700"
        />

        <MapPin
          className="absolute left-32 bottom-12 text-red-500"
          fill="currentColor"
        />

        <MapPin
          className="absolute right-24 bottom-8 text-red-500"
          fill="currentColor"
        />

        {/* Live Badge */}
        <div className="absolute left-4 top-4 rounded-full bg-green-700 px-3 py-1 text-xs font-semibold text-white">
          ● LIVE
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            8 Active Rescues
          </h3>

          <p className="text-sm text-gray-500">
            Updated a few seconds ago
          </p>
        </div>

        <Button
          className="flex items-center gap-2"
        >
          Open Map
          <ArrowRight size={18} />
        </Button>
      </div>
    </Card>
  );
}