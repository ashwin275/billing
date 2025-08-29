import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, Package, Users, Clock, AlertTriangle, Percent, ArrowUpDown, Store, Download, FileSpreadsheet, UserCheck, CreditCard, ShoppingBag, DollarSign, FileText, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { shopsApi, reportsApi } from "@/lib/api";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const LIGHT_COLORS = ['#4ade80', '#22d3ee', '#3b82f6', '#8b5cf6', '#10b981', '#f97316'];

export default function Reports() {
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [customerReportDateRange, setCustomerReportDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState<'business' | 'customers' | 'hsn'>('business');
  
  // Pagination states for Customer Reports tables
  const [customerDetailsPage, setCustomerDetailsPage] = useState(1);
  const [customerDetailsPerPage, setCustomerDetailsPerPage] = useState(10);
  const [topProductsPage, setTopProductsPage] = useState(1);
  const [topProductsPerPage, setTopProductsPerPage] = useState(15);

  // HSN Reports state and pagination
  const [hsnReportDateRange, setHsnReportDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [hsnReportsPage, setHsnReportsPage] = useState(1);
  const [hsnReportsPerPage, setHsnReportsPerPage] = useState(10);

  // Fetch shops
  const { data: shops = [] } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Set default shop if available
  useEffect(() => {
    if (Array.isArray(shops) && shops.length > 0 && !selectedShopId) {
      setSelectedShopId(shops[0].shopId);
    }
  }, [shops, selectedShopId]);

  // Fetch reports data
  const { data: topProducts = [] } = useQuery({
    queryKey: ["reports", "top-products", selectedShopId],
    queryFn: () => reportsApi.getTopProducts(selectedShopId!),
    enabled: !!selectedShopId,
  });

  const { data: topCustomers = [] } = useQuery({
    queryKey: ["reports", "top-customers", selectedShopId],
    queryFn: () => reportsApi.getTopCustomers(selectedShopId!),
    enabled: !!selectedShopId,
  });

  const { data: salesSummary = [] } = useQuery({
    queryKey: ["reports", "sales-summary", selectedShopId, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getSalesSummary(selectedShopId!, dateRange.from, dateRange.to),
    enabled: !!selectedShopId,
  });

  const { data: discountSummary = [] } = useQuery({
    queryKey: ["reports", "discount-summary", selectedShopId, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getDiscountSummary(selectedShopId!, dateRange.from, dateRange.to),
    enabled: !!selectedShopId,
  });

  const { data: inventoryMovement = [] } = useQuery({
    queryKey: ["reports", "inventory-movement", selectedShopId, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getInventoryMovement(selectedShopId!, dateRange.from, dateRange.to),
    enabled: !!selectedShopId,
  });

  const { data: timeInsights } = useQuery({
    queryKey: ["reports", "time-insights", selectedShopId, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getTimeInsights(selectedShopId!, dateRange.from, dateRange.to),
    enabled: !!selectedShopId,
  });

  const { data: deadstock = [] } = useQuery({
    queryKey: ["reports", "deadstock", selectedShopId, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getDeadstock(selectedShopId!, dateRange.from, dateRange.to),
    enabled: !!selectedShopId,
  });

  // Fetch customer reports data
  const { data: customerReports = [] } = useQuery({
    queryKey: ["reports", "customer-reports", customerReportDateRange.from, customerReportDateRange.to],
    queryFn: () => reportsApi.getAllCustomerReports(customerReportDateRange.from, customerReportDateRange.to),
  });

  // Fetch HSN reports data
  const { data: hsnReports = [] } = useQuery({
    queryKey: ["reports", "hsn-reports", hsnReportDateRange.from, hsnReportDateRange.to],
    queryFn: () => reportsApi.getAllHsnReports(hsnReportDateRange.from, hsnReportDateRange.to),
  });

  const selectedShop = Array.isArray(shops) ? shops.find(shop => shop.shopId === selectedShopId) : null;

  const totalSales = Array.isArray(salesSummary) ? salesSummary.reduce((sum: number, item: any) => sum + item.totalSales, 0) : 0;
  const totalDiscounts = Array.isArray(discountSummary) ? discountSummary.reduce((sum: number, item: any) => sum + item.discount, 0) : 0;
  const totalInventoryMoved = Array.isArray(inventoryMovement) ? inventoryMovement.reduce((sum: number, item: any) => sum + item.quantityMoved, 0) : 0;

  // Customer report calculations
  const totalCustomers = Array.isArray(customerReports) ? customerReports.length : 0;
  const activeCustomers = Array.isArray(customerReports) ? customerReports.filter(c => c.totalBills > 0).length : 0;
  const totalCustomerPurchases = Array.isArray(customerReports) ? customerReports.reduce((sum, c) => sum + c.totalPurchases, 0) : 0;
  const totalPendingBalance = Array.isArray(customerReports) ? customerReports.reduce((sum, c) => sum + c.pendingBalance, 0) : 0;

  // Pagination calculations for Customer Details Report
  const totalCustomerPages = Math.ceil(totalCustomers / customerDetailsPerPage);
  const paginatedCustomerReports = Array.isArray(customerReports) ? 
    customerReports.slice((customerDetailsPage - 1) * customerDetailsPerPage, customerDetailsPage * customerDetailsPerPage) 
    : [];

  // Pagination calculations for Top Products by Customer
  const topProductsData = Array.isArray(customerReports) ? 
    customerReports
      .filter(customer => Array.isArray(customer.topProducts) && customer.topProducts.length > 0)
      .flatMap(customer => 
        customer.topProducts.map(product => ({
          ...product,
          customerName: customer.customerName,
          customerId: customer.customerId
        }))
      )
      .sort((a, b) => b.finalAmount - a.finalAmount)
    : [];
  
  const totalTopProductsPages = Math.ceil(topProductsData.length / topProductsPerPage);
  const paginatedTopProducts = topProductsData.slice((topProductsPage - 1) * topProductsPerPage, topProductsPage * topProductsPerPage);

  // HSN reports calculations
  const totalHsnRecords = Array.isArray(hsnReports) ? hsnReports.length : 0;
  const totalHsnQuantity = Array.isArray(hsnReports) ? hsnReports.reduce((sum, h) => sum + h.totalQuantity, 0) : 0;
  const totalHsnAmount = Array.isArray(hsnReports) ? hsnReports.reduce((sum, h) => sum + h.totalAmount, 0) : 0;
  const totalHsnTax = Array.isArray(hsnReports) ? hsnReports.reduce((sum, h) => sum + h.totalTax, 0) : 0;

  // Pagination calculations for HSN Reports
  const totalHsnPages = Math.ceil(totalHsnRecords / hsnReportsPerPage);
  const paginatedHsnReports = Array.isArray(hsnReports) ? 
    hsnReports.slice((hsnReportsPage - 1) * hsnReportsPerPage, hsnReportsPage * hsnReportsPerPage) 
    : [];

  // Export customer reports to Excel
  const exportCustomerReportsToExcel = () => {
    if (!Array.isArray(customerReports) || customerReports.length === 0) {
      alert('No customer data available to export');
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    // Customer Summary Sheet
    const customerSummaryData = customerReports.map(customer => ({
      'Customer ID': customer.customerId,
      'Customer Name': customer.customerName,
      'Phone': customer.phone,
      'Place': customer.place,
      'Customer Type': customer.customerType,
      'Total Purchases': customer.totalPurchases,
      'Total Bills': customer.totalBills,
      'Average Bill Value': customer.averageBillValue,
      'Biggest Bill': customer.biggestBill,
      'Total Discount': customer.totalDiscount,
      'Total Paid': customer.totalPaid,
      'Pending Balance': customer.pendingBalance,
      'Advance Paid': customer.advancePaid,
      'Overdue Invoices': customer.overdueInvoices || 0
    }));

    const customerSummarySheet = XLSX.utils.json_to_sheet(customerSummaryData);
    XLSX.utils.book_append_sheet(workbook, customerSummarySheet, 'Customer Summary');

    // Top Products by Customer Sheet
    const topProductsData: any[] = [];
    customerReports.forEach(customer => {
      if (Array.isArray(customer.topProducts)) {
        customer.topProducts.forEach(product => {
          topProductsData.push({
            'Customer ID': customer.customerId,
            'Customer Name': customer.customerName,
            'Product Name': product.productName,
            'Quantity': product.quantity,
            'Sub Total': product.subTotal,
            'Tax': product.tax,
            'Discount': product.discount,
            'Final Amount': product.finalAmount,
            'Invoice Date': product.invoiceDate
          });
        });
      }
    });

    if (topProductsData.length > 0) {
      const topProductsSheet = XLSX.utils.json_to_sheet(topProductsData);
      XLSX.utils.book_append_sheet(workbook, topProductsSheet, 'Top Products by Customer');
    }

    // Save the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const fileName = `Customer_Reports_${customerReportDateRange.from}_to_${customerReportDateRange.to}.xlsx`;
    saveAs(data, fileName);
  };

  // Export only Top Products by Customer to Excel
  const exportTopProductsByCustomerToExcel = () => {
    if (topProductsData.length === 0) {
      alert('No top products data available to export');
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    // Top Products by Customer Sheet
    const exportData = topProductsData.map(product => ({
      'Customer ID': product.customerId,
      'Customer Name': product.customerName,
      'Product Name': product.productName,
      'Quantity': product.quantity,
      'Sub Total': product.subTotal,
      'Tax': product.tax,
      'Discount': product.discount,
      'Final Amount': product.finalAmount,
      'Invoice Date': new Date(product.invoiceDate).toLocaleDateString()
    }));

    const topProductsSheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, topProductsSheet, 'Top Products by Customer');

    // Save the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const fileName = `Top_Products_by_Customer_${customerReportDateRange.from}_to_${customerReportDateRange.to}.xlsx`;
    saveAs(data, fileName);
  };

  // Export HSN reports to Excel
  const exportHsnReportsToExcel = () => {
    if (!Array.isArray(hsnReports) || hsnReports.length === 0) {
      alert('No HSN data available to export');
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    // HSN Summary Sheet
    const hsnSummaryData = hsnReports.map(hsn => ({
      'HSN Code': hsn.hsn,
      'Product Name': hsn.productName,
      'Total Quantity': hsn.totalQuantity,
      'Total Amount': hsn.totalAmount,
      'Total Tax': hsn.totalTax,
      'Final Amount': hsn.finalAmount
    }));

    const hsnSummarySheet = XLSX.utils.json_to_sheet(hsnSummaryData);
    XLSX.utils.book_append_sheet(workbook, hsnSummarySheet, 'HSN Summary');

    // Save the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const fileName = `HSN_Reports_${hsnReportDateRange.from}_to_${hsnReportDateRange.to}.xlsx`;
    saveAs(data, fileName);
  };

  if (!Array.isArray(shops) || shops.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card className="max-w-md mx-auto mt-20">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Store className="h-6 w-6" />
                No Shops Available
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                You need to add shops before viewing reports.
              </p>
              <Link href="/dashboard">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!selectedShopId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card className="max-w-md mx-auto mt-20">
            <CardHeader>
              <CardTitle className="text-center">Select a Shop</CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={(value) => setSelectedShopId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shop to view reports" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                      {shop.name} - {shop.place}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Tab Selector - Moved to top */}
        <div className="flex justify-center mb-4">
          <div className="flex rounded-lg bg-gray-100 p-2 gap-2 shadow-md">
            <Button
              variant={activeTab === 'business' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('business')}
              className="rounded-md px-6 py-2 min-w-[140px] shadow-sm"
            >
              <Store className="h-4 w-4 mr-2" />
              Business Reports
            </Button>
            <Button
              variant={activeTab === 'customers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('customers')}
              className="rounded-md px-6 py-2 min-w-[140px] shadow-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Customer Reports
            </Button>
            <Button
              variant={activeTab === 'hsn' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('hsn')}
              className="rounded-md px-6 py-2 min-w-[140px] shadow-sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              HSN Reports
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {activeTab === 'business' 
                ? `Analytics and insights for ${selectedShop?.name} - ${selectedShop?.place}`
                : activeTab === 'customers'
                ? 'Customer analytics and insights'
                : 'HSN code analytics and insights'
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Shop Selector - Only for Business Reports */}
            {activeTab === 'business' && (
              <Select value={selectedShopId?.toString()} onValueChange={(value) => setSelectedShopId(parseInt(value))}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(shops) && shops.map((shop) => (
                    <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Date Range Selectors */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={activeTab === 'business' ? dateRange.from : activeTab === 'customers' ? customerReportDateRange.from : hsnReportDateRange.from}
                onChange={(e) => {
                  if (activeTab === 'business') {
                    setDateRange(prev => ({ ...prev, from: e.target.value }));
                  } else if (activeTab === 'customers') {
                    setCustomerReportDateRange(prev => ({ ...prev, from: e.target.value }));
                  } else {
                    setHsnReportDateRange(prev => ({ ...prev, from: e.target.value }));
                  }
                }}
                className="w-36"
              />
              <Input
                type="date"
                value={activeTab === 'business' ? dateRange.to : activeTab === 'customers' ? customerReportDateRange.to : hsnReportDateRange.to}
                onChange={(e) => {
                  if (activeTab === 'business') {
                    setDateRange(prev => ({ ...prev, to: e.target.value }));
                  } else if (activeTab === 'customers') {
                    setCustomerReportDateRange(prev => ({ ...prev, to: e.target.value }));
                  } else {
                    setHsnReportDateRange(prev => ({ ...prev, to: e.target.value }));
                  }
                }}
                className="w-36"
              />
            </div>

            {/* Export Button for Customer Reports */}
            {activeTab === 'customers' && (
              <Button 
                onClick={exportCustomerReportsToExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            )}
            
            {/* Export Button for HSN Reports */}
            {activeTab === 'hsn' && (
              <Button 
                onClick={exportHsnReportsToExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        {activeTab === 'business' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sales</p>
                    <p className="text-3xl font-bold text-teal-500">₹{totalSales.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-teal-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Discounts</p>
                    <p className="text-3xl font-bold text-cyan-500">₹{totalDiscounts.toFixed(2)}</p>
                  </div>
                  <Percent className="h-8 w-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Inventory Moved</p>
                    <p className="text-3xl font-bold text-sky-500">{totalInventoryMoved} units</p>
                  </div>
                  <Package className="h-8 w-8 text-sky-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Deadstock Items</p>
                    <p className="text-3xl font-bold text-red-400">{Array.isArray(deadstock) ? deadstock.length : 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-300" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : activeTab === 'customers' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-3xl font-bold text-blue-500">{totalCustomers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Customers</p>
                    <p className="text-3xl font-bold text-green-500">{activeCustomers}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Customer Sales</p>
                    <p className="text-3xl font-bold text-emerald-500">₹{totalCustomerPurchases.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Balance</p>
                    <p className="text-3xl font-bold text-orange-500">₹{totalPendingBalance.toFixed(2)}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total HSN Records</p>
                    <p className="text-3xl font-bold text-purple-500">{totalHsnRecords}</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                    <p className="text-3xl font-bold text-indigo-500">{totalHsnQuantity.toFixed(2)}</p>
                  </div>
                  <Package className="h-8 w-8 text-indigo-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-3xl font-bold text-pink-500">₹{totalHsnAmount.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-pink-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tax</p>
                    <p className="text-3xl font-bold text-rose-500">₹{totalHsnTax.toFixed(2)}</p>
                  </div>
                  <Percent className="h-8 w-8 text-rose-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HSN Reports Content */}
        {activeTab === 'hsn' ? (
          <>
            {/* HSN Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* HSN Distribution by Amount */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top HSN by Total Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={Array.isArray(hsnReports) ? 
                        hsnReports
                          .sort((a, b) => b.totalAmount - a.totalAmount)
                          .slice(0, 10)
                        : []
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="hsn" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Total Amount']} />
                      <Bar dataKey="totalAmount">
                        {Array.isArray(hsnReports) && hsnReports.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* HSN Tax Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    HSN Tax Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Array.isArray(hsnReports) ? 
                          hsnReports
                            .sort((a, b) => b.totalTax - a.totalTax)
                            .slice(0, 8)
                            .map(hsn => ({ name: hsn.hsn, value: hsn.totalTax, productName: hsn.productName }))
                          : []
                        }
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Array.isArray(hsnReports) && hsnReports.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Tax Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Quantity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Top HSN by Quantity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={Array.isArray(hsnReports) ? 
                        hsnReports
                          .sort((a, b) => b.totalQuantity - a.totalQuantity)
                          .slice(0, 10)
                        : []
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="hsn" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalQuantity" fill="#10b981">
                        {Array.isArray(hsnReports) && hsnReports.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Final Amount Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Final Amount by HSN Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={Array.isArray(hsnReports) ? 
                        hsnReports
                          .sort((a, b) => b.finalAmount - a.finalAmount)
                          .slice(0, 10)
                        : []
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="hsn" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Final Amount']} />
                      <Bar dataKey="finalAmount" fill="#f59e0b">
                        {Array.isArray(hsnReports) && hsnReports.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* HSN Details Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    HSN Code Report
                  </span>
                  <Badge variant="outline">
                    {hsnReportDateRange.from} to {hsnReportDateRange.to}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>HSN Code</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-right">Total Quantity</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Total Tax</TableHead>
                        <TableHead className="text-right">Final Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHsnReports.length > 0 ? (
                        paginatedHsnReports.map((hsn, index) => (
                          <TableRow key={`${hsn.hsn}-${index}`} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <Badge variant="outline">{hsn.hsn}</Badge>
                            </TableCell>
                            <TableCell>{hsn.productName}</TableCell>
                            <TableCell className="text-right">{hsn.totalQuantity.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ₹{hsn.totalAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">₹{hsn.totalTax.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              ₹{hsn.finalAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            No HSN data available for the selected date range
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* HSN Pagination */}
                {totalHsnRecords > 0 && (
                  <div className="flex items-center justify-between px-2 py-4">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-700">
                        Showing {(hsnReportsPage - 1) * hsnReportsPerPage + 1} to{' '}
                        {Math.min(hsnReportsPage * hsnReportsPerPage, totalHsnRecords)} of{' '}
                        {totalHsnRecords} HSN records
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-700">Rows per page:</p>
                        <Select value={hsnReportsPerPage.toString()} onValueChange={(value) => {
                          setHsnReportsPerPage(parseInt(value));
                          setHsnReportsPage(1);
                        }}>
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHsnReportsPage(1)}
                          disabled={hsnReportsPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHsnReportsPage(hsnReportsPage - 1)}
                          disabled={hsnReportsPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center space-x-1">
                          <Input
                            className="w-12 text-center"
                            value={hsnReportsPage}
                            onChange={(e) => {
                              const page = parseInt(e.target.value);
                              if (page >= 1 && page <= totalHsnPages) {
                                setHsnReportsPage(page);
                              }
                            }}
                          />
                          <span className="text-sm text-gray-700">of {totalHsnPages}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHsnReportsPage(hsnReportsPage + 1)}
                          disabled={hsnReportsPage === totalHsnPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHsnReportsPage(totalHsnPages)}
                          disabled={hsnReportsPage === totalHsnPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : activeTab === 'customers' ? (
          <>
            {/* Customer Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Type Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Array.isArray(customerReports) ? 
                          Object.entries(
                            customerReports.reduce((acc: { [key: string]: number }, customer) => {
                              acc[customer.customerType] = (acc[customer.customerType] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([type, count]) => ({ name: type, value: count }))
                          : []
                        }
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Array.isArray(customerReports) && Object.entries(
                          customerReports.reduce((acc: { [key: string]: number }, customer) => {
                            acc[customer.customerType] = (acc[customer.customerType] || 0) + 1;
                            return acc;
                          }, {})
                        ).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Customers by Purchase Value */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by Purchase Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={Array.isArray(customerReports) ? 
                        customerReports
                          .filter(c => c.totalPurchases > 0)
                          .sort((a, b) => b.totalPurchases - a.totalPurchases)
                          .slice(0, 10)
                        : []
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="customerName" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Purchase Value']} />
                      <Bar dataKey="totalPurchases">
                        {Array.isArray(customerReports) && customerReports.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Customer Bills Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Bills Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={Array.isArray(customerReports) ? 
                        customerReports
                          .filter(c => c.totalBills > 0)
                          .sort((a, b) => b.totalBills - a.totalBills)
                          .slice(0, 10)
                        : []
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="customerName" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalBills" fill="#3b82f6">
                        {Array.isArray(customerReports) && customerReports.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Average Bill Value Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Average Bill Value by Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={Array.isArray(customerReports) ? 
                        customerReports
                          .filter(c => c.averageBillValue > 0)
                          .sort((a, b) => b.averageBillValue - a.averageBillValue)
                          .slice(0, 10)
                        : []
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="customerName" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Avg Bill Value']} />
                      <Bar dataKey="averageBillValue" fill="#10b981">
                        {Array.isArray(customerReports) && customerReports.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Customer Details Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Details Report
                  </span>
                  <Badge variant="outline">
                    {customerReportDateRange.from} to {customerReportDateRange.to}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total Purchase</TableHead>
                        <TableHead className="text-right">Bills</TableHead>
                        <TableHead className="text-right">Avg Bill</TableHead>
                        <TableHead className="text-right">Biggest Bill</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomerReports.length > 0 ? (
                        paginatedCustomerReports.map((customer, index) => (
                          <TableRow key={customer.customerId} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold">{customer.customerName}</div>
                                <div className="text-sm text-gray-500">{customer.place}</div>
                              </div>
                            </TableCell>
                            <TableCell>{customer.phone}</TableCell>
                            <TableCell>
                              <Badge variant={customer.customerType === 'CREDIT' ? 'destructive' : 'default'}>
                                {customer.customerType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ₹{customer.totalPurchases.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{customer.totalBills}</TableCell>
                            <TableCell className="text-right">₹{customer.averageBillValue.toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{customer.biggestBill.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <span className={customer.pendingBalance > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                ₹{customer.pendingBalance.toFixed(2)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                            No customer data available for the selected date range
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Customer Details Pagination */}
                {totalCustomers > 0 && (
                  <div className="flex items-center justify-between px-2 py-4">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-700">
                        Showing {(customerDetailsPage - 1) * customerDetailsPerPage + 1} to{' '}
                        {Math.min(customerDetailsPage * customerDetailsPerPage, totalCustomers)} of{' '}
                        {totalCustomers} customers
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-700">Rows per page:</p>
                        <Select value={customerDetailsPerPage.toString()} onValueChange={(value) => {
                          setCustomerDetailsPerPage(parseInt(value));
                          setCustomerDetailsPage(1);
                        }}>
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomerDetailsPage(1)}
                          disabled={customerDetailsPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomerDetailsPage(customerDetailsPage - 1)}
                          disabled={customerDetailsPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center space-x-1">
                          <Input
                            className="w-12 text-center"
                            value={customerDetailsPage}
                            onChange={(e) => {
                              const page = parseInt(e.target.value);
                              if (page >= 1 && page <= totalCustomerPages) {
                                setCustomerDetailsPage(page);
                              }
                            }}
                          />
                          <span className="text-sm text-gray-700">of {totalCustomerPages}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomerDetailsPage(customerDetailsPage + 1)}
                          disabled={customerDetailsPage === totalCustomerPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomerDetailsPage(totalCustomerPages)}
                          disabled={customerDetailsPage === totalCustomerPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products by Customer */}
            {topProductsData.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" />
                      Top Products by Customer
                    </CardTitle>
                    <Button 
                      onClick={exportTopProductsByCustomerToExcel}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                      size="sm"
                      data-testid="button-export-top-products"
                    >
                      <Download className="h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Sub Total</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right">Discount</TableHead>
                          <TableHead className="text-right">Final Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTopProducts.map((item, index) => (
                          <TableRow key={`${item.customerId}-${item.productName}-${index}`} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{item.customerName}</TableCell>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">₹{Number(item.subTotal).toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{Number(item.tax).toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{Number(item.discount).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">₹{Number(item.finalAmount).toFixed(2)}</TableCell>
                            <TableCell>{new Date(item.invoiceDate).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Top Products Pagination */}
                  {topProductsData.length > 0 && (
                    <div className="flex items-center justify-between px-2 py-4">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-700">
                          Showing {(topProductsPage - 1) * topProductsPerPage + 1} to{' '}
                          {Math.min(topProductsPage * topProductsPerPage, topProductsData.length)} of{' '}
                          {topProductsData.length} products
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-700">Rows per page:</p>
                          <Select value={topProductsPerPage.toString()} onValueChange={(value) => {
                            setTopProductsPerPage(parseInt(value));
                            setTopProductsPage(1);
                          }}>
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="15">15</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTopProductsPage(1)}
                            disabled={topProductsPage === 1}
                          >
                            First
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTopProductsPage(topProductsPage - 1)}
                            disabled={topProductsPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center space-x-1">
                            <Input
                              className="w-12 text-center"
                              value={topProductsPage}
                              onChange={(e) => {
                                const page = parseInt(e.target.value);
                                if (page >= 1 && page <= totalTopProductsPages) {
                                  setTopProductsPage(page);
                                }
                              }}
                            />
                            <span className="text-sm text-gray-700">of {totalTopProductsPages}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTopProductsPage(topProductsPage + 1)}
                            disabled={topProductsPage === totalTopProductsPages}
                          >
                            Next
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTopProductsPage(totalTopProductsPages)}
                            disabled={topProductsPage === totalTopProductsPages}
                          >
                            Last
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Business Reports Content (existing content) */}
            {/* Time Insights */}
            {timeInsights && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-teal-400">{timeInsights.peakHour}:00</div>
                  <p className="text-sm text-muted-foreground">Peak Hour</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400">{timeInsights.bestDay}</div>
                  <p className="text-sm text-muted-foreground">Best Day</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-sky-400">{timeInsights.worstDay}</div>
                  <p className="text-sm text-muted-foreground">Worst Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} />
                  <Line type="monotone" dataKey="totalSales" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="productName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalQuantity">
                    {Array.isArray(topProducts) && topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Inventory Movement */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Movement</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inventoryMovement}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ productName, percent }) => `${productName} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#22d3ee"
                    dataKey="quantityMoved"
                  >
                    {Array.isArray(inventoryMovement) && inventoryMovement.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Discount Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Product Discounts</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={discountSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="productName" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Discount']} />
                  <Bar dataKey="discount">
                    {Array.isArray(discountSummary) && discountSummary.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill="#FCA36B" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(topProducts) && topProducts.map((product, index) => (
                    <TableRow key={index} className="hover:bg-teal-50">
                      <TableCell className="font-medium text-gray-700">{product.productName}</TableCell>
                      <TableCell className="text-right font-semibold text-teal-600">{product.totalQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(topCustomers) && topCustomers.length > 0 ? topCustomers.map((customer, index) => (
                    <TableRow key={index} className="hover:bg-sky-50">
                      <TableCell className="font-medium text-gray-700">{customer.name || 'N/A'}</TableCell>
                      <TableCell className="text-right font-semibold text-sky-600">{customer.value || '0'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No customer data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Deadstock Alert */}
        {Array.isArray(deadstock) && deadstock.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Deadstock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.isArray(deadstock) && deadstock.map((item, index) => (
                  <Badge key={index} className="p-2 bg-red-100 text-red-600 hover:bg-red-200">
                    {item.productName || `Item ${index + 1}`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}