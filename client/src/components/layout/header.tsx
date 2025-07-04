// Dashboard header component with user menu and notifications
import { useState } from "react";
import { useLocation } from "wouter";
import { Bell, User, Settings, LogOut, ChevronDown, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

import { clearAuthData, getUserData } from "@/lib/auth";

/**
 * Header component for the dashboard layout
 * Contains branding, notifications, and user menu
 */
export default function Header() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notificationCount] = useState(3); // This would come from API in real implementation
  
  const userData = getUserData();

  /**
   * Handle user logout
   */
  const handleLogout = () => {
    clearAuthData();
    
    // Trigger storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'authToken',
      oldValue: 'token',
      newValue: null,
      storageArea: localStorage
    }));
    
    toast({
      title: "Signed out",
      description: "You have been logged out successfully.",
    });
    
    // Force page reload to ensure clean state
    window.location.href = "/signin";
  };

  /**
   * Get user initials for avatar
   */
  const getUserInitials = (fullName: string): string => {
    return fullName
      .split(" ")
      .map(name => name.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Billing Dashboard</h1>
              <p className="text-xs text-slate-500">Professional Invoice Management</p>
            </div>
          </div>

          {/* User Menu Section */}
          <div className="flex items-center space-x-4">
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-slate-700 hover:text-slate-900"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-slate-200 text-slate-600">
                      {userData ? getUserInitials(userData.fullName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block font-medium">
                    {userData?.fullName || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => window.location.href = "/dashboard#profile"}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
