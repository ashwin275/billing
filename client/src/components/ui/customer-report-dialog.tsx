// Customer Report Dialog with date filtering and Excel download
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { FileDown, Calendar, TrendingUp, Users, CreditCard, Package, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { reportsApi } from "@/lib/api";
import { CustomerReport } from "@/types/api";
import { cn } from "@/lib/utils";

interface CustomerReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerName: string;
}

export default function CustomerReportDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: CustomerReportDialogProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();

  // Fetch customer report data
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ["/api/reports/customer", customerId, fromDate, toDate],
    queryFn: () => reportsApi.getCustomerReport(customerId, fromDate, toDate),
    enabled: hasSearched && !!fromDate && !!toDate,
  });

  /**
   * Handle search button click
   */
  const handleSearch = () => {
    if (!fromDate || !toDate) {
      toast({
        title: "Missing dates",
        description: "Please select both from and to dates",
        variant: "destructive",
      });
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast({
        title: "Invalid date range",
        description: "From date cannot be later than to date",
        variant: "destructive",
      });
      return;
    }

    setHasSearched(true);
  };

  /**
   * Download report data as Excel file
   */
  const downloadExcel = () => {
    if (!reportData) return;

    try {
      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Customer Summary Sheet
      const summaryData = [
        ["Customer Report", ""],
        ["Customer Name", reportData.customerName],
        ["Phone", reportData.phone],
        ["Place", reportData.place],
        ["Customer Type", reportData.customerType],
        ["Report Period", `${fromDate} to ${toDate}`],
        ["", ""],
        ["Purchase Summary", ""],
        ["Total Purchases", `₹${reportData.totalPurchases.toFixed(2)}`],
        ["Total Bills", reportData.totalBills],
        ["Average Bill Value", `₹${reportData.averageBillValue.toFixed(2)}`],
        ["Biggest Bill", `₹${reportData.biggestBill.toFixed(2)}`],
        ["Total Discount", `₹${reportData.totalDiscount.toFixed(2)}`],
        ["Total Paid", `₹${reportData.totalPaid.toFixed(2)}`],
        ["Pending Balance", `₹${reportData.pendingBalance.toFixed(2)}`],
        ["Advance Paid", `₹${reportData.advancePaid}`],
        ["Overdue Invoices", reportData.overdueInvoices || 0],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Customer Summary");

      // Top Products Sheet - Include ALL products, not just current page
      if (reportData.topProducts && reportData.topProducts.length > 0) {
        const productsData = [
          ["Product Name", "Quantity", "Sub Total", "Tax", "Discount", "Final Amount", "Invoice Date"],
          ...reportData.topProducts.map(product => [
            product.productName,
            product.quantity.toFixed(2),
            product.subTotal.toFixed(2),
            product.tax.toFixed(2),
            product.discount.toFixed(2),
            product.finalAmount.toFixed(2),
            product.invoiceDate,
          ]),
        ];

        const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
        
        // Auto-size columns for better readability
        const columnWidths = [
          { wch: 25 }, // Product Name
          { wch: 10 }, // Quantity
          { wch: 12 }, // Sub Total
          { wch: 10 }, // Tax
          { wch: 12 }, // Discount
          { wch: 15 }, // Final Amount
          { wch: 12 }, // Invoice Date
        ];
        productsSheet['!cols'] = columnWidths;
        
        XLSX.utils.book_append_sheet(workbook, productsSheet, "Top Products");
      }

      // Generate filename with customer name and date range
      const fileName = `Customer_Report_${customerName.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.xlsx`;

      // Write and download the file
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Excel downloaded",
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({
        title: "Download failed",
        description: "Failed to generate Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  /**
   * Reset dialog state when closed
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setHasSearched(false);
      setFromDate("");
      setToDate("");
      setCurrentPage(1);
    }
    onOpenChange(newOpen);
  };

  // Pagination calculations for top products
  const topProducts = reportData?.topProducts || [];
  const totalProducts = topProducts.length;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = topProducts.slice(startIndex, endIndex);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Customer Report - {customerName}
          </DialogTitle>
          <DialogDescription>
            View detailed purchase history and statistics for this customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Date Range Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="from-date">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="to-date">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleSearch} className="w-full sm:w-auto">
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading report data...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && hasSearched && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-destructive">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Failed to load customer report. Please try again.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Data */}
          {reportData && hasSearched && !isLoading && (
            <div className="space-y-6">
              {/* Download Button */}
              <div className="flex justify-end">
                <Button onClick={downloadExcel} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Download Excel
                </Button>
              </div>

              {/* Customer Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <div className="text-sm font-medium text-muted-foreground">Total Purchases</div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{reportData.totalPurchases.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div className="text-sm font-medium text-muted-foreground">Total Bills</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {reportData.totalBills}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <div className="text-sm font-medium text-muted-foreground">Average Bill</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{reportData.averageBillValue.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-600" />
                      <div className="text-sm font-medium text-muted-foreground">Biggest Bill</div>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      ₹{reportData.biggestBill.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Discount:</span>
                      <span className="font-medium">₹{reportData.totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Paid:</span>
                      <span className="font-medium text-green-600">₹{reportData.totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pending Balance:</span>
                      <span className={cn("font-medium", reportData.pendingBalance > 0 ? "text-red-600" : "text-green-600")}>
                        ₹{reportData.pendingBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Advance Paid:</span>
                      <span className="font-medium">₹{reportData.advancePaid}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Overdue Invoices:</span>
                      <Badge variant={reportData.overdueInvoices && reportData.overdueInvoices > 0 ? "destructive" : "secondary"}>
                        {reportData.overdueInvoices || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Customer Type:</span>
                      <Badge variant="outline">{reportData.customerType}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products Table with Pagination */}
              {reportData.topProducts && reportData.topProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4" />
                      Top Products Purchased ({totalProducts} items)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Sub Total</TableHead>
                            <TableHead className="text-right">Tax</TableHead>
                            <TableHead className="text-right">Discount</TableHead>
                            <TableHead className="text-right">Final Amount</TableHead>
                            <TableHead>Invoice Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentProducts.map((product, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{product.productName}</TableCell>
                              <TableCell className="text-right">{product.quantity.toFixed(2)}</TableCell>
                              <TableCell className="text-right">₹{product.subTotal.toFixed(2)}</TableCell>
                              <TableCell className="text-right">₹{product.tax.toFixed(2)}</TableCell>
                              <TableCell className="text-right">₹{product.discount.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">₹{product.finalAmount.toFixed(2)}</TableCell>
                              <TableCell>{format(new Date(product.invoiceDate), 'dd/MM/yyyy')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls for Top Products */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1} to {Math.min(endIndex, totalProducts)} of {totalProducts} products
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Items per page selector */}
                          <div className="flex items-center gap-2 text-sm">
                            <span>Show:</span>
                            <Select 
                              value={itemsPerPage.toString()} 
                              onValueChange={(value) => {
                                setItemsPerPage(parseInt(value));
                                setCurrentPage(1);
                              }}
                            >
                              <SelectTrigger className="w-20 h-8">
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

                          {/* Page navigation */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              className="h-8 px-2"
                            >
                              First
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="h-8 px-2"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <span className="px-3 py-1 text-sm">
                              Page {currentPage} of {totalPages}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="h-8 px-2"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                              className="h-8 px-2"
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

              {/* No Products Message */}
              {reportData.topProducts && reportData.topProducts.length === 0 && (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2" />
                      <p>No products found for the selected date range.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* No Data Message */}
          {hasSearched && !isLoading && !reportData && !error && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No data found for the selected date range.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}