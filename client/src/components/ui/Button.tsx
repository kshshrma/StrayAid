import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline" | "glass";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer select-none",

        {
          // Primary Emerald Glass
          "glass-button-primary":
            variant === "primary",

          // Secondary White Frosted Glass
          "glass-button-secondary font-bold":
            variant === "secondary",

          // Danger Rose Glass
          "bg-gradient-to-r from-rose-600/90 to-red-600/90 text-white backdrop-blur-xl border border-white/30 shadow-lg shadow-rose-600/25 hover:from-rose-600 hover:to-red-600":
            variant === "danger",

          // Subtle Translucent Glass Outline
          "border border-slate-200/80 bg-white/60 backdrop-blur-md text-slate-700 hover:bg-white/90 hover:border-slate-300 shadow-xs":
            variant === "outline",

          // Pure Frosted Glass
          "bg-white/70 backdrop-blur-xl border border-white/70 text-slate-800 hover:bg-white/90 shadow-sm":
            variant === "glass",
        },

        {
          "px-3.5 py-2 text-xs min-h-[38px]": size === "sm",
          "px-5 py-2.5 text-sm min-h-[46px]": size === "md",
          "px-7 py-3.5 text-base min-h-[52px]": size === "lg",
        },

        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}