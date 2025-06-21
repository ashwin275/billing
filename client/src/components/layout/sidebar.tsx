// Sidebar navigation component for the dashboard
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Box, 
  UserPlus, 
  FileText, 
  Store, 
  TrendingUp, 
  UserCircle,
  ChevronRight,
  Menu,
  X,
  Shield,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usersApi, productsApi } from "@/lib/api";
import { getAuthToken, decodeToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  category?: string;
}



/**
 * Sidebar component for dashboard navigation
 * Organizes navigation items by category and handles active state with collapsible functionality
 */
export default function Sidebar({ activeSection, onSectionChange, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check if user is admin
  const isAdmin = () => {
    const token = getAuthToken();
    if (!token) return false;
    
    try {
      const decoded = decodeToken(token);
      return decoded.roleName === "ROLE_ADMIN";
    } catch (error) {
      return false;
    }
  };

  // Fetch users count
  const { data: users } = useQuery({
    queryKey: ["/api/users/all"],
    queryFn: () => usersApi.getAllUsers(),
  });

  // Fetch products count  
  const { data: products } = useQuery({
    queryKey: ["/api/products/all"],
    queryFn: () => productsApi.getAllProducts(),
  });

  // Calculate real counts
  const activeUsersCount = Array.isArray(users) ? users.filter(user => user.status === 'ACTIVE').length : 0;
  const productsCount = Array.isArray(products) ? products.length : 0;

  // Navigation items configuration with real data
  const navigationItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      category: "Overview"
    },

    {
      id: "products",
      label: "Products",
      icon: Box,
      badge: productsCount > 0 ? productsCount : undefined,
      category: "Products"
    },

    {
      id: "invoice",
      label: "Invoice",
      icon: FileText,
      category: "Billing"
    },
    {
      id: "shops",
      label: "Shops",
      icon: Store,
      category: "Billing"
    },
    {
      id: "customers",
      label: "Customers",
      icon: UserCircle,
      category: "Billing"
    },
    {
      id: "report",
      label: "Reports",
      icon: TrendingUp,
      category: "Analytics"
    },
    {
      id: "profile",
      label: "Profile",
      icon: UserCircle,
      category: "Account"
    }
  ];

  // Group navigation items by category
  const groupedNavItems = navigationItems.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  /**
   * Toggle category collapse state
   */
  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  /**
   * Render navigation item
   */
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;

    return (
      <button
        key={item.id}
        onClick={() => {
          onSectionChange(item.id);
          // Close mobile sidebar when item is selected
          setIsMobileOpen(false);
        }}
        className={cn(
          "flex items-center justify-between w-full p-2 rounded-lg text-left transition-colors duration-200",
          isActive
            ? "bg-primary-50 text-primary-700"
            : "text-slate-700 hover:bg-slate-50",
          isCollapsed && "justify-center"
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">{item.label}</span>}
        </div>
        
        {item.badge && !isCollapsed && (
          <span className={cn(
            "text-xs px-2 py-1 rounded-full font-medium",
            isActive
              ? "bg-primary-100 text-primary-600"
              : "bg-slate-100 text-slate-600"
          )}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  /**
   * Render category section
   */
  const renderCategory = (category: string, items: NavItem[]) => {
    const isCategoryCollapsed = collapsedCategories.has(category);

    return (
      <div key={category} className="space-y-2">
        {/* Category Header - Hidden when sidebar is collapsed */}
        {!isCollapsed && (
          <button
            onClick={() => toggleCategory(category)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>{category}</span>
            <ChevronRight 
              className={cn(
                "h-3 w-3 transition-transform",
                !isCategoryCollapsed && "rotate-90"
              )}
            />
          </button>
        )}

        {/* Category Items */}
        {(!isCategoryCollapsed || isCollapsed) && (
          <div className="space-y-1">
            {items.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-white shadow-sm border-r border-slate-200 transition-all duration-300 flex-shrink-0",
        // Desktop behavior
        "lg:flex lg:flex-col lg:min-h-screen",
        isCollapsed ? "lg:w-16" : "lg:w-64",
        // Mobile behavior - show when mobile menu is open, hide when closed
        isMobileOpen 
          ? "flex flex-col fixed inset-y-0 left-0 z-50 w-64" 
          : "hidden lg:flex"
      )}>
        {/* Desktop Toggle Button */}
        <div className="hidden lg:flex justify-end p-2 border-b border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Navigation</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "p-4 space-y-6 flex-1 overflow-y-auto",
          isCollapsed && "px-2"
        )}>
          {Object.entries(groupedNavItems).map(([category, items]) =>
            renderCategory(category, items as NavItem[])
          )}
        </nav>

        {/* Collapsed Sidebar Footer */}
        {isCollapsed && (
          <div className="hidden lg:block p-2 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="w-full h-8 p-0"
              title="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
