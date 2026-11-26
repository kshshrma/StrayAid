import { MapPin, Ambulance, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";

export default function MapPreview() {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <MapPin size={18} />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Live Rescue Map
          </h2>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-800 text-[11px] font-extrabold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Realtime
        </span>
      </div>

      <div className="relative mt-4 h-48 overflow-hidden rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(#a7f3d0_1px,transparent_1px),linear-gradient(90deg,#a7f3d0_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />

        {/* Rescue Markers */}
        <div className="absolute left-10 top-10 p-2 rounded-full glass border border-rose-300 shadow-md">
          <MapPin size={18} className="text-rose-500" fill="currentColor" />
        </div>

        <div className="absolute right-14 top-16 p-2 rounded-full glass border border-emerald-300 shadow-md">
          <Ambulance size={18} className="text-emerald-700" />
        </div>

        <div className="absolute left-28 bottom-8 p-1.5 rounded-full glass border border-rose-300 shadow-md">
          <MapPin size={16} className="text-rose-500" fill="currentColor" />
        </div>

        <div className="absolute right-20 bottom-6 p-1.5 rounded-full glass border border-rose-300 shadow-md">
          <MapPin size={16} className="text-rose-500" fill="currentColor" />
        </div>

        {/* Live Glass Badge */}
        <div className="absolute left-3 top-3 rounded-full glass px-3 py-1 text-[11px] font-extrabold text-emerald-800 border border-white/80 shadow-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          ACTIVE PATROL
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Active Rescues Nearby
          </h3>

          <p className="text-xs font-semibold text-slate-400">
            Tap to open interactive live radar
          </p>
        </div>

        <Button
          onClick={() => navigate("/map")}
          size="sm"
          className="flex items-center gap-1.5 font-bold shadow-md shadow-emerald-700/20"
        >
          Open Map
          <ArrowRight size={15} />
        </Button>
      </div>
    </Card>
  );
}