// Profile management component with user info, edit profile, and change password
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Edit2,
  Lock,
  Save,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  UserCircle,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken, decodeToken } from "@/lib/auth";
import { authApi, profileApi } from "@/lib/api";

// Validation schemas
const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  place: z.string().min(2, "Place must be at least 2 characters"),
  countryId: z.number().min(1, "Please select a country"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Please enter a valid email address"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain uppercase, lowercase, number and special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface UserProfile {
  userId: number;
  fullName: string;
  place: string;
  countryId: number;
  phone: string;
  email: string;
  roleId: number;
  roleName: string;
}

interface Country {
  countryId: number;
  countryCode: string;
  country: string;
}

/**
 * ProfileManagement component for viewing and editing user profile
 */
export default function ProfileManagement() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user ID from token
  const token = getAuthToken();
  const decodedToken = token ? decodeToken(token) : null;
  const userId = decodedToken?.userId;

  // Fetch user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => profileApi.getUserProfile(userId!),
    enabled: !!userId,
  });

  // Fetch countries for dropdown
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: authApi.getCountries,
  });

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: userProfile?.fullName || "",
      place: userProfile?.place || "",
      countryId: userProfile?.countryId || 0,
      phone: userProfile?.phone || "",
      email: userProfile?.email || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (profileData: ProfileFormData) => 
      profileApi.updateProfile(userId!, {
        ...profileData,
        roleId: userProfile?.roleId.toString(),
      }),
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: { currentPassword: string; newPassword: string }) => 
      profileApi.changePassword(passwordData),
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update form defaults when user profile loads
  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        fullName: userProfile.fullName,
        place: userProfile.place,
        countryId: userProfile.countryId,
        phone: userProfile.phone,
        email: userProfile.email,
      });
    }
  }, [userProfile, profileForm]);

  /**
   * Handle profile update
   */
  const onUpdateProfile = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  /**
   * Handle password change
   */
  const onChangePassword = (data: PasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Failed to load profile information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Profile Settings
          </h1>
          <p className="text-slate-600">
            Manage your account information and security settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="security">Security Settings</TabsTrigger>
        </TabsList>

        {/* Profile Information Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCircle className="h-5 w-5" />
                <span>Profile Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {userProfile.fullName}
                  </h3>
                  <p className="text-slate-600">{userProfile.email}</p>
                  <Badge variant="secondary" className="mt-1">
                    <Shield className="h-3 w-3 mr-1" />
                    {userProfile.roleName}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">{userProfile.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">{userProfile.place}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">{userProfile.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit2 className="h-5 w-5" />
                <span>Edit Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={profileForm.handleSubmit(onUpdateProfile)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      {...profileForm.register("fullName")}
                      placeholder="Enter full name"
                    />
                    {profileForm.formState.errors.fullName && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="place">Place</Label>
                    <Input
                      id="place"
                      {...profileForm.register("place")}
                      placeholder="Enter place"
                    />
                    {profileForm.formState.errors.place && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.place.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      {...profileForm.register("phone")}
                      placeholder="Enter phone number"
                    />
                    {profileForm.formState.errors.phone && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...profileForm.register("email")}
                      placeholder="Enter email address"
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={profileForm.watch("countryId")?.toString() || ""}
                      onValueChange={(value) =>
                        profileForm.setValue("countryId", parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country: Country) => (
                          <SelectItem
                            key={country.countryId}
                            value={country.countryId.toString()}
                          >
                            {country.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {profileForm.formState.errors.countryId && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.countryId.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {updateProfileMutation.isPending
                        ? "Updating..."
                        : "Update Profile"}
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Change Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={passwordForm.handleSubmit(onChangePassword)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      {...passwordForm.register("currentPassword")}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-red-600">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      {...passwordForm.register("newPassword")}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-red-600">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      {...passwordForm.register("confirmPassword")}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Password Requirements:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Contains uppercase and lowercase letters</li>
                    <li>• Contains at least one number</li>
                    <li>• Contains at least one special character (@$!%*?&)</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <Lock className="h-4 w-4" />
                    <span>
                      {changePasswordMutation.isPending
                        ? "Changing..."
                        : "Change Password"}
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
