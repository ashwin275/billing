// Invoice management component with comprehensive billing functionality
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FileText, Plus, Trash2, Download, Search, Eye, Edit,
  Calculator, Receipt, Users, Store, ArrowUpDown, ArrowUp, ArrowDown,
  Calendar, CreditCard, DollarSign, Package, X
} from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

import { invoicesApi, customersApi, shopsApi, productsApi, handleApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Invoice, Customer, Shop, Product, InvoiceInput, SaleItemInput } from "@/types/api";

// Form validation schema for invoices
const invoiceSchema = z.object({
  customerId: z.number().min(1, "Please select a customer"),
  shopId: z.number().min(1, "Please select a shop"),
  discount: z.number().min(0, "Discount cannot be negative"),
  amountPaid: z.number().min(0, "Amount paid cannot be negative"),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER']),
  paymentStatus: z.enum(['PAID', 'PENDING', 'OVERDUE']),
  remark: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  billType: z.enum(['GST', 'NON_GST']),
  saleType: z.enum(['RETAIL', 'WHOLESALE']),
  transactionId: z.string().min(1, "Transaction ID is required"),
  saleItems: z.array(z.object({
    productId: z.number().min(1, "Please select a product"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    discount: z.number().min(0, "Discount cannot be negative"),
  })).min(1, "At least one product is required"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoicePreview {
  customer: Customer;
  shop: Shop;
  items: Array<{
    product: Product;
    quantity: number;
    discount: number;
    unitPrice: number;
    totalPrice: number;
    cgst: number;
    sgst: number;
    taxAmount: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

/**
 * InvoiceManagement component for creating and managing invoices
 */
export default function InvoiceManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<InvoicePreview | null>(null);
  const [sortField, setSortField] = useState<keyof Invoice>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for creating invoices
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: 0,
      shopId: 0,
      discount: 0,
      amountPaid: 0,
      paymentMode: 'CASH',
      paymentStatus: 'PAID',
      remark: '',
      dueDate: null,
      billType: 'GST',
      saleType: 'RETAIL',
      transactionId: '',
      saleItems: [{ productId: 0, quantity: 1, discount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "saleItems",
  });

  // Fetch data
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["/api/invoice/all"],
    queryFn: () => invoicesApi.getAllInvoices(),
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customer/all"],
    queryFn: () => customersApi.getAllCustomers(),
  });

  const { data: shops } = useQuery({
    queryKey: ["/api/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products/all"],
    queryFn: () => productsApi.getAllProducts(),
  });

  // Add invoice mutation
  const addInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceInput) => {
      const response = await invoicesApi.addInvoice(invoiceData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "Invoice has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice/all"] });
      setIsCreateDialogOpen(false);
      form.reset();
      // Generate PDF after successful creation
      handleDownloadPDF();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create invoice. Please try again.";
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.detail || errorData.title || errorMessage;
      } else if (error?.detail) {
        errorMessage = error.detail;
      } else if (error?.title) {
        errorMessage = error.title;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to create invoice",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  /**
   * Calculate invoice totals
   */
  const calculateInvoiceTotals = (formData: InvoiceFormData) => {
    if (!customers || !shops || !products) return null;

    const customer = customers.find(c => c.customerId === formData.customerId);
    const shop = shops.find(s => s.shopId === formData.shopId);

    if (!customer || !shop) return null;

    const items = formData.saleItems.map(item => {
      const product = products.find(p => p.productId === item.productId);
      if (!product) return null;

      const unitPrice = formData.saleType === 'RETAIL' ? product.retailRate : product.wholesaleRate;
      const discountedPrice = unitPrice - item.discount;
      const totalPrice = discountedPrice * item.quantity;
      
      const cgst = formData.billType === 'GST' ? (totalPrice * product.cgst) / 100 : 0;
      const sgst = formData.billType === 'GST' ? (totalPrice * product.sgst) / 100 : 0;
      const taxAmount = cgst + sgst;

      return {
        product,
        quantity: item.quantity,
        discount: item.discount,
        unitPrice,
        totalPrice,
        cgst,
        sgst,
        taxAmount,
      };
    }).filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + item!.totalPrice, 0);
    const totalDiscount = formData.discount;
    const totalTax = items.reduce((sum, item) => sum + item!.taxAmount, 0);
    const grandTotal = subtotal + totalTax - totalDiscount;

    return {
      customer,
      shop,
      items: items as any[],
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
    };
  };

  /**
   * Handle form submission
   */
  const onSubmit = (data: InvoiceFormData) => {
    const invoiceInput: InvoiceInput = {
      customerId: data.customerId,
      shopId: data.shopId,
      discount: data.discount,
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      paymentStatus: data.paymentStatus,
      remark: data.remark || '',
      dueDate: data.dueDate || null,
      billType: data.billType,
      saleType: data.saleType,
      transactionId: data.transactionId,
      saleItems: data.saleItems,
    };

    addInvoiceMutation.mutate(invoiceInput);
  };

  /**
   * Handle invoice preview
   */
  const handlePreview = () => {
    const formData = form.getValues();
    const preview = calculateInvoiceTotals(formData);
    if (preview) {
      setInvoicePreview(preview);
      setIsPreviewDialogOpen(true);
    } else {
      toast({
        title: "Preview Error",
        description: "Please select customer, shop, and products to preview.",
        variant: "destructive",
      });
    }
  };

  /**
   * Generate PDF download
   */
  const handleDownloadPDF = () => {
    if (!invoicePreview) return;

    // Create a simple HTML invoice for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoicePreview.shop.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company { font-size: 24px; font-weight: bold; }
          .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          .table th { background-color: #f5f5f5; }
          .totals { margin-top: 20px; text-align: right; }
          .total-row { margin: 5px 0; }
          .grand-total { font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${invoicePreview.shop.name}</div>
          <div>${invoicePreview.shop.place}</div>
        </div>
        
        <div class="details">
          <div>
            <strong>Bill To:</strong><br>
            ${invoicePreview.customer.name}<br>
            ${invoicePreview.customer.place}<br>
            ${invoicePreview.customer.phone}
          </div>
          <div>
            <strong>Invoice #:</strong> INV-${Date.now()}<br>
            <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoicePreview.items.map(item => `
              <tr>
                <td>${item.product.name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unitPrice.toFixed(2)}</td>
                <td>₹${item.discount.toFixed(2)}</td>
                <td>₹${item.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">Subtotal: ₹${invoicePreview.subtotal.toFixed(2)}</div>
          <div class="total-row">Tax: ₹${invoicePreview.totalTax.toFixed(2)}</div>
          <div class="total-row">Discount: ₹${invoicePreview.totalDiscount.toFixed(2)}</div>
          <div class="total-row grand-total">Total: ₹${invoicePreview.grandTotal.toFixed(2)}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.print();
  };

  /**
   * Auto-generate transaction ID
   */
  const generateTransactionId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TXN${timestamp}${random}`;
  };

  // Auto-generate transaction ID when form opens
  useEffect(() => {
    if (isCreateDialogOpen && !form.getValues('transactionId')) {
      form.setValue('transactionId', generateTransactionId());
    }
  }, [isCreateDialogOpen, form]);

  // Filter and sort invoices
  const filteredInvoices = invoices?.filter(invoice =>
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.shop?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === "asc" ? 1 : -1;
    if (bValue == null) return sortDirection === "asc" ? -1 : 1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Pagination
  const totalInvoices = sortedInvoices.length;
  const totalPages = Math.ceil(totalInvoices / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = sortedInvoices.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Invoice Management</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading invoices...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Invoice Management</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive mb-4">Failed to load invoices. Please try again.</p>
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Create Invoice</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Create a professional invoice with automatic calculations and tax handling.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Customer and Shop Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers?.map((customer) => (
                                <SelectItem key={customer.customerId} value={customer.customerId.toString()}>
                                  {customer.name} - {customer.place}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shopId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select shop" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {shops?.map((shop) => (
                                <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                                  {shop.name} - {shop.place}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Invoice Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="billType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bill Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GST">GST Bill</SelectItem>
                              <SelectItem value="NON_GST">Non-GST Bill</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="saleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="RETAIL">Retail</SelectItem>
                              <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transactionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Auto-generated" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Products Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Products</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ productId: 0, quantity: 1, discount: 0 })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </div>

                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                        <FormField
                          control={form.control}
                          name={`saleItems.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map((product) => (
                                    <SelectItem key={product.productId} value={product.productId.toString()}>
                                      {product.name} - ₹{product.retailRate}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`saleItems.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`saleItems.${index}.discount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount (₹)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Mode</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CASH">Cash</SelectItem>
                              <SelectItem value="CARD">Card</SelectItem>
                              <SelectItem value="UPI">UPI</SelectItem>
                              <SelectItem value="CHEQUE">Cheque</SelectItem>
                              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PAID">Paid</SelectItem>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="OVERDUE">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Discount (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amountPaid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Paid (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="remark"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePreview}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    
                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        disabled={addInvoiceMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addInvoiceMutation.isPending}>
                        {addInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Statistics Badges */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
            {totalInvoices} of {invoices?.length || 0} Total
          </Badge>
          <Badge variant="default" className="text-xs sm:text-sm px-2 py-1 bg-green-600">
            {invoices?.filter(invoice => invoice.paymentStatus === 'PAID').length || 0} Paid
          </Badge>
          <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1">
            {invoices?.filter(invoice => invoice.paymentStatus === 'PENDING').length || 0} Pending
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
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Shop</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentInvoices.length === 0 ? (
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
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{invoice.invoiceNumber || 'N/A'}</div>
                        <div className="text-sm text-slate-600">{invoice.transactionId || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{invoice.customer?.name || 'Unknown Customer'}</div>
                        <div className="text-sm text-slate-600">{invoice.customer?.place || 'Unknown Location'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="font-medium">{invoice.shop?.name || 'Unknown Shop'}</div>
                        <div className="text-sm text-slate-600">{invoice.shop?.place || 'Unknown Location'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">₹{invoice.totalAmount?.toFixed(2) || '0.00'}</div>
                        <div className="text-sm text-slate-600">{invoice.paymentMode || 'N/A'}</div>
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
                          onClick={handleDownloadPDF}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalInvoices > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 border-t">
              <div className="text-xs sm:text-sm text-slate-700 text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, totalInvoices)} of {totalInvoices} invoices
              </div>
              <Pagination>
                <PaginationContent className="flex-wrap justify-center">
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={cn(
                        currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer",
                        "text-xs sm:text-sm"
                      )}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + Math.max(1, currentPage - 2);
                    return page <= totalPages ? (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer text-xs sm:text-sm min-w-8 h-8"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ) : null;
                  })}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={cn(
                        currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer",
                        "text-xs sm:text-sm"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          
          {invoicePreview && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold">{invoicePreview.shop.name}</h2>
                <p className="text-slate-600">{invoicePreview.shop.place}</p>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                  <p>{invoicePreview.customer.name}</p>
                  <p>{invoicePreview.customer.place}</p>
                  <p>{invoicePreview.customer.phone}</p>
                </div>
                <div className="text-right">
                  <p><strong>Invoice #:</strong> INV-{Date.now()}</p>
                  <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicePreview.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell>₹{item.totalPrice.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-2 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{invoicePreview.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>₹{invoicePreview.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>₹{invoicePreview.totalDiscount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{invoicePreview.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}