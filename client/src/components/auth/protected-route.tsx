// Protected route component that requires authentication
import { ReactNode, useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { isAuthenticated } from "@/lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute component ensures users are authenticated before accessing protected pages
 * Redirects to sign-in page if user is not authenticated
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [location] = useLocation();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsUserAuthenticated(authenticated);
      setIsAuthChecked(true);
    };

    checkAuth();
  }, [location]);

  // Don't render anything until auth check is complete
  if (!isAuthChecked) {
    return null;
  }

  // Redirect to signin if not authenticated
  if (!isUserAuthenticated) {
    return <Redirect to="/signin" />;
  }

  return <>{children}</>;
}
