// 404 Not Found page component for billing dashboard
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Receipt, Search } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

export default function NotFound() {
  const userIsAuthenticated = isAuthenticated();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <Receipt className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-medium text-slate-600">Billing Dashboard</h2>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="mb-8">
              <div className="text-7xl font-bold text-primary mb-4">404</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">Page Not Found</h1>
              <p className="text-slate-600 leading-relaxed">
                The page you're looking for doesn't exist or has been moved. 
                It might have been deleted or the URL was typed incorrectly.
              </p>
            </div>
            
            <div className="space-y-3">
              {userIsAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button className="w-full" size="lg">
                      <Home className="mr-2 h-4 w-4" />
                      Go to Dashboard
                    </Button>
                  </Link>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/dashboard">
                      <Button variant="outline" className="w-full">
                        <Search className="mr-2 h-4 w-4" />
                        Browse
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => window.history.back()}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Go Back
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/signin">
                    <Button className="w-full" size="lg">
                      <Home className="mr-2 h-4 w-4" />
                      Sign In
                    </Button>
                  </Link>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/signup">
                      <Button variant="outline" className="w-full">
                        Create Account
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => window.history.back()}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Go Back
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Helpful Links */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-3">Common pages:</p>
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                {userIsAuthenticated ? (
                  <>
                    <Link href="/dashboard" className="text-primary hover:underline">Dashboard</Link>
                    <span className="text-slate-300">•</span>
                    <Link href="/dashboard" className="text-primary hover:underline">Products</Link>
                    <span className="text-slate-300">•</span>
                    <Link href="/dashboard" className="text-primary hover:underline">Users</Link>
                    <span className="text-slate-300">•</span>
                    <Link href="/dashboard" className="text-primary hover:underline">Reports</Link>
                  </>
                ) : (
                  <>
                    <Link href="/signin" className="text-primary hover:underline">Sign In</Link>
                    <span className="text-slate-300">•</span>
                    <Link href="/signup" className="text-primary hover:underline">Sign Up</Link>
                    <span className="text-slate-300">•</span>
                    <Link href="/forgot-password" className="text-primary hover:underline">Reset Password</Link>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}