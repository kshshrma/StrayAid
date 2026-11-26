import { NavLink } from "react-router-dom";
import {
  Home,
  Search,
  MessageSquare,
  Heart,
  Award,
} from "lucide-react";

export default function BottomNav() {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/lost-found", icon: Search, label: "Lost & Found" },
    { to: "/connect", icon: MessageSquare, label: "Connect" },
    { to: "/community", icon: Heart, label: "Community" },
    { to: "/rewards", icon: Award, label: "Rewards" },
  ];

  return (
    <nav className="fixed bottom-2.5 left-3 right-3 z-50 max-w-md mx-auto pointer-events-auto">
      <div className="glass-dock rounded-3xl px-2 py-1.5 flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 select-none ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-700 font-bold border border-emerald-500/25 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40 font-medium"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  className={`transition-transform duration-200 ${
                    isActive ? "scale-110 stroke-[2.4]" : "stroke-[1.8]"
                  }`}
                />
                <span className="text-[10px] mt-0.5 tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}