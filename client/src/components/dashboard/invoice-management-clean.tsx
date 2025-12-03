// Invoice Management Component with PDF Generation
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Download, Edit, Trash2, Plus, Search, Filter, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { invoicesApi, shopsApi } from "@/lib/api";
import { Invoice, Shop } from "@/types/api";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";

export default function InvoiceManagementClean() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [searchByPartNumber, setSearchByPartNumber] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Debounce search term for all search types (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, itemsPerPage, searchByPartNumber]);

  // Reset status filter when search is active (backend handles search, not combined with status)
  useEffect(() => {
    if (debouncedSearchTerm && !searchByPartNumber) {
      setStatusFilter("all");
    }
  }, [debouncedSearchTerm, searchByPartNumber]);

  // Fetch paginated invoices from backend (no search)
  const { data: paginatedResponse, isLoading } = useQuery({
    queryKey: ["/api/invoices/paginated", currentPage - 1, itemsPerPage],
    queryFn: () => invoicesApi.getPaginatedInvoices(currentPage - 1, itemsPerPage),
    enabled: !searchByPartNumber && !debouncedSearchTerm, // Disable when searching
  });

  // Fetch invoices with backend search (normal search mode)
  const { data: searchResponse, isLoading: isSearchLoading } = useQuery({
    queryKey: ["/api/invoices/search", debouncedSearchTerm, currentPage - 1, itemsPerPage],
    queryFn: () => invoicesApi.searchInvoices(debouncedSearchTerm, currentPage - 1, itemsPerPage),
    enabled: !searchByPartNumber && debouncedSearchTerm.length > 0, // Only when normal search mode and search term exists
  });

  // Fetch invoices by part number
  const { data: partNumberInvoices = [], isLoading: isPartNumberLoading } = useQuery({
    queryKey: ["/api/invoices/partno", debouncedSearchTerm],
    queryFn: () => invoicesApi.searchByPartNumber(debouncedSearchTerm),
    enabled: searchByPartNumber && debouncedSearchTerm.length > 0, // Only when part number search mode
  });

  // Fetch shops to get fresh shop data with description
  const { data: shops = [] } = useQuery({
    queryKey: ["/api/shops/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Helper function to get shop with description from fresh shops data
  const getShopWithDescription = (invoice: Invoice): Invoice['shop'] => {
    const freshShop = shops.find((s: Shop) => s.shopId === invoice.shopId);
    if (freshShop) {
      return {
        ...invoice.shop,
        description: freshShop.description || invoice.shop?.description,
      };
    }
    return invoice.shop;
  };

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => invoicesApi.deleteInvoice(invoiceId),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/paginated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/partno"] });
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

  // Determine which data source to use based on search mode
  const isNormalSearchActive = !searchByPartNumber && debouncedSearchTerm.length > 0;
  const isPartNumberSearchActive = searchByPartNumber && debouncedSearchTerm.length > 0;
  
  // Get invoices from appropriate source
  const invoices = isNormalSearchActive 
    ? (searchResponse?.content || [])
    : (paginatedResponse?.content || []);
  
  // Get pagination info from appropriate source
  const totalPages = isNormalSearchActive
    ? (searchResponse?.totalPages || 1)
    : (paginatedResponse?.totalPages || 1);
  const totalElements = isNormalSearchActive
    ? (searchResponse?.totalElements || 0)
    : (paginatedResponse?.totalElements || 0);

  // When using part number search, we still need frontend filtering for status
  const filteredPartNumberInvoices = isPartNumberSearchActive 
    ? partNumberInvoices.filter(invoice => {
        const matchesStatus = statusFilter === "all" || 
          invoice.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();
        return matchesStatus;
      })
    : [];

  // Apply frontend status filter only when not using normal search (backend handles that)
  const filteredInvoices = isPartNumberSearchActive
    ? filteredPartNumberInvoices
    : isNormalSearchActive
      ? invoices // Backend already filtered, no frontend filtering needed
      : invoices.filter(invoice => {
          const matchesStatus = statusFilter === "all" || 
            invoice.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();
          return matchesStatus;
        });

  // For part number search, we need frontend pagination
  const paginatedInvoices = isPartNumberSearchActive
    ? filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredInvoices;

  // Calculate total pages based on search mode
  const finalTotalPages = isPartNumberSearchActive
    ? Math.ceil(filteredInvoices.length / itemsPerPage)
    : totalPages;
  
  // Combined loading state
  const isDataLoading = isLoading || isSearchLoading || isPartNumberLoading;

  // Clamp currentPage to finalTotalPages when mode changes
  useEffect(() => {
    setCurrentPage((prev) => {
      if (finalTotalPages < 1) {
        return 1;
      }
      if (prev > finalTotalPages) {
        return finalTotalPages;
      }
      return prev;
    });
  }, [finalTotalPages]);

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

  // Handle edit invoice with fresh data fetch
  const handleEditInvoice = (invoiceId: number) => {
    // Invalidate the specific invoice query to ensure fresh data is fetched
    queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
    // Navigate to create page in edit mode
    setLocation(`/invoices/create?edit=${invoiceId}`);
  };

  // Handle preview - merge fresh shop data with description
  const handlePreview = (invoice: Invoice) => {
    const invoiceWithShopDescription = {
      ...invoice,
      shop: getShopWithDescription(invoice),
    };
    setSelectedInvoice(invoiceWithShopDescription);
    setIsPreviewDialogOpen(true);
  };

  // Generate PDF using the new template system - merge fresh shop data with description
  const handleDownloadPDF = (invoice: Invoice) => {
    const invoiceData = {
      ...invoice,
      shop: getShopWithDescription(invoice),
    };
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
              margin: 15mm 10mm;
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
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
              background: white;
            }
            
            .invoice-header {
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              color: #000000;
              padding: 30px 20px;
              position: relative;
              overflow: hidden;
              page-break-after: avoid;
              page-break-inside: avoid;
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
              overflow: hidden;
            }
            
            .company-logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 6px;
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
              padding: 20px;
            }
            
            .billing-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
              page-break-inside: avoid;
              page-break-after: avoid;
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
              margin-bottom: 15px;
              border-radius: 6px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .items-table thead {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: table-header-group;
            }
            
            .items-table thead tr {
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            
            .items-table th {
              color: #000000;
              font-weight: 600;
              padding: 8px 6px;
              text-align: left;
              font-size: 10px;
              letter-spacing: 0.3px;
            }
            
            .items-table th.text-right {
              text-align: right;
            }
            
            .items-table tbody {
              display: table-row-group;
            }
            
            .items-table tbody tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            .items-table td {
              padding: 6px;
              border-bottom: 1px solid #e2e8f0;
              color: #4a5568;
              font-size: 10px;
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
              margin-top: 15px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            
            .totals-table {
              min-width: 250px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              color: #4a5568;
              font-size: 11px;
            }
            
            .total-row.grand-total {
              border-top: 2px solid #e2e8f0;
              margin-top: 6px;
              padding-top: 8px;
              font-size: 14px;
              font-weight: 700;
              color: #2d3748;
            }
            
            .total-row.balance {
              font-weight: 600;
              font-size: 12px;
            }
            
            .balance.positive {
              color: #e53e3e;
            }
            
            .balance.negative {
              color: #38a169;
            }
            
            .bottom-section {
              margin-top: 20px;
              page-break-inside: avoid;
            }
            
            .terms-section {
              background: #f7fafc;
              padding: 12px;
              border-radius: 6px;
            }
            
            .terms-section h3 {
              color: #2d3748;
              font-size: 13px;
              font-weight: 600;
              margin: 0 0 8px 0;
            }
            
            .terms-section p {
              color: #4a5568;
              font-size: 10px;
              margin: 4px 0;
              line-height: 1.4;
            }
            
            .remarks-section {
              margin-top: 12px;
              padding-top: 8px;
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
              
              .invoice-template {
                page-break-after: auto;
              }
              
              .invoice-header {
                page-break-after: avoid;
                page-break-inside: avoid;
              }
              
              .billing-section {
                page-break-inside: avoid;
                page-break-after: avoid;
              }
              
              .items-table {
                page-break-before: auto;
              }
              
              .items-table thead {
                display: table-header-group;
              }
              
              .items-table tbody tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              .totals-section {
                page-break-inside: avoid;
                page-break-before: avoid;
              }
              
              .bottom-section {
                page-break-inside: avoid;
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
                    ${invoiceData.shop?.logo ? 
                      `<img src="${invoiceData.shop.logo}" alt="${invoiceData.shop.name || 'Shop'} Logo" onerror="this.style.display='none'; this.parentElement.innerHTML='${invoiceData.shop?.name?.charAt(0) || 'S'}'; this.parentElement.style.fontSize='20px'; this.parentElement.style.fontWeight='bold';" />` : 
                      (invoiceData.shop?.name?.charAt(0) || 'S')
                    }
                  </div>
                  <div class="company-details">
                    <h1>${invoiceData.shop?.name || 'Shop Name'}</h1>
                    <p class="company-tagline">${invoiceData.shop?.description || 'Quality Products & Services'}</p>
                    ${invoiceData.shop?.address ? `<p style="font-size: 10px; margin-top: 3px;">${invoiceData.shop.address}</p>` : ''}
                    ${invoiceData.shop?.place ? `<p style="font-size: 10px; margin-top: 2px;">📍 ${invoiceData.shop.place}</p>` : ''}
                    ${invoiceData.shop?.gstNo ? `<p style="font-size: 10px; margin-top: 2px;">GST: ${invoiceData.shop.gstNo}</p>` : ''}
                    ${invoiceData.shop?.phone ? `<p style="font-size: 10px; margin-top: 2px;">📞 ${invoiceData.shop.phone}</p>` : ''}
                  </div>
                </div>
                <div class="invoice-meta">
                  <h2>INVOICE</h2>
                  ${invoiceData.invoiceNo ? `<div class="invoice-number">#${invoiceData.invoiceNo}</div>` : ''}
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
                    ${invoiceData.customerName || invoiceData.customer?.name || 'Walk-in Customer'}
                  </div>
                  <p>Phone: ${invoiceData.customerPhone || invoiceData.customer?.phone || 'N/A'}</p>
                  <p>Location: ${invoiceData.customerLocation || invoiceData.customer?.place || 'N/A'}</p>
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
                        <td class="text-right">
                          <div>${item.product?.cgst || 0}%</div>
                          <div style="font-size: 10px; color: #718096;">₹${((item.price * item.quantity * (item.product?.cgst || 0)) / 100).toFixed(2)}</div>
                        </td>
                        <td class="text-right">
                          <div>${item.product?.sgst || 0}%</div>
                          <div style="font-size: 10px; color: #718096;">₹${((item.price * item.quantity * (item.product?.sgst || 0)) / 100).toFixed(2)}</div>
                        </td>
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
                    <span>₹${(invoiceData.saleItems && invoiceData.saleItems.length > 0 ? 
                      invoiceData.saleItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0) : 0).toFixed(2)}</span>
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
              <div className="flex items-center space-x-2">
                <div className="relative">
                  {searchByPartNumber ? (
                    <Package className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    placeholder={searchByPartNumber ? "Search by part number..." : "Search by invoice # or customer name..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[300px]"
                    data-testid="input-search-invoice"
                  />
                </div>
                <Button
                  variant={searchByPartNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSearchByPartNumber(!searchByPartNumber);
                    setSearchTerm(""); // Clear search term when toggling
                  }}
                  title={searchByPartNumber ? "Switch to normal search" : "Search by part number"}
                  data-testid="button-toggle-search-mode"
                >
                  <Package className="h-4 w-4 mr-1" />
                  {searchByPartNumber ? "Part #" : "Part #"}
                </Button>
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
                disabled={isNormalSearchActive}
              >
                <SelectTrigger className="w-[150px]" title={isNormalSearchActive ? "Status filter disabled during search" : ""}>
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
          {isDataLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading invoices...</span>
            </div>
          ) : (
            <div>
              <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.invoiceId}
                    className={invoice.paymentStatus === "PENDING" ? "bg-orange-50 border-l-4 border-l-orange-400" : ""}
                  >
                    <TableCell className="font-medium">
                      {invoice.invoiceNo}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditInvoice(invoice.invoiceId)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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

          {/* No Results Message - Only show when there are truly no results across all pages */}
          {finalTotalPages < 1 && !isDataLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium">No invoices found</p>
                <p className="text-sm mt-2">
                  {debouncedSearchTerm
                    ? `No invoices match your search "${debouncedSearchTerm}"`
                    : statusFilter !== "all"
                    ? `No invoices found with status "${statusFilter}"`
                    : "No invoices available"}
                </p>
              </div>
            </div>
          )}

          {/* Enhanced Pagination - Show whenever there are pages to navigate */}
          {finalTotalPages >= 1 && (
            <div className="flex flex-col items-center gap-4 px-4 py-6 border-t bg-white dark:bg-slate-950">
              {/* Results Info */}
              <div className="text-sm text-slate-700 dark:text-slate-300">
                {isNormalSearchActive ? (
                  <>Found {totalElements} results for "{debouncedSearchTerm}" (Page {currentPage} of {finalTotalPages})</>
                ) : isPartNumberSearchActive ? (
                  <>Found {filteredInvoices.length} results for part # "{debouncedSearchTerm}" (Page {currentPage} of {finalTotalPages})</>
                ) : (
                  <>{totalElements} invoices (Page {currentPage} of {finalTotalPages})</>
                )}
              </div>
              
              {/* Enhanced Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Page Navigation */}
                <Pagination>
                  <PaginationContent className="gap-1">
                    {/* First Page */}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(1)}
                        className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"} transition-colors px-3 py-2`}
                        size="default"
                      >
                        First
                      </PaginationLink>
                    </PaginationItem>
                    
                    {/* Previous */}
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"} transition-colors`}
                      />
                    </PaginationItem>
                    
                    {/* Page Numbers with Smart Display */}
                    {(() => {
                      const getVisiblePages = () => {
                        if (finalTotalPages <= 7) {
                          return Array.from({ length: finalTotalPages }, (_, i) => i + 1);
                        }
                        
                        if (currentPage <= 4) {
                          return [1, 2, 3, 4, 5, '...', finalTotalPages];
                        }
                        
                        if (currentPage >= finalTotalPages - 3) {
                          return [1, '...', finalTotalPages - 4, finalTotalPages - 3, finalTotalPages - 2, finalTotalPages - 1, finalTotalPages];
                        }
                        
                        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', finalTotalPages];
                      };
                      
                      return getVisiblePages().map((page, index) => (
                        <PaginationItem key={`${page}-${index}`}>
                          {page === '...' ? (
                            <span className="flex items-center justify-center w-10 h-10 text-slate-500">...</span>
                          ) : (
                            <PaginationLink
                              onClick={() => setCurrentPage(Number(page))}
                              isActive={currentPage === page}
                              className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[40px] justify-center"
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ));
                    })()}
                    
                    {/* Next */}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(Math.min(finalTotalPages, currentPage + 1))}
                        className={`${currentPage === finalTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"} transition-colors`}
                      />
                    </PaginationItem>
                    
                    {/* Last Page */}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(finalTotalPages)}
                        className={`${currentPage === finalTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"} transition-colors px-3 py-2`}
                        size="default"
                      >
                        Last
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                
                {/* Direct Page Jump */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Go to:</span>
                  <Input
                    type="number"
                    min="1"
                    max={Math.max(1, finalTotalPages)}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (!isNaN(page)) {
                        // Clamp to valid range
                        const clampedPage = Math.max(1, Math.min(Math.max(1, finalTotalPages), page));
                        setCurrentPage(clampedPage);
                      }
                    }}
                    className="w-16 h-8 text-center text-sm"
                    disabled={finalTotalPages < 1}
                  />
                  <span className="text-slate-600 dark:text-slate-400">of {Math.max(1, finalTotalPages)}</span>
                </div>
                
                {/* Items Per Page */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    const newItemsPerPage = parseInt(value);
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1); // Reset to first page when changing items per page
                  }}>
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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