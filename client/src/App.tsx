// Main App component with routing and authentication
import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Page components
import SignIn from "@/pages/auth/signin";
import SignUp from "@/pages/auth/signup";
import ForgotPassword from "@/pages/auth/forgot-password";
import Dashboard from "@/pages/dashboard/dashboard";
import CreateInvoice from "@/pages/create-invoice";

import Reports from "@/pages/reports";
import ProtectedRoute from "@/components/auth/protected-route";
import NotFound from "@/pages/not-found";

// Authentication utilities
import { isAuthenticated } from "@/lib/auth";

/**
 * Router component handles all application routing
 * Includes public auth routes and protected dashboard routes
 */
function Router() {
  const [authState, setAuthState] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setAuthState(authenticated);
    };
    
    checkAuth();
    
    // Listen for storage changes (logout events)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === null) {
        checkAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom auth events
    const handleAuthChange = () => {
      checkAuth();
    };
    
    window.addEventListener('authStateChange', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChange', handleAuthChange);
    };
  }, []);

  // Don't render anything until auth state is determined
  if (authState === null) {
    return null;
  }

  return (
    <Switch>
      {/* Redirect root to appropriate page based on auth status */}
      <Route path="/">
        {authState ? <Redirect to="/dashboard" /> : <Redirect to="/signin" />}
      </Route>

      {/* Public authentication routes - redirect to dashboard if already authenticated */}
      <Route path="/signin">
        {authState ? <Redirect to="/dashboard" /> : <SignIn />}
      </Route>
      <Route path="/signup">
        {authState ? <Redirect to="/dashboard" /> : <SignUp />}
      </Route>
      <Route path="/forgot-password">
        {authState ? <Redirect to="/dashboard" /> : <ForgotPassword />}
      </Route>

      {/* Protected dashboard routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Protected invoice creation route */}
      <Route path="/invoices/create">
        <ProtectedRoute>
          <CreateInvoice />
        </ProtectedRoute>
      </Route>
      


      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Main App component with global providers
 * Sets up React Query, tooltips, and toast notifications
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
