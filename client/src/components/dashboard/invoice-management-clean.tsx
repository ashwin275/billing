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
  const handleDownload = async (invoice: Invoice) => {
    const { jsPDF } = await import('jspdf');
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(invoice.shop?.name || "Shop Name", 20, 20);
    doc.setFontSize(12);
    doc.text(invoice.shop?.place || "Shop Address", 20, 30);
    
    doc.setFontSize(16);
    doc.text("INVOICE", 150, 20);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoiceNo}`, 150, 30);
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 150, 35);
    
    // Customer Details (placeholder as we don't have customer data in invoice object)
    doc.setFontSize(12);
    doc.text("Bill To:", 20, 50);
    doc.setFontSize(10);
    doc.text("Customer Name", 20, 60);
    doc.text("Customer Address", 20, 65);
    doc.text("Customer Phone", 20, 70);
    
    // Payment Details
    doc.text("Payment Details:", 120, 50);
    doc.text(`Status: ${invoice.paymentStatus}`, 120, 60);
    doc.text(`Mode: ${invoice.paymentMode}`, 120, 65);
    doc.text(`Type: ${invoice.billType} ${invoice.saleType}`, 120, 70);
    
    // Items Table Header
    let yPos = 90;
    doc.setFontSize(10);
    doc.text("Product", 20, yPos);
    doc.text("Qty", 80, yPos);
    doc.text("Rate", 100, yPos);
    doc.text("Discount", 130, yPos);
    doc.text("Total", 160, yPos);
    doc.line(20, yPos + 2, 180, yPos + 2);
    
    // Items
    yPos += 10;
    if (invoice.saleItems) {
      invoice.saleItems.forEach((item) => {
        doc.text(item.product?.name || "Product", 20, yPos);
        doc.text(item.quantity.toString(), 80, yPos);
        doc.text(`₹${item.unitPrice?.toFixed(2)}`, 100, yPos);
        doc.text(`₹${item.discount?.toFixed(2)}`, 130, yPos);
        doc.text(`₹${item.totalPrice?.toFixed(2)}`, 160, yPos);
        yPos += 8;
      });
    }
    
    // Line before totals
    doc.line(20, yPos, 180, yPos);
    yPos += 10;
    
    // Totals
    doc.text(`Total Amount: ₹${invoice.totalAmount?.toFixed(2)}`, 120, yPos);
    yPos += 8;
    doc.text(`Tax: ₹${invoice.tax?.toFixed(2)}`, 120, yPos);
    yPos += 8;
    doc.text(`Discount: -₹${invoice.discount?.toFixed(2)}`, 120, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.text(`Grand Total: ₹${invoice.totalAmount?.toFixed(2)}`, 120, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Amount Paid: ₹${(invoice.amountPaid || 0).toFixed(2)}`, 120, yPos);
    
    // Terms and Conditions
    yPos += 20;
    doc.setFontSize(10);
    doc.text("Terms and Conditions:", 20, yPos);
    yPos += 8;
    doc.setFontSize(8);
    doc.text("1. Payment is due within 30 days of invoice date.", 20, yPos);
    yPos += 5;
    doc.text("2. Late payments may incur additional charges.", 20, yPos);
    yPos += 5;
    doc.text("3. Goods once sold cannot be returned without prior approval.", 20, yPos);
    yPos += 5;
    doc.text("4. Any disputes must be resolved within 7 days of delivery.", 20, yPos);
    
    // Remarks
    if (invoice.remark) {
      yPos += 15;
      doc.setFontSize(10);
      doc.text("Remarks:", 20, yPos);
      yPos += 8;
      doc.setFontSize(8);
      doc.text(invoice.remark, 20, yPos);
    }
    
    doc.save(`invoice-${invoice.invoiceNo}.pdf`);
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