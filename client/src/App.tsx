// Main App component with routing and authentication
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
import ProtectedRoute from "@/components/auth/protected-route";
import NotFound from "@/pages/not-found";

// Authentication utilities
import { isAuthenticated } from "@/lib/auth";

/**
 * Router component handles all application routing
 * Includes public auth routes and protected dashboard routes
 */
function Router() {
  try {
    return (
      <Switch>
        {/* Redirect root to appropriate page based on auth status */}
        <Route path="/">
          {isAuthenticated() ? <Redirect to="/dashboard" /> : <Redirect to="/signin" />}
        </Route>

        {/* Public authentication routes - redirect to dashboard if already authenticated */}
        <Route path="/signin">
          {isAuthenticated() ? <Redirect to="/dashboard" /> : <SignIn />}
        </Route>
        <Route path="/signup">
          {isAuthenticated() ? <Redirect to="/dashboard" /> : <SignUp />}
        </Route>
        <Route path="/forgot-password">
          {isAuthenticated() ? <Redirect to="/dashboard" /> : <ForgotPassword />}
        </Route>

        {/* Protected dashboard routes */}
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>

        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    );
  } catch (error) {
    console.error('Router error:', error);
    return <SignIn />;
  }
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
