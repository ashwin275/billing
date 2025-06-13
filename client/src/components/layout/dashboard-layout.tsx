// Main dashboard layout component that wraps dashboard pages
import { ReactNode } from "react";
import Header from "./header";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * DashboardLayout component provides the common layout structure for dashboard pages
 * Includes header and main content area with responsive design
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex flex-col lg:flex-row">
        {children}
      </div>
    </div>
  );
}
