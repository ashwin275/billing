// Sales/Invoice Report Dialog with date filtering, graphs, Excel and PDF download
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Download, Calendar, FileSpreadsheet, FileText, TrendingUp, DollarSign, FileCheck } from "lucide-react";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { reportsApi } from "@/lib/api";
import { SalesReport } from "@/types/api";

interface SalesReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
const LIGHT_COLORS = ['#4ade80', '#22d3ee', '#3b82f6'];

export default function SalesReportDialog({
  open,
  onOpenChange,
}: SalesReportDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  // Fetch sales report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/sales/report", startDate, endDate],
    queryFn: () => reportsApi.getSalesReport(startDate, endDate),
    enabled: hasSearched && !!startDate && !!endDate,
    retry: false,
  });

  /**
   * Handle search button click
   */
  const handleSearch = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date cannot be later than end date",
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
    if (!reportData || !reportData.sales || reportData.sales.length === 0) {
      toast({
        title: "No data",
        description: "No sales data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["Sales Report Summary", ""],
        ["Report Period", `${startDate} to ${endDate}`],
        ["", ""],
        ["Total Invoices", reportData.invoiceCount],
        ["Total Amount", `₹${reportData.totalFinalAmount.toFixed(2)}`],
        ["Total Tax", `₹${reportData.totalTax.toFixed(2)}`],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Sales details sheet
      const salesData = reportData.sales.map(sale => ({
        'Invoice No': sale.invoiceNo,
        'Sale Date': sale.saleDate,
        'Customer Name': sale.customerName,
        'Total Amount': sale.totalAmount.toFixed(2),
        'Tax': sale.tax.toFixed(2),
        'Final Amount': sale.finalAmount.toFixed(2),
        'Payment Status': sale.paymentStatus,
      }));

      const salesSheet = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(workbook, salesSheet, "Sales Details");

      // Generate filename
      const fileName = `Sales_Report_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "✅ Excel Exported Successfully!",
        description: `Report saved as ${fileName}`,
        className: "bg-green-50 border-green-200 shadow-lg",
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
   * Download report as professional PDF
   */
  const downloadPDF = () => {
    if (!reportData || !reportData.sales || reportData.sales.length === 0) {
      toast({
        title: "No data",
        description: "No sales data available to export",
        variant: "destructive",
      });
      return;
    }

    // Create a new window for PDF
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const pdfContent = generatePDFContent(reportData, startDate, endDate);
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      toast({
        title: "✅ PDF Ready!",
        description: "PDF has been generated and print dialog opened",
        className: "bg-green-50 border-green-200 shadow-lg",
      });
    }, 250);
  };

  /**
   * Generate PDF HTML content
   */
  const generatePDFContent = (data: SalesReport, start: string, end: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report - ${start} to ${end}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 10mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #000;
            font-weight: 600;
            line-height: 1.5;
            padding: 20px;
          }
          
          .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: #000;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .summary-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          
          .summary-card h3 {
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .summary-card p {
            color: #000;
            font-size: 28px;
            font-weight: 700;
          }
          
          .summary-card.total { border-color: #10b981; background: #ecfdf5; }
          .summary-card.tax { border-color: #f59e0b; background: #fffbeb; }
          .summary-card.invoices { border-color: #3b82f6; background: #eff6ff; }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            page-break-inside: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th {
            background: #1e293b;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            border: 1px solid #334155;
          }
          
          td {
            padding: 10px 8px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
            font-weight: 600;
          }
          
          tr:nth-child(even) {
            background: #f8fafc;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          }
          
          .status-paid {
            background: #dcfce7;
            color: #166534;
          }
          
          .status-pending {
            background: #fef3c7;
            color: #92400e;
          }
          
          .status-overdue {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
            page-break-inside: avoid;
          }
          
          @media print {
            body { padding: 0; }
            .header { page-break-after: avoid; }
            .summary-cards { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Sales Report</h1>
          <p>Period: ${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}</p>
        </div>
        
        <div class="summary-cards">
          <div class="summary-card total">
            <h3>Total Revenue</h3>
            <p>₹${data.totalFinalAmount.toFixed(2)}</p>
          </div>
          <div class="summary-card tax">
            <h3>Total Tax</h3>
            <p>₹${data.totalTax.toFixed(2)}</p>
          </div>
          <div class="summary-card invoices">
            <h3>Total Invoices</h3>
            <p>${data.invoiceCount}</p>
          </div>
        </div>
        
        <h2 style="margin-bottom: 15px; font-size: 20px;">Sales Details</h2>
        <table>
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Tax</th>
              <th>Final Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.sales.map(sale => `
              <tr>
                <td><strong>${sale.invoiceNo}</strong></td>
                <td>${new Date(sale.saleDate).toLocaleDateString()}</td>
                <td>${sale.customerName}</td>
                <td>₹${sale.totalAmount.toFixed(2)}</td>
                <td>₹${sale.tax.toFixed(2)}</td>
                <td><strong>₹${sale.finalAmount.toFixed(2)}</strong></td>
                <td>
                  <span class="status-badge status-${sale.paymentStatus.toLowerCase()}">
                    ${sale.paymentStatus}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>This is a computer-generated document. No signature required.</p>
        </div>
      </body>
      </html>
    `;
  };

  // Prepare chart data
  const paymentStatusData = reportData?.sales ? [
    {
      name: 'Paid',
      value: reportData.sales.filter(s => s.paymentStatus === 'PAID').length,
      color: '#10b981'
    },
    {
      name: 'Pending',
      value: reportData.sales.filter(s => s.paymentStatus === 'PENDING').length,
      color: '#f59e0b'
    },
    {
      name: 'Overdue',
      value: reportData.sales.filter(s => s.paymentStatus === 'OVERDUE').length,
      color: '#ef4444'
    },
  ].filter(item => item.value > 0) : [];

  // Top 5 sales for bar chart
  const topSalesData = reportData?.sales 
    ? [...reportData.sales]
        .sort((a, b) => b.finalAmount - a.finalAmount)
        .slice(0, 5)
        .map(sale => ({
          name: sale.invoiceNo,
          amount: sale.finalAmount,
        }))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Sales / Invoice Report</DialogTitle>
          <DialogDescription>
            Generate comprehensive sales reports with date filtering
          </DialogDescription>
        </DialogHeader>

        {/* Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-testid="input-sales-report-start-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              data-testid="input-sales-report-end-date"
            />
          </div>
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button 
              onClick={handleSearch} 
              className="w-full"
              data-testid="button-sales-report-search"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-2 text-sm text-slate-600">Loading report data...</p>
          </div>
        )}

        {/* Report Content */}
        {reportData && hasSearched && !isLoading && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ₹{reportData.totalFinalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Tax</p>
                      <p className="text-2xl font-bold text-orange-600">
                        ₹{reportData.totalTax.toFixed(2)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Invoices</p>
                      <p className="text-2xl font-bold text-blue-600">{reportData.invoiceCount}</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileCheck className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Status Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Sales Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 5 Sales by Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topSalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                      <Bar dataKey="amount" fill={LIGHT_COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Sales Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Sales Details</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadExcel}
                    data-testid="button-download-sales-excel"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadPDF}
                    data-testid="button-download-sales-pdf"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Final Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.sales.map((sale, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{sale.invoiceNo}</TableCell>
                          <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                          <TableCell>{sale.customerName}</TableCell>
                          <TableCell className="text-right">₹{sale.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{sale.tax.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{sale.finalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sale.paymentStatus === 'PAID'
                                  ? 'default'
                                  : sale.paymentStatus === 'PENDING'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {sale.paymentStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Data State */}
        {hasSearched && !isLoading && (!reportData || !reportData.sales || reportData.sales.length === 0) && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No sales data found for the selected date range</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
