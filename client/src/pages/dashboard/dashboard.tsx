// Main dashboard page with overview, navigation, and content panels
import { useState } from "react";
import { 
  TrendingUp, 
  FileText, 
  Store, 
  Clock, 
  Plus,
  Download,
  BarChart3,
  Box,
  UserPlus,
  Save,
  Menu
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import DashboardLayout from "@/components/layout/dashboard-layout";
import Sidebar from "@/components/layout/sidebar";
import UsersManagement from "@/components/dashboard/users-management";
import ProductsManagement from "@/components/dashboard/products-management";
import ShopsManagement from "@/components/dashboard/shops-management";

// Mock data for dashboard stats - in real app this would come from API
const dashboardStats = {
  totalRevenue: "₹1,24,560",
  totalInvoices: 347,
  activeShops: 12,
  pendingPayments: "₹23,450"
};

// Mock data for recent invoices - in real app this would come from API
const recentInvoices = [
  { id: "1", number: "INV-001", client: "ABC Company", amount: "₹12,500", status: "paid" as const },
  { id: "2", number: "INV-002", client: "XYZ Corp", amount: "₹8,750", status: "pending" as const },
  { id: "3", number: "INV-003", client: "Tech Solutions", amount: "₹15,200", status: "paid" as const }
];

/**
 * Dashboard overview component showing stats and recent activity
 */
function DashboardOverview({ onNavigate }: { onNavigate: (section: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-600 mt-1">Welcome back! Here's what's happening with your billing.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select defaultValue="30">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">This year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{dashboardStats.totalRevenue}</p>
                <p className="text-sm text-emerald-600 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <span className="text-emerald-600 text-lg font-bold">₹</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Invoices Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Invoices</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{dashboardStats.totalInvoices}</p>
                <p className="text-sm text-blue-600 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +8.2% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Shops Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Shops</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{dashboardStats.activeShops}</p>
                <p className="text-sm text-violet-600 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +2 new this month
                </p>
              </div>
              <div className="h-12 w-12 bg-violet-100 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Payments</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{dashboardStats.pendingPayments}</p>
                <p className="text-sm text-orange-600 mt-1">
                  <Clock className="inline h-3 w-3 mr-1" />
                  5 invoices overdue
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Revenue Overview</CardTitle>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-slate-600">Revenue</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                  <span className="text-slate-600">Target</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">Chart component will be integrated here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm">View all</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{invoice.number}</p>
                    <p className="text-xs text-slate-500">{invoice.client}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900 text-sm">{invoice.amount}</p>
                  <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Plus className="h-5 w-5 text-primary-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900">Create Invoice</p>
                  <p className="text-sm text-slate-500">Generate new invoice</p>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => onNavigate("products")}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Box className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900">Add Product</p>
                  <p className="text-sm text-slate-500">Manage inventory</p>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => onNavigate("add-users")}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-violet-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900">Add User</p>
                  <p className="text-sm text-slate-500">Invite team member</p>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => onNavigate("shops")}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Store className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900">Manage Shops</p>
                  <p className="text-sm text-slate-500">Shop operations</p>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => onNavigate("report")}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900">View Reports</p>
                  <p className="text-sm text-slate-500">Analyze performance</p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Generic content panel component for different sections
 */
function ContentPanel({ 
  title, 
  description, 
  buttonText, 
  buttonIcon: ButtonIcon 
}: {
  title: string;
  description: string;
  buttonText: string;
  buttonIcon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <Button>
          <ButtonIcon className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-slate-600">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main Dashboard component with navigation and content switching
 */
function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  /**
   * Render content based on active section
   */
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardOverview />;
      
      case "products":
        return <ProductsManagement />;
      
      case "add-users":
        return <UsersManagement />;
      
      case "invoice":
        return (
          <ContentPanel
            title="Invoice Management"
            description="Invoice management interface will be implemented here."
            buttonText="Create Invoice"
            buttonIcon={FileText}
          />
        );
      
      case "shops":
        return <ShopsManagement />;
      
      case "report":
        return (
          <ContentPanel
            title="Reports & Analytics"
            description="Reports and analytics interface will be implemented here."
            buttonText="Export Report"
            buttonIcon={Download}
          />
        );
      
      case "profile":
        return (
          <ContentPanel
            title="Profile Settings"
            description="Profile settings interface will be implemented here."
            buttonText="Save Changes"
            buttonIcon={Save}
          />
        );
      
      default:
        return <DashboardOverview onNavigate={setActiveSection} />;
    }
  };

  return (
    <DashboardLayout>
      {/* Mobile Menu Button - Always visible on mobile */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-full justify-start"
        >
          <Menu className="h-4 w-4 mr-2" />
          Menu
        </Button>
      </div>

      <div className="flex w-full">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />
        <main className="flex-1 p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
