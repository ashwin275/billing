// Invoice Management Component with PDF Generation
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Download, Edit, Trash2, Plus, Search, Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { invoicesApi } from "@/lib/api";
import { Invoice } from "@/types/api";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";

export default function InvoiceManagementClean() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Invoice>("invoiceDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices/all"],
    queryFn: () => invoicesApi.getAllInvoices(),
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => invoicesApi.deleteInvoice(invoiceId),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error?.detail || error?.message || "Unable to delete invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter and sort invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      invoice.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if ((aValue ?? 0) < (bValue ?? 0)) return sortDirection === "asc" ? -1 : 1;
    if ((aValue ?? 0) > (bValue ?? 0)) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = sortedInvoices.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);

  // Handle sort
  const handleSort = (field: keyof Invoice) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle delete with modal confirmation
  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

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

  // Generate PDF using the new template system
  const handleDownloadPDF = (invoiceData: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${invoiceData.invoiceNo}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              margin: 0;
              size: A4 portrait;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background: white;
              color: #000;
              line-height: 1.6;
              margin: 0;
              padding: 0;
            }
            
            .invoice-template {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
              display: flex;
              flex-direction: column;
            }
            
            .invoice-header {
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              color: #000000;
              padding: 40px 30px;
              position: relative;
              overflow: hidden;
              flex-shrink: 0;
              min-height: 140px;
            }
            
            .invoice-header::after {
              content: '';
              position: absolute;
              bottom: -20px;
              left: 0;
              width: 100%;
              height: 40px;
              background: white;
              border-radius: 50% 50% 0 0 / 100% 100% 0 0;
            }
            
            .header-content {
              position: relative;
              z-index: 2;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            
            .company-info {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            
            .company-logo {
              width: 50px;
              height: 50px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: bold;
              border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .company-details h1 {
              font-size: 24px;
              font-weight: 700;
              margin: 0 0 5px 0;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .company-tagline {
              font-size: 12px;
              opacity: 0.9;
              margin: 0;
            }
            
            .invoice-meta {
              text-align: right;
            }
            
            .invoice-meta h2 {
              font-size: 28px;
              font-weight: 300;
              letter-spacing: 2px;
              margin: 0 0 8px 0;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .invoice-number {
              font-size: 14px;
              font-weight: 600;
              margin: 3px 0;
            }
            
            .invoice-date {
              font-size: 12px;
              opacity: 0.9;
              margin: 3px 0;
            }
            
            .invoice-body {
              padding: 30px;
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            
            .billing-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 25px;
            }
            
            .billing-block h3 {
              color: #2d3748;
              font-size: 14px;
              font-weight: 600;
              margin: 0 0 10px 0;
              padding-bottom: 5px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .billing-block p {
              color: #4a5568;
              margin: 3px 0;
              font-size: 12px;
            }
            
            .customer-name {
              font-weight: 600;
              font-size: 14px;
              color: #2d3748;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              border-radius: 6px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .items-table thead {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .items-table th {
              color: #000000;
              font-weight: 600;
              padding: 10px 8px;
              text-align: left;
              font-size: 11px;
              letter-spacing: 0.3px;
            }
            
            .items-table th.text-right {
              text-align: right;
            }
            
            .items-table td {
              padding: 8px;
              border-bottom: 1px solid #e2e8f0;
              color: #4a5568;
              font-size: 11px;
            }
            
            .items-table td.text-right {
              text-align: right;
            }
            
            .items-table tbody tr:last-child td {
              border-bottom: none;
            }
            
            .product-name {
              font-weight: 600;
              color: #2d3748;
            }
            
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 25px;
            }
            
            .totals-table {
              min-width: 250px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              color: #4a5568;
              font-size: 12px;
            }
            
            .total-row.grand-total {
              border-top: 2px solid #e2e8f0;
              margin-top: 8px;
              padding-top: 10px;
              font-size: 16px;
              font-weight: 700;
              color: #2d3748;
            }
            
            .total-row.balance {
              font-weight: 600;
              font-size: 14px;
            }
            
            .balance.positive {
              color: #e53e3e;
            }
            
            .balance.negative {
              color: #38a169;
            }
            
            .bottom-section {
              margin-top: auto;
              margin-bottom: 20px;
            }
            
            .terms-section {
              background: #f7fafc;
              padding: 15px;
              border-radius: 6px;
            }
            
            .terms-section h3 {
              color: #2d3748;
              font-size: 14px;
              font-weight: 600;
              margin: 0 0 10px 0;
            }
            
            .terms-section p {
              color: #4a5568;
              font-size: 11px;
              margin: 5px 0;
              line-height: 1.4;
            }
            
            .remarks-section {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
            }
            
            .remarks-section strong {
              color: #2d3748;
            }
            

            
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-template">
            <!-- Header -->
            <div class="invoice-header">
              <div class="header-content">
                <div class="company-info">
                  <div class="company-logo">
                    ${invoiceData.shop?.name?.charAt(0) || 'S'}
                  </div>
                  <div class="company-details">
                    <h1>${invoiceData.shop?.name || 'Shop Name'}</h1>
                    <p class="company-tagline">Quality Products & Services</p>
                    ${invoiceData.shop?.gstNo ? `<p style="font-size: 10px; margin-top: 3px;">GST: ${invoiceData.shop.gstNo}</p>` : ''}
                    ${invoiceData.shop?.phone ? `<p style="font-size: 10px; margin-top: 2px;">📞 ${invoiceData.shop.phone}</p>` : ''}
                  </div>
                </div>
                <div class="invoice-meta">
                  <h2>INVOICE</h2>
                  <div class="invoice-number">#${invoiceData.invoiceNo}</div>
                  <div class="invoice-date">
                    ${new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>

            <!-- Body -->
            <div class="invoice-body">
              <!-- Billing Information -->
              <div class="billing-section">
                <div class="billing-block">
                  <h3>Bill To</h3>
                  <div class="customer-name">
                    ${invoiceData.customerName || 'Walk-in Customer'}
                  </div>
                  <p>Phone: ${invoiceData.customerPhone || 'N/A'}</p>
                  <p>Location: ${invoiceData.customerLocation || 'N/A'}</p>
                </div>
                <div class="billing-block">
                  <h3>Payment Details</h3>
                  <p><strong>Status:</strong> ${invoiceData.paymentStatus}</p>
                  <p><strong>Mode:</strong> ${invoiceData.paymentMode}</p>
                  ${invoiceData.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString('en-IN')}</p>` : ''}
                  ${invoiceData.transactionId ? `<p><strong>Transaction ID:</strong> ${invoiceData.transactionId}</p>` : ''}
                </div>
              </div>

              <!-- Items Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Product Number</th>
                    <th>HSN</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Rate</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">CGST</th>
                    <th class="text-right">SGST</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.saleItems && invoiceData.saleItems.length > 0 ? (
                    invoiceData.saleItems.map(item => `
                      <tr>
                        <td>
                          <div class="product-name">${item.product?.name || 'Product'}</div>
                          ${item.product?.description ? `<div style="font-size: 10px; color: #718096;">${item.product.description}</div>` : ''}
                        </td>
                        <td>${item.product?.productNumber || 'N/A'}</td>
                        <td>${item.product?.hsn || 'N/A'}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">₹${item.price?.toFixed(2) || '0.00'}</td>
                        <td class="text-right">₹${item.discount?.toFixed(2) || '0.00'}</td>
                        <td class="text-right">₹${((item.price * item.quantity * (item.product?.cgst || 0)) / 100).toFixed(2)}</td>
                        <td class="text-right">₹${((item.price * item.quantity * (item.product?.sgst || 0)) / 100).toFixed(2)}</td>
                        <td class="text-right">₹${item.total?.toFixed(2) || '0.00'}</td>
                      </tr>
                    `).join('')
                  ) : '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #9ca3af;">No items found</td></tr>'}
                </tbody>
              </table>

              <!-- Totals -->
              <div class="totals-section">
                <div class="totals-table">
                  <div class="total-row">
                    <span>Subtotal:</span>
                    <span>₹${((invoiceData.totalAmount || 0) - (invoiceData.tax || 0)).toFixed(2)}</span>
                  </div>
                  <div class="total-row">
                    <span>Tax:</span>
                    <span>₹${(invoiceData.tax || 0).toFixed(2)}</span>
                  </div>
                  <div class="total-row">
                    <span>Total discount:</span>
                    <span>- ₹${(invoiceData.saleItems && invoiceData.saleItems.length > 0 ? 
                      invoiceData.saleItems.reduce((total, item) => total + (item.discount || 0), 0) : 0).toFixed(2)}</span>
                  </div>
                  <div class="total-row">
                    <span>Round off:</span>
                    <span>- ₹${(invoiceData.discount || 0).toFixed(2)}</span>
                  </div>
                  <div class="total-row grand-total">
                    <span>Total Amount:</span>
                    <span>₹${(invoiceData.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div class="total-row">
                    <span>Amount Paid:</span>
                    <span>₹${(invoiceData.amountPaid || 0).toFixed(2)}</span>
                  </div>
                  <div class="total-row balance ${((invoiceData.totalAmount || 0) - (invoiceData.amountPaid || 0)) > 0 ? 'positive' : 'negative'}">
                    <span>Balance:</span>
                    <span>₹${((invoiceData.totalAmount || 0) - (invoiceData.amountPaid || 0)).toFixed(2)}</span>
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
                    <div class="remarks-section">
                      <strong>Remarks:</strong><br />
                      ${invoiceData.remark}
                    </div>
                  ` : ''}
                </div>
                
              </div>
            </div>
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading invoices...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoice Management</h2>
          <p className="text-muted-foreground">Manage and track all your invoices</p>
        </div>
        <Link href="/invoices/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Invoices</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice # or customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("invoiceNo")}
                  >
                    <div className="flex items-center">
                      Invoice #
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("invoiceDate")}
                  >
                    <div className="flex items-center">
                      Date
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center">
                      Amount
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.invoiceId}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNo}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customerName || 'Unknown Customer'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">₹{invoice.totalAmount?.toFixed(2) || '0.00'}</div>
                        <div className="text-sm text-muted-foreground">{invoice.paymentMode || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          invoice.paymentStatus === 'PAID' ? 'default' :
                          invoice.paymentStatus === 'PENDING' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {invoice.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Link href={`/invoices/create?edit=${invoice.invoiceId}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice)}
                          disabled={deleteInvoiceMutation.isPending}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, sortedInvoices.length)} of {sortedInvoices.length} invoices
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <InvoiceTemplate invoice={selectedInvoice} isPreview={true} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-2">
                <strong>You are about to permanently delete:</strong>
              </p>
              <div className="space-y-1 text-sm">
                <p><strong>Invoice:</strong> #{invoiceToDelete?.invoiceNo}</p>
                <p><strong>Amount:</strong> ₹{invoiceToDelete?.totalAmount?.toFixed(2) || '0.00'}</p>
                <p><strong>Status:</strong> {invoiceToDelete?.paymentStatus}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The invoice will be permanently removed from your records.
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteInvoiceMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? "Deleting..." : "Delete Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}