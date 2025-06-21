import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Package, Users, ShoppingCart, Download, ArrowLeft, Clock, AlertTriangle, Activity, BarChart3 } from "lucide-react";
import { reportsApi, shopsApi } from "@/lib/api";
import { format } from "date-fns";

export default function Reports() {
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({
    from: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  // Fetch shops
  const { data: shops = [] } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Fetch report data only when shop is selected
  const { data: topProducts = [] } = useQuery({
    queryKey: ["/reports/top-products", selectedShop],
    queryFn: () => reportsApi.getTopProducts(selectedShop!),
    enabled: !!selectedShop,
  });

  const { data: salesSummary = [] } = useQuery({
    queryKey: ["/reports/sales-summary", selectedShop, dateRange],
    queryFn: () => reportsApi.getSalesSummary(selectedShop!, dateRange.from, dateRange.to),
    enabled: !!selectedShop,
  });

  const { data: discountSummary = [] } = useQuery({
    queryKey: ["/reports/discount-summary", selectedShop, dateRange],
    queryFn: () => reportsApi.getDiscountSummary(selectedShop!, dateRange.from, dateRange.to),
    enabled: !!selectedShop,
  });

  const { data: inventoryMovement = [] } = useQuery({
    queryKey: ["/reports/inventory-movement", selectedShop, dateRange],
    queryFn: () => reportsApi.getInventoryMovement(selectedShop!, dateRange.from, dateRange.to),
    enabled: !!selectedShop,
  });

  const { data: timeInsights } = useQuery({
    queryKey: ["/reports/time-insights", selectedShop, dateRange],
    queryFn: () => reportsApi.getTimeInsights(selectedShop!, dateRange.from, dateRange.to),
    enabled: !!selectedShop,
  });

  const { data: deadstock = [] } = useQuery({
    queryKey: ["/reports/deadstock", selectedShop, dateRange],
    queryFn: () => reportsApi.getDeadstock(selectedShop!, dateRange.from, dateRange.to),
    enabled: !!selectedShop,
  });

  const { data: topCustomers = [] } = useQuery({
    queryKey: ["/reports/top-customers", selectedShop],
    queryFn: () => reportsApi.getTopCustomers(selectedShop!),
    enabled: !!selectedShop,
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  if (!selectedShop) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-2">Select a shop to view comprehensive reports and business insights</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop: any) => (
              <Card key={shop.shopId} className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-blue-200" onClick={() => setSelectedShop(shop.shopId)}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{shop.name}</span>
                    <Badge variant={shop.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                      {shop.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-gray-600 text-sm">{shop.place}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      <span>View Analytics</span>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Activity className="h-4 w-4 mr-2" />
                      Generate Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedShopData = shops.find((shop: any) => shop.shopId === selectedShop);
  const totalSales = salesSummary.reduce((sum: number, item: any) => sum + item.totalSales, 0);
  const totalDiscount = discountSummary.reduce((sum: number, item: any) => sum + item.discount, 0);
  const totalMovement = inventoryMovement.reduce((sum: number, item: any) => sum + item.quantityMoved, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <Button variant="outline" onClick={() => setSelectedShop(null)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shops
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedShopData?.name} Analytics
            </h1>
            <p className="text-gray-600 mt-2">{selectedShopData?.place}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-4 lg:mt-0">
            <div className="flex items-center space-x-2">
              <Label htmlFor="from" className="text-sm">From:</Label>
              <Input
                id="from"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-auto text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="to" className="text-sm">To:</Label>
              <Input
                id="to"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-auto text-sm"
              />
            </div>
            <Button variant="outline" className="text-sm">
              <Download className="h-4 w-4 mr-2" />
              Export Reports
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Sales</p>
                  <p className="text-2xl font-bold">₹{totalSales.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Products Sold</p>
                  <p className="text-2xl font-bold">{totalMovement}</p>
                </div>
                <Package className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Discounts</p>
                  <p className="text-2xl font-bold">₹{totalDiscount.toFixed(2)}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Peak Hour</p>
                  <p className="text-2xl font-bold">{timeInsights?.peakHour || 0}:00</p>
                </div>
                <Clock className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Sales Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} />
                  <Area type="monotone" dataKey="totalSales" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-green-600" />
                Top Products by Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="productName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalQuantity" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Inventory Movement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Inventory Movement
              </CardTitle>
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
                    fill="#8884d8"
                    dataKey="quantityMoved"
                  >
                    {inventoryMovement.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Time Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-600" />
                Business Time Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {timeInsights?.peakHour || 0}:00
                  </div>
                  <p className="text-gray-600">Peak Business Hour</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-600">
                      {timeInsights?.bestDay || 'N/A'}
                    </div>
                    <p className="text-sm text-gray-600">Best Day</p>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-lg font-semibold text-red-600">
                      {timeInsights?.worstDay || 'N/A'}
                    </div>
                    <p className="text-sm text-gray-600">Slow Day</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Discount Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-purple-600" />
                Discount Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Discount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountSummary.length > 0 ? discountSummary.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">₹{item.discount.toFixed(2)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500">
                        No discounts in selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Top Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomers.length > 0 ? topCustomers.slice(0, 6).map((customer: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </div>
                      <span className="font-medium">{customer.name}</span>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      ₹{customer.totalSpent || '0.00'}
                    </Badge>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-4">
                    No customer data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deadstock Alert */}
        {deadstock.length > 0 && (
          <Card className="mb-8 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Deadstock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-800 font-medium mb-2">
                  {deadstock.length} items identified as deadstock
                </p>
                <p className="text-sm text-red-600">
                  These products haven't moved in the selected period. Consider promotional strategies.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}