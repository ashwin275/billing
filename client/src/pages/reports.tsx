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

const LIGHT_COLORS = ['#4ade80', '#22d3ee', '#3b82f6', '#8b5cf6', '#10b981', '#f97316'];

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

  const selectedShop = Array.isArray(shops) ? shops.find(shop => shop.shopId === selectedShopId) : null;

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
                  <p className="text-3xl font-bold text-red-400">{deadstock.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-300" />
              </div>
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
                    {topProducts.map((entry, index) => (
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
                    {inventoryMovement.map((entry, index) => (
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
                    {discountSummary.map((entry: any, index: number) => (
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
                  {topProducts.map((product, index) => (
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
                  {topCustomers.length > 0 ? topCustomers.map((customer, index) => (
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
        {deadstock.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Deadstock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deadstock.map((item, index) => (
                  <Badge key={index} className="p-2 bg-red-100 text-red-600 hover:bg-red-200">
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