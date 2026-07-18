import { navigationItems } from "../../data/dashboardData";

export default function BottomNavigation() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white">
      <div className="flex justify-around py-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className="flex flex-col items-center text-xs"
            >
              <Icon
                size={22}
                className={
                  item.active
                    ? "text-green-700"
                    : "text-gray-400"
                }
              />

              <span
                className={
                  item.active
                    ? "mt-1 font-semibold text-green-700"
                    : "mt-1 text-gray-500"
                }
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}