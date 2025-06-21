import { ReactNode } from "react";
import { useLocation } from "wouter";
import { getAuthToken, decodeToken } from "@/lib/auth";

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [, setLocation] = useLocation();

  const isAdmin = () => {
    const token = getAuthToken();
    if (!token) return false;
    
    try {
      const decoded = decodeToken(token);
      return decoded.roleName === "ROLE_ADMIN";
    } catch (error) {
      return false;
    }
  };

  if (!isAdmin()) {
    // Redirect to dashboard if not admin
    setLocation("/dashboard");
    return null;
  }

  return <>{children}</>;
}