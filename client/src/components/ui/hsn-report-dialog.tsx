// HSN Report Dialog with date filtering and Excel download
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Download, Calendar, BarChart3, Package, AlertCircle, CheckCircle } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";

import { reportsApi } from "@/lib/api";
import { HsnReport } from "@/types/api";

interface HsnReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hsn: string;
  productName: string;
}

export default function HsnReportDialog({
  open,
  onOpenChange,
  hsn,
  productName,
}: HsnReportDialogProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  // Fetch HSN report data
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ["/api/reports/hsn", hsn, fromDate, toDate],
    queryFn: () => reportsApi.getHsnReport(hsn, fromDate, toDate),
    enabled: hasSearched && !!fromDate && !!toDate && !!hsn,
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

    console.log("Export Excel - HSN Report Data:", reportData);

    try {
      // Create workbook with HSN report data
      const workbook = XLSX.utils.book_new();

      // HSN Report Summary Sheet
      const summaryData = [
        ["HSN Report", ""],
        ["HSN Code", reportData.hsn],
        ["Product Name", reportData.productName],
        ["Report Period", `${fromDate} to ${toDate}`],
        ["", ""],
        ["Sales Summary", ""],
        ["Total Quantity", reportData.totalQuantity.toFixed(2)],
        ["Total Amount", `₹${reportData.totalAmount.toFixed(2)}`],
        ["Total Tax", `₹${reportData.totalTax.toFixed(2)}`],
        ["Final Amount", `₹${reportData.finalAmount.toFixed(2)}`],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "HSN Report Summary");

      // Generate filename with HSN and date range
      const fileName = `HSN_Report_${hsn}_${fromDate}_to_${toDate}.xlsx`;

      // Write and download the file
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "✅ Excel Exported Successfully!",
        description: `Report saved as ${fileName}`,
        className: "bg-green-50 border-green-200 shadow-lg",
        style: {
          background: "#f0fdf4",
          borderColor: "#bbf7d0",
          color: "#15803d"
        }
      });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({
        title: "Export failed",
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
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            HSN Report - {hsn} ({productName})
          </DialogTitle>
          <DialogDescription>
            View sales statistics and performance data for this HSN code
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
                  <p>Failed to load HSN report. Please try again.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Data */}
          {reportData && hasSearched && !isLoading && (
            <div className="space-y-6">
              {/* Export Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={downloadExcel} 
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  size="lg"
                >
                  <Download className="h-5 w-5" />
                  <span className="font-semibold">Export Excel Report</span>
                </Button>
              </div>

              {/* HSN Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <div className="text-sm font-medium text-muted-foreground">Total Quantity</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {reportData.totalQuantity.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                      <div className="text-sm font-medium text-muted-foreground">Total Amount</div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{reportData.totalAmount.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <div className="text-sm font-medium text-muted-foreground">Total Tax</div>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      ₹{reportData.totalTax.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-600" />
                      <div className="text-sm font-medium text-muted-foreground">Final Amount</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{reportData.finalAmount.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* HSN Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">HSN Code Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">HSN Code:</span>
                      <span className="font-medium">{reportData.hsn}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Product Name:</span>
                      <span className="font-medium">{reportData.productName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tax Percentage:</span>
                      <span className="font-medium">
                        {reportData.totalAmount > 0 
                          ? `${((reportData.totalTax / reportData.totalAmount) * 100).toFixed(2)}%` 
                          : "0%"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Average Unit Price:</span>
                      <span className="font-medium">
                        ₹{reportData.totalQuantity > 0 
                          ? (reportData.totalAmount / reportData.totalQuantity).toFixed(2)
                          : "0.00"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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