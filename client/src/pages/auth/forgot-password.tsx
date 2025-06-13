// Forgot password page component for the billing dashboard
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, Receipt, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * ForgotPassword component handles password reset requests
 * Sends reset email through the backend API
 */
export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  /**
   * Handle form submission and API call
   */
  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    
    try {
      // Call forgot password API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.title || errorData.detail || "Failed to send reset email");
      }

      setEmailSent(true);
      toast({
        title: "Reset email sent!",
        description: "Please check your email for password reset instructions.",
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to send reset email",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
              <h1 className="text-4xl font-bold mb-4">Check Your Email</h1>
              <p className="text-xl text-white/90 leading-relaxed">
                We've sent password reset instructions to your email address.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-white rounded-full"></div>
                <span className="text-white/90">Secure password reset</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-white rounded-full"></div>
                <span className="text-white/90">Link expires in 24 hours</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-white rounded-full"></div>
                <span className="text-white/90">Check spam folder if needed</span>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-20 right-20 h-32 w-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 h-24 w-24 bg-white/10 rounded-full blur-xl"></div>
        </div>

        {/* Right side - Success message */}
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-emerald-600" />
              </div>
              
              <CardTitle className="text-2xl font-bold text-slate-900">Email Sent!</CardTitle>
              <CardDescription className="text-slate-600">
                We've sent password reset instructions to {form.getValues('email')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-slate-600">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                
                <Button 
                  variant="outline" 
                  onClick={() => setEmailSent(false)}
                  className="w-full"
                >
                  Send Again
                </Button>
                
                <Link href="/signin">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <h1 className="text-4xl font-bold mb-4">Reset Password</h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">Secure password reset</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">Quick and easy process</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">Account security priority</span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 h-32 w-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 h-24 w-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {/* Right side - Forgot password form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-8">
            {/* Logo for mobile */}
            <div className="lg:hidden mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4">
              <Receipt className="h-6 w-6 text-primary-foreground" />
            </div>
            
            <CardTitle className="text-2xl font-bold text-slate-900">Forgot Password?</CardTitle>
            <CardDescription className="text-slate-600">
              Enter your email to receive reset instructions
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    {...form.register("email")}
                    className="pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Reset Instructions
                  </>
                )}
              </Button>

              {/* Back to Sign In Link */}
              <div className="text-center">
                <Link href="/signin" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}