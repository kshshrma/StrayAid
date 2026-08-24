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
    { to: "/lost-found", icon: Search, label: "Lost Found" },
    { to: "/connect", icon: MessageSquare, label: "Connect" },
    { to: "/community", icon: Heart, label: "Community" },
    { to: "/rewards", icon: Award, label: "Rewards" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg">
      <div className="mx-auto flex max-w-md justify-around py-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${
                isActive
                  ? "text-green-600"
                  : "text-gray-500"
              }`
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}