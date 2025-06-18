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
  FormDescription,
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
import { Invoice, Customer, Shop, Product, InvoiceInput, SaleItemInput, CustomerInput } from "@/types/api";

// Customer form validation schema
const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  place: z.string().min(1, "Place is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  shopId: z.number().min(1, "Please select a shop"),
});

type CustomerFormData = z.infer<typeof customerSchema>;

// Form validation schema for invoices
const invoiceSchema = z.object({
  customerId: z.number().min(1, "Please select a customer"),
  shopId: z.number().min(1, "Please select a shop"),
  discount: z.number().min(0, "Discount cannot be negative"),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']),
  amountPaid: z.number().min(0, "Amount paid cannot be negative"),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER']),
  paymentStatus: z.enum(['PAID', 'PENDING', 'OVERDUE']),
  remark: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  billType: z.enum(['GST', 'NON_GST']),
  saleType: z.enum(['RETAIL', 'WHOLESALE']),
  transactionId: z.string().min(1, "Transaction ID is required"),
  termsAndConditions: z.string().optional(),
  signatureType: z.enum(['NONE', 'IMAGE', 'DIGITAL']).optional(),
  signatureData: z.string().optional(),
  useCustomBillingAddress: z.boolean().optional(),
  customBillingAddress: z.string().optional(),
  saleItems: z.array(z.object({
    productId: z.number().min(1, "Please select a product"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    discount: z.number().min(0, "Discount cannot be negative"),
    discountType: z.enum(['PERCENTAGE', 'AMOUNT']),
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
    discountType: 'PERCENTAGE' | 'AMOUNT';
    discountAmount: number;
    unitPrice: number;
    lineTotal: number;
    cgst: number;
    sgst: number;
    cgstAmount: number;
    sgstAmount: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  dueDate?: string | null;
  termsAndConditions?: string;
  signatureType?: 'NONE' | 'IMAGE' | 'DIGITAL';
  signatureData?: string;
  useCustomBillingAddress?: boolean;
  customBillingAddress?: string;
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
  const [sortField, setSortField] = useState<keyof Invoice>("invoiceDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for adding customers
  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      place: "",
      phone: "",
      shopId: 0,
    },
  });

  // Form for creating invoices
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: 0,
      shopId: 0,
      discount: 0,
      discountType: 'AMOUNT',
      amountPaid: 0,
      paymentMode: 'CASH',
      paymentStatus: 'PAID',
      remark: '',
      dueDate: null,
      billType: 'GST',
      saleType: 'RETAIL',
      transactionId: '',
      termsAndConditions: '',
      signatureType: 'NONE',
      signatureData: '',
      useCustomBillingAddress: false,
      customBillingAddress: '',
      saleItems: [{ productId: 0, quantity: 1, discount: 0, discountType: 'AMOUNT' }],
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

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerInput) => {
      const response = await customersApi.addCustomer(customerData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Customer added",
        description: "Customer has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/all"] });
      setIsAddCustomerDialogOpen(false);
      customerForm.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add customer. Please try again.";
      
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
        title: "Failed to add customer",
        description: errorMessage,
        variant: "destructive",
      });
    },
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
      // PDF will be generated on demand from the table
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
   * Calculate invoice totals with detailed product-wise breakdown
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
      
      // Calculate discount amount based on type
      let discountAmount = 0;
      if (item.discountType === 'PERCENTAGE') {
        discountAmount = (unitPrice * item.discount) / 100;
      } else {
        discountAmount = item.discount;
      }
      
      const discountedPrice = unitPrice - discountAmount;
      const lineTotal = discountedPrice * item.quantity;
      
      // Calculate CGST and SGST from product data
      const cgstRate = formData.billType === 'GST' ? product.cgst : 0;
      const sgstRate = formData.billType === 'GST' ? product.sgst : 0;
      
      const cgstAmount = (lineTotal * cgstRate) / 100;
      const sgstAmount = (lineTotal * sgstRate) / 100;
      const taxAmount = cgstAmount + sgstAmount;
      const totalPrice = lineTotal + taxAmount;

      return {
        product,
        quantity: item.quantity,
        discount: item.discount,
        discountType: item.discountType,
        discountAmount,
        unitPrice,
        lineTotal,
        cgst: cgstRate,
        sgst: sgstRate,
        cgstAmount,
        sgstAmount,
        taxAmount,
        totalPrice,
      };
    }).filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + item!.lineTotal, 0);
    const totalTax = items.reduce((sum, item) => sum + item!.taxAmount, 0);
    
    // Calculate overall discount
    let totalDiscount = 0;
    if (formData.discountType === 'PERCENTAGE') {
      totalDiscount = (subtotal * formData.discount) / 100;
    } else {
      totalDiscount = formData.discount;
    }
    
    const grandTotal = subtotal + totalTax - totalDiscount;

    return {
      customer,
      shop,
      items: items as any[],
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      dueDate: formData.dueDate,
      termsAndConditions: formData.termsAndConditions,
      signatureType: formData.signatureType,
      signatureData: formData.signatureData,
      useCustomBillingAddress: formData.useCustomBillingAddress,
      customBillingAddress: formData.customBillingAddress,
    };
  };

  /**
   * Handle customer form submission
   */
  const onAddCustomer = (data: CustomerFormData) => {
    const customerInput: CustomerInput = {
      name: data.name,
      place: data.place,
      phone: data.phone,
      shopId: data.shopId,
    };

    addCustomerMutation.mutate(customerInput);
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
   * Generate PDF download for invoice
   */
  const handleDownloadPDF = async (invoice: Invoice) => {
    // Get customer data first
    const customer = customers?.find(c => c.customerId === invoice.customerId);
    
    // Create a detailed HTML invoice for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoice.invoiceNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company { font-size: 28px; font-weight: bold; color: #333; }
          .company-details { font-size: 14px; color: #666; margin-top: 10px; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .billing-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .billing-box { width: 45%; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table th, .table td { padding: 12px 8px; border: 1px solid #ddd; text-align: left; }
          .table th { background-color: #f8f9fa; font-weight: bold; }
          .table td { vertical-align: top; }
          .totals { margin-top: 20px; text-align: right; width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; }
          .subtotal { border-top: 1px solid #ddd; padding-top: 8px; }
          .grand-total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 8px; }
          .tax-breakdown { font-size: 14px; color: #666; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          .payment-info { margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${invoice.shop?.name || 'Shop Name'}</div>
          <div class="company-details">
            ${invoice.shop?.place || 'Location'}<br>
            ${invoice.shop?.owner?.phone || 'Phone'} | ${invoice.shop?.owner?.email || 'Email'}
          </div>
        </div>
        
        <div class="invoice-info">
          <div>
            <strong>Invoice #:</strong> ${invoice.invoiceNo}<br>
            <strong>Date:</strong> ${invoice.invoiceDate}<br>
            <strong>Sales ID:</strong> ${invoice.salesId}
          </div>
          <div>
            <strong>Payment Mode:</strong> ${invoice.paymentMode}<br>
            <strong>Status:</strong> ${invoice.paymentStatus}<br>
            ${invoice.dueDate ? `<strong>Due Date:</strong> ${invoice.dueDate}<br>` : ''}
          </div>
        </div>

        <div class="billing-section">
          <div class="billing-box">
            <strong>Bill To:</strong><br>
            ${customer ? `
              ${customer.name}<br>
              ${customer.place}<br>
              Phone: ${customer.phone}
            ` : `
              Customer ID: ${invoice.customerId}<br>
              Address: Not Available
            `}
          </div>
          <div class="billing-box">
            <strong>Bill From:</strong><br>
            ${invoice.shop?.name || 'Shop Name'}<br>
            ${invoice.shop?.place || 'Location'}<br>
            ${invoice.shop?.owner?.phone || 'Phone'}
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>HSN</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>CGST</th>
              <th>SGST</th>
              <th>Tax</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="8" style="text-align: center; padding: 20px; color: #666;">
                Product details not available in current invoice data
              </td>
            </tr>
          </tbody>
        </table>

        <div class="payment-info">
          <strong>Remarks:</strong> ${invoice.remark || 'No remarks'}
        </div>

        <div class="totals">
          <div class="total-row subtotal">
            <span>Subtotal:</span>
            <span>₹${(invoice.totalAmount - invoice.tax).toFixed(2)}</span>
          </div>
          <div class="total-row tax-breakdown">
            <span>Tax:</span>
            <span>₹${invoice.tax.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Discount:</span>
            <span>₹${invoice.discount.toFixed(2)}</span>
          </div>
          <div class="total-row grand-total">
            <span>Grand Total:</span>
            <span>₹${invoice.totalAmount.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Amount Paid:</span>
            <span>₹${invoice.amountPaid?.toFixed(2) || '0.00'}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
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
    invoice.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.shop?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.remark?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.paymentMode?.toLowerCase().includes(searchTerm.toLowerCase())
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
                          <Select onValueChange={(value) => {
                            if (value === "add_new") {
                              setIsAddCustomerDialogOpen(true);
                            } else {
                              field.onChange(parseInt(value));
                            }
                          }} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Customer
                              </SelectItem>
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
                        onClick={() => append({ productId: 0, quantity: 1, discount: 0, discountType: 'AMOUNT' })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </div>

                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
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
                                      {product.name} - ₹{product.retailRate} (CGST: {product.cgst}%, SGST: {product.sgst}%)
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
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                      field.onChange('');
                                    } else {
                                      field.onChange(parseInt(value) || 1);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`saleItems.${index}.discountType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="AMOUNT">Amount (₹)</SelectItem>
                                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`saleItems.${index}.discount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Discount {form.watch(`saleItems.${index}.discountType`) === 'PERCENTAGE' ? '(%)' : '(₹)'}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                      field.onChange('');
                                    } else {
                                      field.onChange(parseFloat(value) || 0);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex flex-col justify-end space-y-2">
                          {products && form.watch(`saleItems.${index}.productId`) && (
                            <div className="text-xs text-muted-foreground">
                              {(() => {
                                const product = products.find(p => p.productId === form.watch(`saleItems.${index}.productId`));
                                return product ? `CGST: ${product.cgst}% | SGST: ${product.sgst}%` : '';
                              })()}
                            </div>
                          )}
                        </div>

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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overall Discount Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AMOUNT">Amount (₹)</SelectItem>
                              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Overall Discount {form.watch('discountType') === 'PERCENTAGE' ? '(%)' : '(₹)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange('');
                                } else {
                                  field.onChange(parseFloat(value) || 0);
                                }
                              }}
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
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange('');
                                } else {
                                  field.onChange(parseFloat(value) || 0);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Due Date */}
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Billing Address Options */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="useCustomBillingAddress"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded border border-input"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Use Custom Billing Address</FormLabel>
                            <FormDescription>
                              Check this to use a different billing address instead of the shop address
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch('useCustomBillingAddress') && (
                      <FormField
                        control={form.control}
                        name="customBillingAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Billing Address</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter the billing address for this invoice..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Terms and Conditions */}
                  <FormField
                    control={form.control}
                    name="termsAndConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms and Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter terms and conditions for this invoice..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Signature Options */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="signatureType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Signature</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">No Signature</SelectItem>
                              <SelectItem value="IMAGE">Upload Image</SelectItem>
                              <SelectItem value="DIGITAL">Digital Signature</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('signatureType') === 'IMAGE' && (
                      <FormField
                        control={form.control}
                        name="signatureData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Upload Signature Image</FormLabel>
                            <FormControl>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      field.onChange(e.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch('signatureType') === 'DIGITAL' && (
                      <FormField
                        control={form.control}
                        name="signatureData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Digital Signature</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your signature text or draw your signature using text characters..."
                                className="min-h-[120px] font-mono text-lg"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              You can type your name, create ASCII art signature, or use special characters for your digital signature
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
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
                        <div className="font-medium">{invoice.invoiceNo || 'N/A'}</div>
                        <div className="text-sm text-slate-600">{invoice.invoiceDate || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">Customer ID: {invoice.customerId}</div>
                        <div className="text-sm text-slate-600">{invoice.remark || 'No remarks'}</div>
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
                          onClick={(e) => {
                            e.preventDefault();
                            handleDownloadPDF(invoice);
                          }}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-600">Invoice Preview</DialogTitle>
          </DialogHeader>
          
          {invoicePreview && (
            <div className="space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
              {/* Header */}
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-800">{invoicePreview.shop.name}</h2>
                  <div className="mt-2 text-gray-600">
                    {invoicePreview.useCustomBillingAddress && invoicePreview.customBillingAddress ? (
                      <div className="whitespace-pre-wrap">{invoicePreview.customBillingAddress}</div>
                    ) : (
                      <p>{invoicePreview.shop.place}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                  <h3 className="font-semibold mb-2 text-green-800">Bill To:</h3>
                  <p className="text-green-700 font-medium">{invoicePreview.customer.name}</p>
                  <p className="text-green-600">{invoicePreview.customer.place}</p>
                  <p className="text-green-600">{invoicePreview.customer.phone}</p>
                </div>
                <div className="bg-blue-600 text-white p-4 rounded-lg text-right">
                  <p className="text-xl font-bold mb-2">INVOICE</p>
                  <p><strong>Invoice #:</strong> INV-{Date.now().toString().slice(-6)}</p>
                  <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <TableHead className="text-white font-semibold">Product</TableHead>
                      <TableHead className="text-white font-semibold">HSN</TableHead>
                      <TableHead className="text-white font-semibold">Qty</TableHead>
                      <TableHead className="text-white font-semibold">Rate</TableHead>
                      <TableHead className="text-white font-semibold">Discount</TableHead>
                      <TableHead className="text-white font-semibold">CGST</TableHead>
                      <TableHead className="text-white font-semibold">SGST</TableHead>
                      <TableHead className="text-white font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicePreview.items.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-800">{item.product.name}</div>
                            <div className="text-xs text-gray-500">{item.product.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-blue-600 font-medium">{item.product.hsn}</TableCell>
                        <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-green-600 font-medium">₹{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="text-orange-600 font-medium">₹{item.discountAmount.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              {item.discountType === 'PERCENTAGE' ? `${item.discount}%` : 'Amount'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-purple-600 font-medium">₹{item.cgstAmount.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{item.cgst}%</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-pink-600 font-medium">₹{item.sgstAmount.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{item.sgst}%</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-lg text-blue-800">₹{item.totalPrice.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="bg-white p-6 rounded-lg shadow-sm space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Subtotal:</span>
                  <span className="text-green-600 font-semibold">₹{invoicePreview.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Total CGST:</span>
                  <span className="text-purple-600 font-semibold">₹{invoicePreview.items.reduce((sum, item) => sum + item.cgstAmount, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Total SGST:</span>
                  <span className="text-pink-600 font-semibold">₹{invoicePreview.items.reduce((sum, item) => sum + item.sgstAmount, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Total Tax:</span>
                  <span className="text-indigo-600 font-semibold">₹{invoicePreview.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Overall Discount:</span>
                  <span className="text-orange-600 font-semibold">₹{invoicePreview.totalDiscount.toFixed(2)}</span>
                </div>
                <Separator className="bg-gradient-to-r from-blue-400 to-purple-400 h-1" />
                <div className="flex justify-between text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded">
                  <span>Grand Total:</span>
                  <span>₹{invoicePreview.grandTotal.toFixed(2)}</span>
                </div>
                {invoicePreview.dueDate && (
                  <div className="flex justify-between text-sm bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                    <span className="font-medium text-yellow-800">Due Date:</span>
                    <span className="text-yellow-700">{invoicePreview.dueDate}</span>
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              {invoicePreview.termsAndConditions && (
                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                  <h4 className="font-semibold mb-2 text-yellow-800">Terms and Conditions:</h4>
                  <p className="text-sm text-yellow-700 whitespace-pre-wrap">
                    {invoicePreview.termsAndConditions}
                  </p>
                </div>
              )}

              {/* Signature */}
              {invoicePreview.signatureType && invoicePreview.signatureType !== 'NONE' && (
                <div className="bg-gray-50 p-6 rounded-lg text-right">
                  <div className="inline-block">
                    <div className="text-sm text-gray-600 mb-4 font-medium">Authorized Signature:</div>
                    {invoicePreview.signatureType === 'IMAGE' && invoicePreview.signatureData && (
                      <img 
                        src={invoicePreview.signatureData} 
                        alt="Signature" 
                        className="max-h-20 border-b-2 border-gray-400"
                      />
                    )}
                    {invoicePreview.signatureType === 'DIGITAL' && (
                      <div className="border-b-2 border-gray-400 pb-2 min-w-[300px] min-h-[80px] text-center font-mono text-lg whitespace-pre-wrap">
                        {invoicePreview.signatureData}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={(e) => {
                  e.preventDefault();
                  // Generate PDF from preview data
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;

                  const previewHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Invoice Preview - ${invoicePreview.shop.name}</title>
                      <style>
                        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        .company { font-size: 28px; font-weight: bold; color: #333; }
                        .company-details { font-size: 14px; color: #666; margin-top: 10px; }
                        .billing-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .billing-box { width: 45%; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .table th, .table td { padding: 12px 8px; border: 1px solid #ddd; text-align: left; }
                        .table th { background-color: #f8f9fa; font-weight: bold; }
                        .totals { margin-top: 20px; text-align: right; width: 300px; margin-left: auto; }
                        .total-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; }
                        .grand-total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 8px; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div class="company">${invoicePreview.shop.name}</div>
                        <div class="company-details">
                          ${invoicePreview.useCustomBillingAddress && invoicePreview.customBillingAddress ? 
                            invoicePreview.customBillingAddress.replace(/\n/g, '<br>') : 
                            invoicePreview.shop.place
                          }
                        </div>
                      </div>
                      
                      <div class="billing-section">
                        <div class="billing-box">
                          <strong>Bill To:</strong><br>
                          ${invoicePreview.customer.name}<br>
                          ${invoicePreview.customer.place}<br>
                          Phone: ${invoicePreview.customer.phone}
                        </div>
                        <div class="billing-box">
                          <strong>Invoice Details:</strong><br>
                          Invoice #: INV-${Date.now().toString().slice(-6)}<br>
                          Date: ${new Date().toLocaleDateString()}<br>
                          Status: Preview
                        </div>
                      </div>

                      <table class="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>HSN</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Discount</th>
                            <th>CGST</th>
                            <th>SGST</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${invoicePreview.items.map(item => `
                            <tr>
                              <td>
                                <div style="font-weight: bold;">${item.product.name}</div>
                                <div style="font-size: 12px; color: #666;">${item.product.description || ''}</div>
                              </td>
                              <td>${item.product.hsn}</td>
                              <td>${item.quantity}</td>
                              <td>₹${item.unitPrice.toFixed(2)}</td>
                              <td>₹${item.discountAmount.toFixed(2)}</td>
                              <td>₹${item.cgstAmount.toFixed(2)}</td>
                              <td>₹${item.sgstAmount.toFixed(2)}</td>
                              <td style="font-weight: bold;">₹${item.totalPrice.toFixed(2)}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>

                      <div class="totals">
                        <div class="total-row">
                          <span>Subtotal:</span>
                          <span>₹${invoicePreview.subtotal.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                          <span>Total CGST:</span>
                          <span>₹${invoicePreview.items.reduce((sum, item) => sum + item.cgstAmount, 0).toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                          <span>Total SGST:</span>
                          <span>₹${invoicePreview.items.reduce((sum, item) => sum + item.sgstAmount, 0).toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                          <span>Total Tax:</span>
                          <span>₹${invoicePreview.totalTax.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                          <span>Overall Discount:</span>
                          <span>₹${invoicePreview.totalDiscount.toFixed(2)}</span>
                        </div>
                        <div class="total-row grand-total">
                          <span>Grand Total:</span>
                          <span>₹${invoicePreview.grandTotal.toFixed(2)}</span>
                        </div>
                        ${invoicePreview.dueDate ? `
                          <div class="total-row" style="font-size: 14px; color: #666;">
                            <span>Due Date:</span>
                            <span>${invoicePreview.dueDate}</span>
                          </div>
                        ` : ''}
                      </div>

                      ${invoicePreview.termsAndConditions ? `
                        <div style="margin-top: 30px;">
                          <h4 style="font-weight: bold; margin-bottom: 10px;">Terms and Conditions:</h4>
                          <p style="font-size: 12px; color: #666; white-space: pre-wrap; line-height: 1.4;">
                            ${invoicePreview.termsAndConditions}
                          </p>
                        </div>
                      ` : ''}

                      ${invoicePreview.signatureType && invoicePreview.signatureType !== 'NONE' ? `
                        <div class="signature-section">
                          <div style="font-size: 14px; color: #333; margin-bottom: 15px; font-weight: bold;">Authorized Signature:</div>
                          ${invoicePreview.signatureType === 'IMAGE' && invoicePreview.signatureData ? `
                            <img src="${invoicePreview.signatureData}" alt="Signature" style="max-height: 60px; border-bottom: 2px solid #333;" />
                          ` : ''}
                          ${invoicePreview.signatureType === 'DIGITAL' && invoicePreview.signatureData ? `
                            <div class="signature-box">
                              ${invoicePreview.signatureData}
                            </div>
                          ` : ''}
                        </div>
                      ` : ''}
                    </body>
                    </html>
                  `;

                  printWindow.document.write(previewHTML);
                  printWindow.document.close();
                  printWindow.print();
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter customer details to add them to your customer list.
            </DialogDescription>
          </DialogHeader>
          <Form {...customerForm}>
            <form onSubmit={customerForm.handleSubmit(onAddCustomer)} className="space-y-4">
              <FormField
                control={customerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customerForm.control}
                name="place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter place" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customerForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customerForm.control}
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
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddCustomerDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCustomerMutation.isPending}>
                  {addCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}