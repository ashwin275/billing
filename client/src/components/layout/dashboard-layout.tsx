// Main dashboard layout component that wraps dashboard pages
import { ReactNode } from "react";
import Header from "./header";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * DashboardLayout component provides the common layout structure for dashboard pages
 * Includes header and main content area with responsive design and collapsible sidebar support
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex">
        {children}
      </div>
    </div>
  );
}
