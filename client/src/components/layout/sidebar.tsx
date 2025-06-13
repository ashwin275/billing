// Sidebar navigation component for the dashboard
import { useState } from "react";
import { 
  BarChart3, 
  Box, 
  UserPlus, 
  FileText, 
  Store, 
  TrendingUp, 
  UserCircle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  category?: string;
}

// Navigation items configuration
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
    badge: "24",
    category: "Products"
  },
  {
    id: "add-users",
    label: "Add Users",
    icon: UserPlus,
    category: "User Management"
  },
  {
    id: "invoice",
    label: "Invoice",
    icon: FileText,
    badge: "12",
    category: "Billing"
  },
  {
    id: "shops",
    label: "Shops",
    icon: Store,
    badge: "3",
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
 * Sidebar component for dashboard navigation
 * Organizes navigation items by category and handles active state
 */
export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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
        onClick={() => onSectionChange(item.id)}
        className={cn(
          "flex items-center justify-between w-full p-2 rounded-lg text-left transition-colors duration-200",
          isActive
            ? "bg-primary-50 text-primary-700"
            : "text-slate-700 hover:bg-slate-50"
        )}
      >
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5" />
          <span className="font-medium">{item.label}</span>
        </div>
        
        {item.badge && (
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
    const isCollapsed = collapsedCategories.has(category);

    return (
      <div key={category} className="space-y-2">
        {/* Category Header */}
        <button
          onClick={() => toggleCategory(category)}
          className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
        >
          <span>{category}</span>
          <ChevronRight 
            className={cn(
              "h-3 w-3 transition-transform",
              !isCollapsed && "rotate-90"
            )}
          />
        </button>

        {/* Category Items */}
        {!isCollapsed && (
          <div className="space-y-1">
            {items.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-full lg:w-64 bg-white shadow-sm border-r border-slate-200 lg:min-h-screen">
      <nav className="p-4 space-y-6">
        {Object.entries(groupedNavItems).map(([category, items]) =>
          renderCategory(category, items)
        )}
      </nav>
    </aside>
  );
}
