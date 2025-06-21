// Main dashboard page with overview, navigation, and content panels
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Link } from "wouter";
import { shopsApi, usersApi, invoicesApi, customersApi, productsApi } from "@/lib/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import DashboardLayout from "@/components/layout/dashboard-layout";
import Sidebar from "@/components/layout/sidebar";
import UsersManagement from "@/components/dashboard/users-management";
import ProductsManagement from "@/components/dashboard/products-management";
import ShopsManagement from "@/components/dashboard/shops-management";
import CustomersManagement from "@/components/dashboard/customers-management";
import InvoiceManagement from "@/components/dashboard/invoice-management-clean";
import ProfileManagement from "@/components/dashboard/profile-management";



/**
 * Dashboard overview component showing stats and recent activity
 */
function DashboardOverview({ onNavigate }: { onNavigate: (section: string) => void }) {
  // Fetch real data for dashboard
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices/all"],
    queryFn: () => invoicesApi.getAllInvoices(),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Calculate real stats from API data with safety checks
  const totalRevenue = Array.isArray(invoices) ? invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0) : 0;
  const pendingPayments = Array.isArray(invoices) ? invoices
    .filter(invoice => invoice.paymentStatus !== 'PAID')
    .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0) : 0;
  const totalShops = Array.isArray(shops) ? shops.length : 0;
  const activeShops = totalShops; // Show total shops as active shops

  // Recent invoices from real data with safety checks
  const recentInvoices = Array.isArray(invoices) ? invoices
    .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
    .slice(0, 3)
    .map(invoice => ({
      id: invoice.invoiceId.toString(),
      number: invoice.invoiceNo,
      client: invoice.shop?.name || 'Unknown',
      amount: `₹${invoice.totalAmount?.toFixed(2) || '0.00'}`,
      status: invoice.paymentStatus.toLowerCase() as 'paid' | 'pending'
    })) : [];

  const dashboardStats = {
    totalRevenue: `₹${totalRevenue.toFixed(2)}`,
    totalInvoices: invoices.length,
    activeShops: activeShops,
    pendingPayments: `₹${pendingPayments.toFixed(2)}`
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Dashboard Overview</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Welcome back! Here's what's happening with your billing.</p>
        </div>
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 xs:gap-3 w-full sm:w-auto">
          <Select defaultValue="30">
            <SelectTrigger className="w-full xs:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">This year</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/create-invoice">
            <Button className="w-full xs:w-auto">
              <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">New Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Revenue Card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">{dashboardStats.totalRevenue}</p>
                <p className="text-xs sm:text-sm text-emerald-600 mt-1 truncate">
                  <TrendingUp className="inline h-3 w-3 mr-1 flex-shrink-0" />
                  +12.5% from last month
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <span className="text-emerald-600 text-base sm:text-lg font-bold">₹</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Invoices Card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Total Invoices</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{dashboardStats.totalInvoices}</p>
                <p className="text-xs sm:text-sm text-blue-600 mt-1 truncate">
                  <TrendingUp className="inline h-3 w-3 mr-1 flex-shrink-0" />
                  +8.2% from last month
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Shops Card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Active Shops</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{activeShops}</p>
                <p className="text-xs sm:text-sm text-violet-600 mt-1 truncate">
                  <TrendingUp className="inline h-3 w-3 mr-1 flex-shrink-0" />
                  All shops active
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Store className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments Card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Pending Payments</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">{dashboardStats.pendingPayments}</p>
                <p className="text-xs sm:text-sm text-orange-600 mt-1 truncate">
                  <Clock className="inline h-3 w-3 mr-1 flex-shrink-0" />
                  5 invoices overdue
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Revenue Chart Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="text-base sm:text-lg">Revenue Overview</CardTitle>
              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-slate-600 truncate">Revenue</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-slate-300 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-600 truncate">Target</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-48 sm:h-64 bg-slate-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-slate-500">Chart component will be integrated here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-3">
              <CardTitle className="text-base sm:text-lg">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" className="w-full xs:w-auto">View all</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 text-xs sm:text-sm truncate">{invoice.number}</p>
                    <p className="text-xs text-slate-500 truncate">{invoice.client}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-medium text-slate-900 text-xs sm:text-sm">{invoice.amount}</p>
                  <Badge variant={invoice.status === "paid" ? "default" : "secondary"} className="text-xs">
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link href="/invoices/create">
              <Button variant="outline" className="h-auto p-3 sm:p-4 justify-start w-full">
                <div className="flex items-center space-x-2 sm:space-x-3 w-full">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="font-medium text-slate-900 text-sm sm:text-base truncate">Create Invoice</p>
                    <p className="text-xs sm:text-sm text-slate-500 truncate">Generate new invoice</p>
                  </div>
                </div>
              </Button>
            </Link>

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
  const [activeSection, setActiveSection] = useState(() => {
    // Check if profile section is requested via hash
    if (window.location.hash === '#profile') {
      return 'profile';
    }
    return 'dashboard';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Listen for hash changes to update active section
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#profile') {
        setActiveSection('profile');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  /**
   * Render content based on active section
   */
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardOverview onNavigate={setActiveSection} />;
      
      case "products":
        return <ProductsManagement />;
      
      case "add-users":
        return <UsersManagement />;
      
      case "invoice":
        return <InvoiceManagement />;
      
      case "shops":
        return <ShopsManagement />;
      
      case "customers":
        return <CustomersManagement />;
      
      case "report":
        return (
          <div className="text-center py-20">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reports & Analytics</h3>
            <p className="text-gray-500 mb-4">Access comprehensive business reports and analytics with charts and insights.</p>
            <Link href="/reports">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <BarChart3 className="h-4 w-4 mr-2" />
                Open Reports Dashboard
              </Button>
            </Link>
          </div>
        );
      
      case "profile":
        return <ProfileManagement />;
      
      default:
        return <DashboardOverview onNavigate={setActiveSection} />;
    }
  };

  return (
    <DashboardLayout>
      {/* Mobile Menu Button - Always visible on mobile */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-3 sm:p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-full justify-start text-left"
        >
          <Menu className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">Menu</span>
        </Button>
      </div>

      <div className="flex w-full min-h-0">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          <div className="max-w-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
