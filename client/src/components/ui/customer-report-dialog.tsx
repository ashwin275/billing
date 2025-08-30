// Customer Report Dialog with date filtering, Excel download, and PDF download
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { FileDown, Calendar, TrendingUp, Users, CreditCard, Package, AlertCircle, ChevronLeft, ChevronRight, Download, CheckCircle, FileText } from "lucide-react";

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

import { reportsApi, shopsApi } from "@/lib/api";
import { CustomerReport } from "@/types/api";
import { cn } from "@/lib/utils";
import { getAuthToken, decodeToken } from "@/lib/auth";

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

  // Fetch shop data for PDF generation
  const { data: shops = [] } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
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

    console.log("Download Excel - Report Data:", reportData);
    console.log("Download Excel - Top Products:", reportData.topProducts);

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
      console.log("Checking products data:", {
        hasProducts: !!reportData.topProducts,
        productsLength: reportData.topProducts?.length,
        productsData: reportData.topProducts
      });

      if (reportData.topProducts && Array.isArray(reportData.topProducts) && reportData.topProducts.length > 0) {
        console.log("Adding Top Products sheet with", reportData.topProducts.length, "products");
        
        // Create header row
        const productsData = [
          ["Product Name", "Quantity", "Sub Total", "Tax", "Discount", "Final Amount", "Invoice Date"]
        ];
        
        // Add product rows
        reportData.topProducts.forEach((product, index) => {
          console.log(`Processing product ${index + 1}:`, product);
          productsData.push([
            product.productName || 'N/A',
            parseFloat(product.quantity || 0).toFixed(2),
            parseFloat(product.subTotal || 0).toFixed(2),
            parseFloat(product.tax || 0).toFixed(2),
            parseFloat(product.discount || 0).toFixed(2),
            parseFloat(product.finalAmount || 0).toFixed(2),
            product.invoiceDate ? new Date(product.invoiceDate).toLocaleDateString() : 'N/A',
          ]);
        });

        console.log("Final products data for Excel:", productsData);

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
        
        XLSX.utils.book_append_sheet(workbook, productsSheet, "Products Purchased");
        console.log("Products sheet added successfully");
      } else {
        console.log("No top products found or empty array");
        // Create empty products sheet with headers
        const emptyProductsData = [
          ["Product Name", "Quantity", "Sub Total", "Tax", "Discount", "Final Amount", "Invoice Date"],
          ["No products found for this period", "", "", "", "", "", ""]
        ];
        const emptyProductsSheet = XLSX.utils.aoa_to_sheet(emptyProductsData);
        XLSX.utils.book_append_sheet(workbook, emptyProductsSheet, "Products Purchased");
        console.log("Empty products sheet added");
      }

      // Generate filename with customer name and date range
      const fileName = `Customer_Report_${customerName.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.xlsx`;

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
        title: "Download failed",
        description: "Failed to generate Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  /**
   * Download report data as PDF file
   */
  const downloadPDF = () => {
    if (!reportData) return;

    // Get shop details
    const token = getAuthToken();
    let shopId = 1; // Default fallback
    
    if (token) {
      try {
        const decoded = decodeToken(token);
        shopId = decoded.shopId || 1;
      } catch (error) {
        console.warn('Failed to decode token for PDF generation:', error);
      }
    }

    const shop = Array.isArray(shops) ? shops.find(s => s.shopId === shopId) : null;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "PDF generation failed",
        description: "Please allow popups for this site to download PDF.",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Customer Report - ${reportData.customerName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              margin: 25mm;
              size: A4 portrait;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background: white;
              color: #000;
              line-height: 1.6;
              font-size: 12px;
              padding: 0;
              margin: 0;
            }
            
            .report-container {
              max-width: 100%;
              margin: 0 auto;
              background: white;
              padding: 20px;
              box-sizing: border-box;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .company-info {
              flex: 1;
              margin-right: 20px;
            }
            
            .company-info h1 {
              font-size: 20px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 8px;
              line-height: 1.2;
            }
            
            .company-details {
              font-size: 11px;
              color: #64748b;
              line-height: 1.5;
            }
            
            .logo-section {
              width: 70px;
              height: 70px;
              background: #f1f5f9;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: #475569;
              border: 1px solid #e2e8f0;
              flex-shrink: 0;
            }
            
            .report-title {
              text-align: center;
              margin-bottom: 25px;
            }
            
            .report-title h2 {
              font-size: 22px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 6px;
              line-height: 1.3;
            }
            
            .report-subtitle {
              font-size: 13px;
              color: #64748b;
            }
            
            .customer-details {
              background: #f8fafc;
              padding: 18px;
              border-radius: 6px;
              margin-bottom: 25px;
              border: 1px solid #e2e8f0;
            }
            
            .customer-details h3 {
              font-size: 15px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 12px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
            }
            
            .detail-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px 20px;
            }
            
            .detail-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 4px 0;
              min-height: 24px;
            }
            
            .detail-label {
              font-weight: 600;
              color: #475569;
              font-size: 11px;
              flex-shrink: 0;
              width: 120px;
            }
            
            .detail-value {
              font-weight: bold;
              color: #1e293b;
              font-size: 11px;
              text-align: right;
              flex: 1;
            }
            
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 25px;
            }
            
            .summary-card {
              background: white;
              padding: 12px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
              text-align: center;
            }
            
            .summary-card h4 {
              font-size: 10px;
              color: #64748b;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              line-height: 1.2;
            }
            
            .summary-card .value {
              font-size: 14px;
              font-weight: bold;
              color: #1e293b;
              line-height: 1.2;
            }
            
            .products-section {
              margin-top: 25px;
            }
            
            .products-section h3 {
              font-size: 16px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 12px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            
            th {
              background: #f1f5f9;
              padding: 8px 6px;
              text-align: left;
              font-weight: bold;
              color: #374151;
              border: 1px solid #e2e8f0;
              font-size: 10px;
              line-height: 1.3;
            }
            
            td {
              padding: 6px 6px;
              border: 1px solid #e2e8f0;
              font-size: 10px;
              line-height: 1.3;
              vertical-align: top;
            }
            
            tr:nth-child(even) {
              background: #f9fafb;
            }
            
            .text-right {
              text-align: right;
            }
            
            .font-bold {
              font-weight: bold;
            }
            
            .footer {
              margin-top: 30px;
              text-align: center;
              padding-top: 15px;
              border-top: 1px solid #e2e8f0;
              font-size: 9px;
              color: #64748b;
            }

            @media print {
              body { -webkit-print-color-adjust: exact; }
              .summary-cards { 
                grid-template-columns: repeat(2, 1fr); 
                gap: 10px;
              }
              table {
                page-break-inside: avoid;
              }
              .products-section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <!-- Header -->
            <div class="header">
              <div class="company-info">
                <h1>${shop?.name || 'Shop Name'}</h1>
                <div class="company-details">
                  ${shop?.address || 'Shop Address'}<br>
                  ${shop?.place || 'Shop Place'}<br>
                  Phone: ${shop?.phone || 'N/A'}<br>
                  GST: ${shop?.gst || 'N/A'}
                </div>
              </div>
              <div class="logo-section">
                ${shop?.logo ? `<img src="${shop.logo}" alt="Logo" style="max-width: 60px; max-height: 60px;">` : shop?.name?.charAt(0) || 'S'}
              </div>
            </div>

            <!-- Report Title -->
            <div class="report-title">
              <h2>Customer Report</h2>
              <div class="report-subtitle">
                Period: ${fromDate} to ${toDate}
              </div>
            </div>

            <!-- Customer Details -->
            <div class="customer-details">
              <h3>Customer Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Customer Name:</span>
                  <span class="detail-value">${reportData.customerName}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Phone:</span>
                  <span class="detail-value">${reportData.phone}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Place:</span>
                  <span class="detail-value">${reportData.place}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Customer Type:</span>
                  <span class="detail-value">${reportData.customerType}</span>
                </div>
              </div>
            </div>

            <!-- Summary Cards -->
            <div class="summary-cards">
              <div class="summary-card">
                <h4>Total Purchases</h4>
                <div class="value">₹${reportData.totalPurchases.toFixed(2)}</div>
              </div>
              <div class="summary-card">
                <h4>Total Bills</h4>
                <div class="value">${reportData.totalBills}</div>
              </div>
              <div class="summary-card">
                <h4>Average Bill</h4>
                <div class="value">₹${reportData.averageBillValue.toFixed(2)}</div>
              </div>
              <div class="summary-card">
                <h4>Pending Balance</h4>
                <div class="value">₹${reportData.pendingBalance.toFixed(2)}</div>
              </div>
            </div>

            <!-- Top Products Section -->
            ${reportData.topProducts && reportData.topProducts.length > 0 ? `
            <div class="products-section">
              <h3>Top Products Purchased</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th class="text-right">Quantity</th>
                    <th class="text-right">Sub Total</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">Final Amount</th>
                    <th>Invoice Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.topProducts.map(product => `
                    <tr>
                      <td class="font-bold">${product.productName}</td>
                      <td class="text-right">${product.quantity.toFixed(2)}</td>
                      <td class="text-right">₹${product.subTotal.toFixed(2)}</td>
                      <td class="text-right">₹${product.tax.toFixed(2)}</td>
                      <td class="text-right">₹${product.discount.toFixed(2)}</td>
                      <td class="text-right font-bold">₹${product.finalAmount.toFixed(2)}</td>
                      <td>${new Date(product.invoiceDate).toLocaleDateString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            <!-- Footer -->
            <div class="footer">
              Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
              This is a computer-generated report.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast({
          title: "✅ PDF Generated Successfully!",
          description: `Customer report PDF has been generated and is ready for download.`,
          className: "bg-green-50 border-green-200 shadow-lg",
          style: {
            background: "#f0fdf4",
            borderColor: "#bbf7d0",
            color: "#15803d"
          }
        });
      }, 500);
    };
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
              {/* Download Buttons */}
              <div className="flex justify-end gap-3">
                <Button 
                  onClick={downloadPDF} 
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  size="lg"
                  data-testid="button-download-pdf"
                >
                  <FileText className="h-5 w-5" />
                  <span className="font-semibold">Download PDF Report</span>
                </Button>
                <Button 
                  onClick={downloadExcel} 
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  size="lg"
                  data-testid="button-export-excel"
                >
                  <Download className="h-5 w-5" />
                  <span className="font-semibold">Export Excel Report</span>
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