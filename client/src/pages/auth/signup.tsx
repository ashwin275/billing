// Sign-up page component for the billing dashboard
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, User, Mail, Phone, MapPin, Calendar, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { authApi, handleApiError } from "@/lib/api";
import { Country } from "@/types/auth";

// Form validation schema
const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  place: z.string().min(2, "Place must be at least 2 characters"),
  age: z.number().min(18, "You must be at least 18 years old").max(120, "Age must be less than 120"),
  countryId: z.number().min(1, "Please select a country"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

/**
 * SignUp component handles user registration
 * Fetches countries from API and integrates with backend for user creation
 */
export default function SignUp() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      place: "",
      age: 18,
      countryId: 0,
      password: "",
      confirmPassword: "",
    },
  });

  /**
   * Load countries from API on component mount
   */
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await authApi.getCountries();
        setCountries(countriesData);
        
        // Set India as default if available
        const india = countriesData.find(country => 
          country.country.toLowerCase().includes('india') || 
          country.countryCode.toLowerCase() === 'in'
        );
        if (india) {
          form.setValue('countryId', india.countryId);
        }
      } catch (error) {
        toast({
          title: "Error loading countries",
          description: "Failed to load countries. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, [toast, form]);

  /**
   * Handle form submission and API call
   */
  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    
    try {
      // Prepare signup data (roleId is hardcoded to 4 as specified)
      const signUpData = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        place: data.place,
        age: data.age,
        countryId: data.countryId,
        password: data.password,
      };

      // Call sign-up API
      await authApi.signUp(signUpData);

      toast({
        title: "Account created successfully!",
        description: "Please sign in with your new account.",
      });

      // Redirect to sign-in page
      setLocation("/signin");
      
    } catch (error: any) {
      let errorMessage = "Sign up failed";
      
      if (error && typeof error === 'object') {
        // Handle API error response
        if (error.detail) {
          errorMessage = error.detail;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Sign up failed",
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
            <h1 className="text-4xl font-bold mb-4">Join Our Platform</h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Create your account and start managing your billing operations efficiently with our powerful tools.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">Quick account setup</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">Secure data protection</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
              <span className="text-white/90">24/7 customer support</span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 h-32 w-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 h-24 w-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {/* Right side - Sign up form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-8">
            {/* Logo for mobile */}
            <div className="lg:hidden mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4">
              <Receipt className="h-6 w-6 text-primary-foreground" />
            </div>
            
            <CardTitle className="text-2xl font-bold text-slate-900">Create your account</CardTitle>
            <CardDescription className="text-slate-600">Start managing your billing today</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name Input */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    {...form.register("fullName")}
                    className="pr-10"
                  />
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {form.formState.errors.fullName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
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

              {/* Phone and Country Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Country Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="countryId">Country</Label>
                  <Select
                    value={form.watch("countryId")?.toString() || ""}
                    onValueChange={(value) => form.setValue("countryId", parseInt(value))}
                    disabled={loadingCountries}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCountries ? "Loading..." : "Select Country"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.countryId} value={country.countryId.toString()}>
                          {country.country} ({country.countryCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.countryId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.countryId.message}
                    </p>
                  )}
                </div>

                {/* Phone Input */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Phone number"
                      {...form.register("phone")}
                      className="pr-10"
                    />
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Place and Age Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Place Input */}
                <div className="space-y-2">
                  <Label htmlFor="place">Place</Label>
                  <div className="relative">
                    <Input
                      id="place"
                      placeholder="Your place"
                      {...form.register("place")}
                      className="pr-10"
                    />
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {form.formState.errors.place && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.place.message}
                    </p>
                  )}
                </div>

                {/* Age Input */}
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <div className="relative">
                    <Input
                      id="age"
                      type="number"
                      min="18"
                      max="120"
                      placeholder="Age"
                      {...form.register("age", { valueAsNumber: true })}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {form.formState.errors.age && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.age.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
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

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    {...form.register("confirmPassword")}
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
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long
                </p>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Contains at least one special character (@$!%*?&)</li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || loadingCountries}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>

              {/* Sign In Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/signin" className="font-medium text-primary hover:underline">
                    Sign in here
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