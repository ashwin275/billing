import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, Users, Package, Clock, AlertTriangle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { reportsApi } from "@/lib/api";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    from: "2025-06-01",
    to: "2025-06-18"
  });
  const [selectedShop] = useState(1); // Default shop ID

  // Fetch all reports data
  const { data: topProducts = [] } = useQuery({
    queryKey: ["/api/reports/top-products", selectedShop],
    queryFn: () => reportsApi.getTopProducts(selectedShop),
  });

  const { data: topCustomers = [] } = useQuery({
    queryKey: ["/api/reports/top-customers", selectedShop],
    queryFn: () => reportsApi.getTopCustomers(selectedShop),
  });

  const { data: salesSummary } = useQuery({
    queryKey: ["/api/reports/sales-summary", selectedShop, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getSalesSummary(selectedShop, dateRange.from, dateRange.to),
  });

  const { data: discountSummary } = useQuery({
    queryKey: ["/api/reports/discount-summary", selectedShop, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getDiscountSummary(selectedShop, dateRange.from, dateRange.to),
  });

  const { data: inventoryMovement = [] } = useQuery({
    queryKey: ["/api/reports/inventory-movement", selectedShop, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getInventoryMovement(selectedShop, dateRange.from, dateRange.to),
  });

  const { data: timeInsights } = useQuery({
    queryKey: ["/api/reports/time-insights", selectedShop, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getTimeInsights(selectedShop, dateRange.from, dateRange.to),
  });

  const { data: deadstock = [] } = useQuery({
    queryKey: ["/api/reports/deadstock", selectedShop, dateRange.from, dateRange.to],
    queryFn: () => reportsApi.getDeadstock(selectedShop, dateRange.from, dateRange.to),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Business Reports</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="from-date">From:</Label>
            <Input
              id="from-date"
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="to-date">To:</Label>
            <Input
              id="to-date"
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-auto"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
          <TabsTrigger value="sales">Sales Summary</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="time">Time Insights</TabsTrigger>
          <TabsTrigger value="deadstock">Deadstock</TabsTrigger>
        </TabsList>

        {/* Top Products Report */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div>
                        <h3 className="font-semibold">{product.productName}</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{product.totalQuantity} units</p>
                    </div>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No products data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Customers Report */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCustomers.map((customer: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div>
                        <h3 className="font-semibold">{customer.name}</h3>
                        <p className="text-sm text-gray-600">{customer.place}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">₹{customer.totalSpent?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-gray-600">{customer.orderCount || 0} orders</p>
                    </div>
                  </div>
                ))}
                {topCustomers.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No customers data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Summary Report */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Total Revenue</h3>
                  <p className="text-2xl font-bold text-blue-600">₹{salesSummary?.totalRevenue?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-800">Total Orders</h3>
                  <p className="text-2xl font-bold text-green-600">{salesSummary?.totalOrders || 0}</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-purple-800">Average Order Value</h3>
                  <p className="text-2xl font-bold text-purple-600">₹{salesSummary?.averageOrderValue?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discount Summary Report */}
        <TabsContent value="discounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Discount Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-orange-800">Total Discounts Given</h3>
                  <p className="text-2xl font-bold text-orange-600">₹{discountSummary?.totalDiscounts?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-red-800">Discount Percentage</h3>
                  <p className="text-2xl font-bold text-red-600">{discountSummary?.discountPercentage?.toFixed(1) || '0.0'}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Movement Report */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Movement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventoryMovement.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{item.productName}</h3>
                      <p className="text-sm text-gray-600">Stock: {item.currentStock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{item.quantityMoved} units moved</p>
                      <p className="text-sm text-gray-600">{item.movementType}</p>
                    </div>
                  </div>
                ))}
                {inventoryMovement.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No inventory movement data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Insights Report */}
        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-indigo-800">Peak Hour</h3>
                  <p className="text-2xl font-bold text-indigo-600">
                    {timeInsights?.peakHour !== -1 ? `${timeInsights?.peakHour}:00` : 'No data'}
                  </p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-800">Best Day</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {timeInsights?.bestDay || 'No data'}
                  </p>
                </div>
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-red-800">Worst Day</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {timeInsights?.worstDay || 'No data'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadstock Report */}
        <TabsContent value="deadstock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Deadstock Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deadstock.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <div>
                      <h3 className="font-semibold text-red-800">{item.productName}</h3>
                      <p className="text-sm text-red-600">Last sold: {item.lastSoldDate || 'Never'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{item.stockQuantity} units</p>
                      <p className="text-sm text-red-600">₹{item.stockValue?.toFixed(2) || '0.00'} value</p>
                    </div>
                  </div>
                ))}
                {deadstock.length === 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-green-600 font-semibold">Great! No deadstock found</p>
                    <p className="text-gray-500">All products are moving well</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}