import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, Package, Users, Clock, AlertTriangle, Percent, ArrowUpDown, Store, Download, FileSpreadsheet, UserCheck, CreditCard, ShoppingBag, DollarSign } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<'business' | 'customers'>('business');

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

  const selectedShop = Array.isArray(shops) ? shops.find(shop => shop.shopId === selectedShopId) : null;

  const totalSales = Array.isArray(salesSummary) ? salesSummary.reduce((sum: number, item: any) => sum + item.totalSales, 0) : 0;
  const totalDiscounts = Array.isArray(discountSummary) ? discountSummary.reduce((sum: number, item: any) => sum + item.discount, 0) : 0;
  const totalInventoryMoved = Array.isArray(inventoryMovement) ? inventoryMovement.reduce((sum: number, item: any) => sum + item.quantityMoved, 0) : 0;

  // Customer report calculations
  const totalCustomers = Array.isArray(customerReports) ? customerReports.length : 0;
  const activeCustomers = Array.isArray(customerReports) ? customerReports.filter(c => c.totalBills > 0).length : 0;
  const totalCustomerPurchases = Array.isArray(customerReports) ? customerReports.reduce((sum, c) => sum + c.totalPurchases, 0) : 0;
  const totalPendingBalance = Array.isArray(customerReports) ? customerReports.reduce((sum, c) => sum + c.pendingBalance, 0) : 0;

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
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {activeTab === 'business' 
                ? `Analytics and insights for ${selectedShop?.name} - ${selectedShop?.place}`
                : 'Customer analytics and insights'
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
                value={activeTab === 'business' ? dateRange.from : customerReportDateRange.from}
                onChange={(e) => {
                  if (activeTab === 'business') {
                    setDateRange(prev => ({ ...prev, from: e.target.value }));
                  } else {
                    setCustomerReportDateRange(prev => ({ ...prev, from: e.target.value }));
                  }
                }}
                className="w-36"
              />
              <Input
                type="date"
                value={activeTab === 'business' ? dateRange.to : customerReportDateRange.to}
                onChange={(e) => {
                  if (activeTab === 'business') {
                    setDateRange(prev => ({ ...prev, to: e.target.value }));
                  } else {
                    setCustomerReportDateRange(prev => ({ ...prev, to: e.target.value }));
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
        ) : (
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
        )}

        {/* Customer Reports Content */}
        {activeTab === 'customers' ? (
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
                      {Array.isArray(customerReports) && customerReports.length > 0 ? (
                        customerReports.map((customer, index) => (
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
              </CardContent>
            </Card>

            {/* Top Products by Customer */}
            {Array.isArray(customerReports) && customerReports.some(c => Array.isArray(c.topProducts) && c.topProducts.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Top Products by Customer
                  </CardTitle>
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
                        {customerReports
                          .filter(customer => Array.isArray(customer.topProducts) && customer.topProducts.length > 0)
                          .flatMap(customer => 
                            customer.topProducts.map(product => ({
                              ...product,
                              customerName: customer.customerName,
                              customerId: customer.customerId
                            }))
                          )
                          .sort((a, b) => b.finalAmount - a.finalAmount)
                          .slice(0, 20)
                          .map((item, index) => (
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