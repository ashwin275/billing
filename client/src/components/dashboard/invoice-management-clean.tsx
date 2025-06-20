// Invoice management component - displays and manages invoices
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, Plus, Trash2, Download, Search, Eye, Edit,
  ArrowUpDown, ArrowUp, ArrowDown, Calendar, CreditCard, DollarSign
} from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";

import { invoicesApi, handleApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Invoice } from "@/types/api";

/**
 * InvoiceManagement component for displaying and managing invoices
 */
export default function InvoiceManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [sortField, setSortField] = useState<keyof Invoice>("invoiceDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ["/api/invoices/all"],
    queryFn: () => invoicesApi.getAllInvoices(),
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => invoicesApi.deleteInvoice(invoiceId),
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "Invoice has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete invoice",
        description: handleApiError(error),
        variant: "destructive",
      });
    },
  });

  // Handle sorting
  const handleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (field: keyof Invoice) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Filter and sort invoices
  const filteredInvoices = Array.isArray(invoices) 
    ? invoices.filter((invoice) => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          invoice.invoiceNo?.toLowerCase().includes(searchTermLower) ||
          invoice.shop?.name?.toLowerCase().includes(searchTermLower) ||
          invoice.paymentStatus?.toLowerCase().includes(searchTermLower) ||
          invoice.paymentMode?.toLowerCase().includes(searchTermLower)
        );
      }).sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === "asc" ? -1 : 1;
        if (bValue == null) return sortDirection === "asc" ? 1 : -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === "asc" 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }
        
        return sortDirection === "asc" 
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      })
    : [];

  // Pagination logic
  const totalInvoices = filteredInvoices.length;
  const totalPages = Math.ceil(totalInvoices / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  // Handle delete
  const handleDelete = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoiceMutation.mutate(invoiceToDelete.invoiceId);
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  // Handle preview
  const handlePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewDialogOpen(true);
  };

  // Handle download
  const handleDownload = (invoice: Invoice) => {
    const invoiceData = {
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      shop: {
        name: invoice.shop?.name || "Shop Name",
        place: invoice.shop?.place || "Shop Address",
        tagline: "Quality Products & Services"
      },
      customer: {
        name: "Customer Name", // We don't have customer data in invoice object
        place: "Customer Address",
        phone: "Customer Phone"
      },
      paymentDetails: {
        paymentStatus: invoice.paymentStatus,
        paymentMode: invoice.paymentMode,
        billType: invoice.billType || "GST",
        saleType: invoice.saleType || "RETAIL"
      },
      items: invoice.saleItems || [],
      totalAmount: invoice.totalAmount || 0,
      tax: invoice.tax || 0,
      discount: invoice.discount || 0,
      amountPaid: invoice.amountPaid || 0,
      remark: invoice.remark
    };

    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceData.invoiceNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 40px 20px;
            }
            
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 25px 50px rgba(0,0,0,0.15);
              position: relative;
            }
            
            .header-wave {
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              height: 200px;
              position: relative;
              overflow: hidden;
            }
            
            .header-wave::after {
              content: '';
              position: absolute;
              bottom: -50px;
              left: 0;
              width: 100%;
              height: 100px;
              background: white;
              border-radius: 50% 50% 0 0 / 100% 100% 0 0;
            }
            
            .header-content {
              position: relative;
              z-index: 2;
              color: white;
              padding: 40px 50px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            
            .logo-placeholder {
              width: 60px;
              height: 60px;
              background: rgba(255,255,255,0.2);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
              border: 2px solid rgba(255,255,255,0.3);
            }
            
            .company-info h1 {
              font-size: 32px;
              font-weight: 700;
              margin-bottom: 5px;
              text-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .company-tagline {
              font-size: 14px;
              opacity: 0.9;
              font-weight: 300;
            }
            
            .invoice-title {
              text-align: right;
            }
            
            .invoice-title h2 {
              font-size: 48px;
              font-weight: 300;
              letter-spacing: 3px;
              margin-bottom: 10px;
              text-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .invoice-meta {
              font-size: 14px;
              opacity: 0.9;
            }
            
            .content-section {
              padding: 60px 50px 50px;
            }
            
            .bill-to-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 60px;
              margin-bottom: 50px;
            }
            
            .info-block h3 {
              color: #2d3748;
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .info-block p {
              color: #4a5568;
              line-height: 1.6;
              margin-bottom: 5px;
            }
            
            .customer-name {
              font-weight: 600;
              color: #2d3748;
              font-size: 18px;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            
            .items-table thead tr {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            
            .items-table th {
              padding: 20px 15px;
              font-weight: 600;
              font-size: 14px;
              letter-spacing: 0.5px;
            }
            
            .items-table td {
              padding: 18px 15px;
              border-bottom: 1px solid #e2e8f0;
              color: #4a5568;
            }
            
            .items-table tbody tr:hover {
              background-color: #f7fafc;
            }
            
            .items-table tbody tr:last-child td {
              border-bottom: none;
            }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 50px;
            }
            
            .totals-box {
              background: #f7fafc;
              padding: 30px;
              border-radius: 12px;
              min-width: 350px;
            }
            
            .total-line {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              color: #4a5568;
            }
            
            .grand-total {
              border-top: 2px solid #e2e8f0;
              margin-top: 15px;
              padding-top: 15px;
              font-size: 20px;
              font-weight: 700;
              color: #2d3748;
            }
            
            .balance {
              font-weight: 600;
              font-size: 18px;
            }
            
            .balance.positive { color: #e53e3e; }
            .balance.negative { color: #38a169; }
            
            .bottom-section {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 40px;
              margin-top: 40px;
            }
            
            .terms-section {
              background: #f7fafc;
              padding: 25px;
              border-radius: 12px;
            }
            
            .terms-section h3 {
              color: #2d3748;
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 15px;
            }
            
            .terms-section p {
              color: #4a5568;
              font-size: 13px;
              line-height: 1.6;
              margin-bottom: 8px;
            }
            
            .signature-section {
              text-align: center;
              padding: 25px;
            }
            
            .signature-line {
              border-top: 2px solid #2d3748;
              width: 150px;
              margin: 40px auto 10px;
            }
            
            .signature-text {
              color: #4a5568;
              font-size: 14px;
              font-weight: 500;
            }
            
            .footer-wave {
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              height: 60px;
              position: relative;
              margin-top: 30px;
            }
            
            .footer-wave::before {
              content: '';
              position: absolute;
              top: -30px;
              left: 0;
              width: 100%;
              height: 60px;
              background: white;
              border-radius: 0 0 50% 50% / 0 0 100% 100%;
            }
            
            @media print {
              body { 
                background: white;
                padding: 0;
              }
              .invoice-container {
                box-shadow: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header Wave Section -->
            <div class="header-wave">
              <div class="header-content">
                <div class="logo-section">
                  <div class="logo-placeholder">
                    ${invoiceData.shop.name.charAt(0)}
                  </div>
                  <div class="company-info">
                    <h1>${invoiceData.shop.name}</h1>
                    <div class="company-tagline">${invoiceData.shop.tagline}</div>
                  </div>
                </div>
                <div class="invoice-title">
                  <h2>INVOICE</h2>
                  <div class="invoice-meta">
                    <div><strong>Invoice #:</strong> ${invoiceData.invoiceNo}</div>
                    <div><strong>Date:</strong> ${new Date(invoiceData.invoiceDate).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Content Section -->
            <div class="content-section">
              <!-- Bill To Section -->
              <div class="bill-to-section">
                <div class="info-block">
                  <h3>Invoice To:</h3>
                  <p class="customer-name">${invoiceData.customer.name}</p>
                  <p>📍 ${invoiceData.customer.place}</p>
                  <p>📞 ${invoiceData.customer.phone}</p>
                </div>
                <div class="info-block">
                  <h3>Payment Info:</h3>
                  <p><strong>Status:</strong> ${invoiceData.paymentDetails.paymentStatus}</p>
                  <p><strong>Mode:</strong> ${invoiceData.paymentDetails.paymentMode}</p>
                  <p><strong>Type:</strong> ${invoiceData.paymentDetails.billType} ${invoiceData.paymentDetails.saleType}</p>
                </div>
              </div>

              <!-- Items Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th class="text-left">Item Description</th>
                    <th class="text-center">Qty.</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.items.map(item => `
                    <tr>
                      <td class="text-left">
                        <div style="font-weight: 600; color: #2d3748;">${item.product?.name || 'Product'}</div>
                      </td>
                      <td class="text-center">${item.quantity.toString().padStart(2, '0')}</td>
                      <td class="text-right">₹${(item.unitPrice || 0).toFixed(2)}</td>
                      <td class="text-right">₹${(item.discount || 0).toFixed(2)}</td>
                      <td class="text-right" style="font-weight: 600; color: #2d3748;">₹${(item.totalPrice || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- Totals Section -->
              <div class="totals-section">
                <div class="totals-box">
                  <div class="total-line">
                    <span>Sub Total:</span>
                    <span>₹${invoiceData.totalAmount.toFixed(2)}</span>
                  </div>
                  <div class="total-line">
                    <span>Discount:</span>
                    <span>- ₹${invoiceData.discount.toFixed(2)}</span>
                  </div>
                  <div class="total-line">
                    <span>Tax - GST:</span>
                    <span>₹${invoiceData.tax.toFixed(2)}</span>
                  </div>
                  <div class="total-line grand-total">
                    <span>Total:</span>
                    <span>₹${invoiceData.totalAmount.toFixed(2)}</span>
                  </div>
                  <div class="total-line">
                    <span>Amount Paid:</span>
                    <span>₹${invoiceData.amountPaid.toFixed(2)}</span>
                  </div>
                  <div class="total-line balance ${(invoiceData.totalAmount - invoiceData.amountPaid) > 0 ? 'positive' : 'negative'}">
                    <span>Balance:</span>
                    <span>₹${(invoiceData.totalAmount - invoiceData.amountPaid).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <!-- Bottom Section -->
              <div class="bottom-section">
                <div class="terms-section">
                  <h3>Terms & Conditions</h3>
                  <p>1. Payment is due within 30 days of invoice date.</p>
                  <p>2. Late payments may incur additional charges.</p>
                  <p>3. Goods once sold cannot be returned without prior approval.</p>
                  <p>4. Any disputes must be resolved within 7 days of delivery.</p>
                  ${invoiceData.remark ? `
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                      <strong>Remarks:</strong><br>
                      ${invoiceData.remark}
                    </div>
                  ` : ''}
                </div>
                <div class="signature-section">
                  <div class="signature-line"></div>
                  <div class="signature-text">${invoiceData.shop.name}<br>Signature</div>
                </div>
              </div>
            </div>

            <!-- Footer Wave -->
            <div class="footer-wave"></div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'OVERDUE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load invoices</h3>
            <p className="text-muted-foreground text-center mb-4">
              There was an error loading the invoices. Please try again.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Invoice Management</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Create and manage invoices for your business</p>
          </div>
          <Link href="/create-invoice">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Create Invoice</span>
            </Button>
          </Link>
        </div>
        
        {/* Statistics Badges */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
            {totalInvoices} of {invoices?.length || 0} Total
          </Badge>
          <Badge variant="default" className="text-xs sm:text-sm px-2 py-1 bg-green-600">
            {Array.isArray(invoices) ? invoices.filter(invoice => invoice.paymentStatus === 'PAID').length : 0} Paid
          </Badge>
          <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1">
            {Array.isArray(invoices) ? invoices.filter(invoice => invoice.paymentStatus === 'PENDING').length : 0} Pending
          </Badge>
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>All Invoices</span>
            </CardTitle>
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("invoiceNo")}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Invoice</span>
                      {getSortIcon("invoiceNo")}
                    </div>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Shop</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Amount</span>
                      {getSortIcon("totalAmount")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("paymentStatus")}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                      {getSortIcon("paymentStatus")}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2">Loading invoices...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No invoices found</p>
                        <p className="text-sm text-muted-foreground">Create your first invoice to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentInvoices.map((invoice) => (
                    <TableRow key={invoice.invoiceId}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold">{invoice.invoiceNo}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{invoice.sales?.customerId || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">{invoice.shop?.name || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">₹{invoice.totalAmount?.toFixed(2) || '0.00'}</span>
                          <span className="text-xs text-muted-foreground">
                            Paid: ₹{invoice.amountPaid?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(invoice.paymentStatus)} className="text-xs">
                          {invoice.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(invoice)}
                            title="Preview Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(invoice)}
                            title="Download Invoice"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Link href={`/edit-invoice/${invoice.invoiceId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit Invoice"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(invoice)}
                            disabled={deleteInvoiceMutation.isPending}
                            title="Delete Invoice"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={cn(
                    "cursor-pointer",
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNumber > totalPages) return null;
                
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNumber)}
                      isActive={currentPage === pageNumber}
                      className="cursor-pointer"
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={cn(
                    "cursor-pointer",
                    currentPage === totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Invoice Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              Preview of invoice #{selectedInvoice?.invoiceNo}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6 p-6 bg-white text-black">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-black">{selectedInvoice.shop?.name || 'Shop Name'}</h2>
                  <p className="text-gray-600">{selectedInvoice.shop?.place || 'Shop Address'}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-bold text-black">INVOICE</h3>
                  <p className="text-gray-600">#{selectedInvoice.invoiceNo}</p>
                  <p className="text-gray-600">{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator className="border-black" />

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-black mb-2">Bill To:</h4>
                  <p className="text-gray-600">Customer ID: {selectedInvoice.customerId}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-black mb-2">Payment Details:</h4>
                  <p className="text-gray-600">Status: {selectedInvoice.paymentStatus}</p>
                  <p className="text-gray-600">Mode: {selectedInvoice.paymentMode}</p>
                  {selectedInvoice.dueDate && (
                    <p className="text-gray-600">Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {selectedInvoice.saleItems && selectedInvoice.saleItems.length > 0 && (
                <div>
                  <h4 className="font-semibold text-black mb-4">Items:</h4>
                  <div className="border border-black">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border-b border-black p-2 text-left text-black">Product</th>
                          <th className="border-b border-black p-2 text-right text-black">Qty</th>
                          <th className="border-b border-black p-2 text-right text-black">Rate</th>
                          <th className="border-b border-black p-2 text-right text-black">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.saleItems.map((item, index) => (
                          <tr key={index}>
                            <td className="border-b border-black p-2 text-black">{item.product?.name || 'Product'}</td>
                            <td className="border-b border-black p-2 text-right text-black">{item.quantity}</td>
                            <td className="border-b border-black p-2 text-right text-black">₹{item.unitPrice?.toFixed(2) || '0.00'}</td>
                            <td className="border-b border-black p-2 text-right text-black">₹{item.totalPrice?.toFixed(2) || '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-black">
                    <span>Subtotal:</span>
                    <span>₹{selectedInvoice.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax:</span>
                    <span>₹{selectedInvoice.tax?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Discount:</span>
                    <span>-₹{selectedInvoice.discount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <Separator className="border-black" />
                  <div className="flex justify-between font-bold text-lg text-black">
                    <span>Total:</span>
                    <span>₹{selectedInvoice.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>Amount Paid:</span>
                    <span>₹{selectedInvoice.amountPaid?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-black">
                    <span>Balance:</span>
                    <span>₹{((selectedInvoice.totalAmount || 0) - (selectedInvoice.amountPaid || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {selectedInvoice.remark && (
                <div>
                  <h4 className="font-semibold text-black mb-2">Remarks:</h4>
                  <p className="text-gray-600">{selectedInvoice.remark}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice #{invoiceToDelete?.invoiceNo}? 
              This action cannot be undone and will permanently remove the invoice from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setInvoiceToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteInvoiceMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteInvoiceMutation.isPending ? "Deleting..." : "Delete Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}