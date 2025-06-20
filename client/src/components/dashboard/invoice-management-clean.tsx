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
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { invoicesApi } from "@/lib/api";
import { Invoice } from "@/types/api";

export default function InvoiceManagementClean() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Invoice>("invoiceDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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
        title: "Invoice deleted",
        description: "Invoice has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete invoice",
        description: error?.detail || error?.message || "Failed to delete invoice.",
        variant: "destructive",
      });
    },
  });

  // Filter and sort invoices
  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.shop?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
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

  // Handle delete
  const handleDeleteInvoice = (invoiceId: number) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoiceMutation.mutate(invoiceId);
    }
  };

  // Handle preview
  const handlePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewDialogOpen(true);
  };

  // Generate PDF
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
            
            .invoice-meta {
              text-align: right;
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
              font-size: 18px;
              color: #2d3748;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.07);
            }
            
            .items-table thead {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .items-table th {
              color: white;
              font-weight: 600;
              padding: 20px 15px;
              text-align: left;
              font-size: 14px;
              letter-spacing: 0.5px;
            }
            
            .items-table td {
              padding: 18px 15px;
              border-bottom: 1px solid #e2e8f0;
              color: #4a5568;
              font-size: 14px;
            }
            
            .items-table tbody tr:hover {
              background-color: #f7fafc;
            }
            
            .items-table tbody tr:last-child td {
              border-bottom: none;
            }
            
            .product-name {
              font-weight: 600;
              color: #2d3748;
              margin-bottom: 4px;
            }
            
            .text-right {
              text-align: right;
            }
            
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 40px;
            }
            
            .totals-table {
              min-width: 300px;
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
                  <div class="logo-placeholder">${invoiceData.shop.name.charAt(0)}</div>
                  <div class="company-info">
                    <h1>${invoiceData.shop.name}</h1>
                    <div class="company-tagline">Quality Products & Services</div>
                  </div>
                </div>
                <div class="invoice-meta">
                  <div style="font-size: 14px; margin-bottom: 8px;">#${invoiceData.invoiceNo}</div>
                  <div style="font-size: 12px;">${new Date(invoiceData.invoiceDate).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            <!-- Content Section -->
            <div class="content-section">
              <!-- Bill To Section -->
              <div class="bill-to-section">
                <div class="info-block">
                  <h3>Bill To</h3>
                  <div class="customer-name">${invoiceData.sales?.customerId ? 'Customer' : 'Walk-in Customer'}</div>
                  <p>Phone: ${invoiceData.sales?.customerId || 'N/A'}</p>
                  <p>Location: ${invoiceData.shop.place}</p>
                </div>
                <div class="info-block">
                  <h3>Payment Details</h3>
                  <p><strong>Status:</strong> ${invoiceData.paymentStatus}</p>
                  <p><strong>Mode:</strong> ${invoiceData.paymentMode}</p>
                  <p><strong>Type:</strong> ${invoiceData.billType} ${invoiceData.saleType}</p>
                  ${invoiceData.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>` : ''}
                </div>
              </div>

              <!-- Items Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
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
                  ${invoiceData.saleItems?.map(item => `
                    <tr>
                      <td>
                        <div class="product-name">${item.product?.name || 'Product'}</div>
                      </td>
                      <td>${item.product?.hsn || 'N/A'}</td>
                      <td class="text-right">${item.quantity}</td>
                      <td class="text-right">₹${item.unitPrice?.toFixed(2) || '0.00'}</td>
                      <td class="text-right">₹${item.discount?.toFixed(2) || '0.00'}</td>
                      <td class="text-right">₹${item.cgst?.toFixed(2) || '0.00'}</td>
                      <td class="text-right">₹${item.sgst?.toFixed(2) || '0.00'}</td>
                      <td class="text-right">₹${item.totalPrice?.toFixed(2) || '0.00'}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="8" style="text-align: center; padding: 40px;">No items found</td></tr>'}
                </tbody>
              </table>

              <!-- Totals Section -->
              <div class="totals-section">
                <div class="totals-table">
                  <div class="total-line">
                    <span>Subtotal:</span>
                    <span>₹${invoiceData.totalAmount ? (invoiceData.totalAmount - invoiceData.tax).toFixed(2) : '0.00'}</span>
                  </div>
                  <div class="total-line">
                    <span>Tax:</span>
                    <span>₹${invoiceData.tax?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div class="total-line">
                    <span>Discount:</span>
                    <span>₹${invoiceData.discount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div class="total-line grand-total">
                    <span>Total Amount:</span>
                    <span>₹${invoiceData.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div class="total-line">
                    <span>Amount Paid:</span>
                    <span>₹${invoiceData.amountPaid?.toFixed(2) || '0.00'}</span>
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
                  ${invoiceData.signature ? 
                    `<img src="${invoiceData.signature}" alt="Signature" style="max-width: 150px; max-height: 60px; margin: 0 auto 10px;">` : 
                    '<div class="signature-line"></div>'
                  }
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
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
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
                  <TableHead>Shop</TableHead>
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
                        <div className="font-medium">{invoice.shop?.name || 'Unknown Shop'}</div>
                        <div className="text-sm text-muted-foreground">{invoice.shop?.place || 'Unknown Location'}</div>
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
                        <Link href={`/invoices/edit/${invoice.invoiceId}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice.invoiceId)}
                          disabled={deleteInvoiceMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
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
            <DialogTitle>Invoice Preview - #{selectedInvoice?.invoiceNo}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6 p-6 bg-white text-black border rounded-lg">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-black">{selectedInvoice.shop?.name}</h2>
                  <p className="text-gray-600">{selectedInvoice.shop?.place}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-bold text-black">INVOICE</h3>
                  <p className="text-gray-600">#{selectedInvoice.invoiceNo}</p>
                  <p className="text-gray-600">{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-black mb-2">Payment Details:</h4>
                  <p className="text-gray-600">Status: {selectedInvoice.paymentStatus}</p>
                  <p className="text-gray-600">Mode: {selectedInvoice.paymentMode}</p>
                  <p className="text-gray-600">Type: {selectedInvoice.billType} {selectedInvoice.saleType}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold text-black mb-4">Items:</h4>
                <div className="border border-black rounded">
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
                      {selectedInvoice.saleItems?.map((item, index) => (
                        <tr key={index}>
                          <td className="border-b border-black p-2 text-black">{item.product?.name || 'Product'}</td>
                          <td className="border-b border-black p-2 text-right text-black">{item.quantity}</td>
                          <td className="border-b border-black p-2 text-right text-black">₹{item.unitPrice?.toFixed(2) || '0.00'}</td>
                          <td className="border-b border-black p-2 text-right text-black">₹{item.totalPrice?.toFixed(2) || '0.00'}</td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={4} className="text-center p-4 text-gray-500">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between text-black">
                    <span>Total Amount:</span>
                    <span>₹{selectedInvoice.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>Amount Paid:</span>
                    <span>₹{selectedInvoice.amountPaid?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-black border-t pt-2">
                    <span>Balance:</span>
                    <span>₹{((selectedInvoice.totalAmount || 0) - (selectedInvoice.amountPaid || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer with signature */}
              <div className="mt-8 pt-6 border-t">
                <div className="flex justify-end">
                  <div className="text-center">
                    {selectedInvoice.signature && (
                      <img 
                        src={selectedInvoice.signature} 
                        alt="Signature" 
                        className="max-w-[150px] max-h-[60px] mx-auto mb-2"
                      />
                    )}
                    <div className="border-t-2 border-black w-32 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">{selectedInvoice.shop?.name}<br />Signature</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}