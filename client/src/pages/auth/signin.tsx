// Sign-in page component for the billing dashboard
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

import { authApi, handleApiError } from "@/lib/api";
import { storeAuthToken, decodeToken, storeUserData } from "@/lib/auth";
import { SignInData } from "@/types/auth";

// Form validation schema
const signInSchema = z.object({
  identifier: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type SignInFormData = z.infer<typeof signInSchema>;

/**
 * SignIn component handles user authentication
 * Integrates with the backend API for user login
 */
export default function SignIn() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  });

  /**
   * Handle form submission and API call
   */
  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    
    try {
      const credentials: SignInData = {
        identifier: data.identifier,
        password: data.password,
      };

      // Call sign-in API
      const response = await authApi.signIn(credentials);
      
      // Store authentication token
      storeAuthToken(response);

      // Decode token to get user info and store it
      const userInfo = decodeToken(response.token);
      if (userInfo) {
        storeUserData({
          userId: userInfo.userId,
          fullName: userInfo.fullName,
          email: userInfo.sub,
          phone: userInfo.phone || '',
          place: userInfo.place || '',
          age: userInfo.age || 0,
          roleId: userInfo.roleId,
          roleName: userInfo.roleName,
        });
      }

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      // Redirect to dashboard
      setLocation("/dashboard");
      
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Design/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-600 to-primary-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
              <Receipt className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Billing Dashboard</h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Streamline your invoice management and track payments with our comprehensive billing solution.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">Real-time payment tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">Automated invoice generation</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">Advanced analytics & reports</span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 h-32 w-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 h-24 w-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {/* Right side - Sign in form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-8">
            {/* Logo for mobile */}
            <div className="lg:hidden mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4">
              <Receipt className="h-6 w-6 text-primary-foreground" />
            </div>
            
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome back</CardTitle>
            <CardDescription className="text-slate-600">Sign in to access your billing dashboard</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="identifier">Email address</Label>
                <div className="relative">
                  <Input
                    id="identifier"
                    type="email"
                    placeholder="Enter your email address"
                    {...form.register("identifier")}
                    className="pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {form.formState.errors.identifier && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.identifier.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...form.register("password")}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rememberMe" 
                    {...form.register("rememberMe")}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal">
                    Remember me
                  </Label>
                </div>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>

              {/* Sign Up Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/signup" className="font-medium text-primary hover:underline">
                    Sign up here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}