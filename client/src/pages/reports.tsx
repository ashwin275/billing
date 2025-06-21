import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, Package, Users, Clock, AlertTriangle, Percent, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { shopsApi, reportsApi } from "@/lib/api";

const LIGHT_COLORS = ['#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b'];

export default function Reports() {
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Fetch shops
  const { data: shops = [] } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Set default shop if available
  useEffect(() => {
    if (shops.length > 0 && !selectedShopId) {
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

  const selectedShop = shops.find(shop => shop.shopId === selectedShopId);

  const totalSales = Array.isArray(salesSummary) ? salesSummary.reduce((sum: number, item: any) => sum + item.totalSales, 0) : 0;
  const totalDiscounts = Array.isArray(discountSummary) ? discountSummary.reduce((sum: number, item: any) => sum + item.discount, 0) : 0;
  const totalInventoryMoved = Array.isArray(inventoryMovement) ? inventoryMovement.reduce((sum: number, item: any) => sum + item.quantityMoved, 0) : 0;

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Reports</h1>
            <p className="text-gray-600 mt-1">
              Analytics and insights for {selectedShop?.name} - {selectedShop?.place}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedShopId?.toString()} onValueChange={(value) => setSelectedShopId(parseInt(value))}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-36"
              />
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-36"
              />
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {salesSummary.length} sales periods
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalDiscounts.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {discountSummary.length} products with discounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Movement</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInventoryMoved}</div>
              <p className="text-xs text-muted-foreground">
                units moved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deadstock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deadstock.length}</div>
              <p className="text-xs text-muted-foreground">
                items need attention
              </p>
            </CardContent>
          </Card>
        </div>

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
                  <div className="text-3xl font-bold text-blue-600">{timeInsights.peakHour}:00</div>
                  <p className="text-sm text-muted-foreground">Peak Hour</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{timeInsights.bestDay}</div>
                  <p className="text-sm text-muted-foreground">Best Day</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{timeInsights.worstDay}</div>
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
                  <Line type="monotone" dataKey="totalSales" stroke="#8884d8" strokeWidth={2} />
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
                  <Bar dataKey="totalQuantity" fill="#8884d8" />
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
                  <Bar dataKey="discount" fill="#ff7300" />
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
                  {topProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{product.productName}</TableCell>
                      <TableCell className="text-right">{product.totalQuantity}</TableCell>
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
                  {topCustomers.length > 0 ? topCustomers.map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{customer.name || 'N/A'}</TableCell>
                      <TableCell className="text-right">{customer.value || '0'}</TableCell>
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
        {deadstock.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Deadstock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deadstock.map((item, index) => (
                  <Badge key={index} variant="destructive" className="p-2">
                    {item.productName || `Item ${index + 1}`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}