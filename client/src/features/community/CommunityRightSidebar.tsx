import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Sun,
  Droplets,
  HeartHandshake,
  PhoneCall,
} from "lucide-react";

export default function CommunityRightSidebar() {
  const tips = [
    {
      title: "Street Hydration",
      icon: Droplets,
      color: "text-blue-500 bg-blue-50",
      desc: "Place earthen pots with clean water in shaded corners. Earthen pots keep water cool naturally.",
    },
    {
      title: "Heatstroke Alert",
      icon: Sun,
      color: "text-amber-500 bg-amber-50",
      desc: "Excessive panting or lethargy in strays signals dehydration. Wet their paws and move to shade.",
    },
    {
      title: "Foster Coordination",
      icon: HeartHandshake,
      color: "text-emerald-500 bg-emerald-50",
      desc: "Temporary 1-2 week fosters drastically improve recovery rates after field treatment.",
    },
  ];

  return (
    <aside className="space-y-5">
      {/* Tasteful Guardian CTA Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 shadow-md shadow-emerald-100 space-y-3.5 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <ShieldAlert size={18} />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white/95">
            Guardian Network
          </span>
        </div>

        <div>
          <h4 className="text-base font-black tracking-tight leading-snug">
            Become a StrayAid Street Guardian
          </h4>
          <p className="text-xs text-white/85 mt-1 leading-relaxed">
            Receive automated alerts when injured or trapped animals need rescue near your home or office.
          </p>
        </div>

        <Link
          to="/guardian"
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs transition shadow-sm active:scale-95"
        >
          <span>Open Guardian Portal</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Featured Community Story Spotlight */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-500" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Story Spotlight
            </h4>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Inspiring
          </span>
        </div>

        <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
          <img
            src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400"
            alt="Sheru recovery"
            className="w-full h-32 object-cover"
            loading="lazy"
          />
        </div>

        <div>
          <h5 className="text-xs font-bold text-slate-900 leading-snug">
            Sheru's Metro Station Recovery
          </h5>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
            Rescued by Sneha with a shattered leg. Fully healed and adopted after 2 weeks of community care.
          </p>
        </div>
      </div>

      {/* Seasonal Care & First-Aid Guidelines */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-5 space-y-3.5">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Stray Animal Care Guide
          </h4>
        </div>

        <div className="space-y-3">
          {tips.map((tip, idx) => {
            const Icon = tip.icon;
            return (
              <div key={idx} className="flex gap-2.5 items-start">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${tip.color}`}
                >
                  <Icon size={14} />
                </span>
                <div className="flex-1 text-xs leading-tight">
                  <span className="font-bold text-slate-800 block">
                    {tip.title}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {tip.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Emergency NGO Helplines */}
      <div className="rounded-3xl bg-slate-50 border border-slate-200/70 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <PhoneCall size={14} className="text-emerald-600" />
          <span>Emergency Vet Coordination</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          For acute critical emergencies, submit a report via the bottom red button or connect directly with our partner NGOs.
        </p>
      </div>
    </aside>
  );
}
