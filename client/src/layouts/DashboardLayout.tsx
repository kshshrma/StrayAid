import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <main className="min-h-screen bg-[#F6F7F3]">
      <div className="mx-auto max-w-md px-5 py-6">
        {children}
      </div>
    </main>
  );
}