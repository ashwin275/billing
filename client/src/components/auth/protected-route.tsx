// Protected route component that requires authentication
import { ReactNode } from "react";
import { Redirect } from "wouter";
import { isAuthenticated } from "@/lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute component ensures users are authenticated before accessing protected pages
 * Redirects to sign-in page if user is not authenticated
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Simple synchronous auth check to prevent infinite loops
  const authenticated = isAuthenticated();
  
  if (!authenticated) {
    return <Redirect to="/signin" />;
  }

  return <>{children}</>;
}
