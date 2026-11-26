import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl glass-card p-6 transition-all duration-300 hover:shadow-lg hover:border-white/90",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}