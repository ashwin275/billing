// Invoice creation page with direct editing layout
// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Save, Eye, Download, FileText, User, Building2, Calendar, CreditCard, Percent, Hash, Phone, MapPin, Package } from "lucide-react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProductSearchDialog } from "@/components/ui/product-search-dialog";
import { CustomerSearchDialog } from "@/components/ui/customer-search-dialog";

import { useToast } from "@/hooks/use-toast";

import { productsApi, customersApi, shopsApi, invoicesApi } from "@/lib/api";
import { Product, Customer, Shop, InvoiceInput } from "@/types/api";

// Validation schemas
const saleItemSchema = z.object({
  productId: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  discount: z.number().min(0, "Discount cannot be negative"),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).default("AMOUNT"),
  unitPrice: z.number().min(0, "Unit price cannot be negative")
});

const invoiceSchema = z.object({
  customerId: z.number().min(1, "Customer is required"),
  shopId: z.number().min(1, "Shop is required"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).default("PERCENTAGE"),
  additionalDiscount: z.number().min(0, "Additional discount cannot be negative").default(0),
  additionalDiscountType: z.enum(["PERCENTAGE", "AMOUNT"]).default("AMOUNT"),
  amountPaid: z.number().min(0, "Amount paid cannot be negative").default(0),
  paymentMode: z.enum(["CASH", "CARD", "UPI", "CHEQUE", "BANK_TRANSFER"]).default("CASH"),
  paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE"]).default("PAID"),
  remark: z.string().default(""),
  dueDate: z.string().nullable().default(null),
  invoiceDate: z.string(),
  transactionId: z.string().min(1, "Transaction ID is required"),
  saleItems: z.array(saleItemSchema).min(1, "At least one item is required")
});

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.number().min(1000000000, "Phone number must be 10 digits").max(9999999999, "Phone number must be 10 digits"),
  place: z.string().min(1, "Address is required")
});

type FormData = z.infer<typeof invoiceSchema>;
type CustomerFormData = z.infer<typeof customerSchema>;

export default function CreateInvoice() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if we're in edit mode
  const searchParams = new URLSearchParams(window.location.search);
  const editInvoiceId = searchParams.get('edit');
  const isEditMode = !!editInvoiceId;
  
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isCustomerSearchDialogOpen, setIsCustomerSearchDialogOpen] = useState(false);
  const [isProductSearchDialogOpen, setIsProductSearchDialogOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdInvoiceData, setCreatedInvoiceData] = useState<any>(null);
  const [currentTotals, setCurrentTotals] = useState({
    subtotal: 0,
    totalDiscounts: 0,
    totalTax: 0,
    grandTotal: 0,
    itemDiscounts: 0,
    additionalDiscountAmount: 0
  });

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: 0,
      shopId: 0,
      discount: 0,
      discountType: "PERCENTAGE",
      additionalDiscount: 0,
      additionalDiscountType: "AMOUNT",
      amountPaid: 0,
      paymentMode: "CASH",
      paymentStatus: "PAID",
      remark: "",
      dueDate: null,
      invoiceDate: new Date().toISOString().split('T')[0],
      transactionId: `TXN${Date.now()}`,
      saleItems: [
        {
          productId: 0,
          quantity: 1,
          discount: 0,
          discountType: "AMOUNT",
          unitPrice: 0
        }
      ]
    }
  });

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: 0,
      place: ""
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "saleItems"
  });

  // API queries
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    select: (data: any) => Array.isArray(data) ? data : []
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],  
    select: (data: any) => Array.isArray(data) ? data : []
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["/api/shops"],
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceInput) => invoicesApi.create(data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      // Store created invoice data for PDF generation
      const customer = customers.find(c => c.customerId === variables.customerId);
      const shop = shops.find(s => s.shopId === variables.shopId);
      const totals = calculateTotals();
      
      setCreatedInvoiceData({
        customer,
        shop,
        totals,
        formData: variables
      });

      toast({
        title: "Success",
        description: "Invoice created successfully",
        variant: "default"
      });

      setShowSuccessDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive"
      });
    }
  });

  const addCustomerMutation = useMutation({
    mutationFn: (data: CustomerFormData) => customersApi.create(data),
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSelectedCustomer(newCustomer);
      form.setValue('customerId', newCustomer.customerId);
      setIsAddCustomerDialogOpen(false);
      customerForm.reset();
      toast({
        title: "Success",
        description: "Customer added successfully",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
        variant: "destructive"
      });
    }
  });

  // Calculate totals with additional discount included
  const calculateTotals = () => {
    const formData = form.getValues();
    const items = formData.saleItems;
    
    let subtotal = 0;
    let itemDiscounts = 0;
    let totalTax = 0;

    items.forEach((item, index) => {
      const product = products.find(p => p.productId === item.productId);
      if (!product) return;

      const basePrice = item.unitPrice * item.quantity;
      let discountAmount = 0;

      if (item.discountType === "PERCENTAGE") {
        discountAmount = (basePrice * item.discount) / 100;
      } else {
        discountAmount = item.discount;
      }

      const itemTotal = basePrice - discountAmount;
      const tax = itemTotal * 0.18; // 18% GST

      subtotal += itemTotal;
      itemDiscounts += discountAmount;
      totalTax += tax;
    });

    // Calculate additional discount amount
    let additionalDiscountAmount = 0;
    if (formData.additionalDiscountType === "PERCENTAGE") {
      additionalDiscountAmount = (subtotal * formData.additionalDiscount) / 100;
    } else {
      additionalDiscountAmount = formData.additionalDiscount;
    }

    const totalDiscounts = itemDiscounts + additionalDiscountAmount;
    const grandTotal = subtotal + totalTax - additionalDiscountAmount;

    return {
      subtotal,
      itemDiscounts,
      additionalDiscountAmount,
      totalDiscounts,
      totalTax,
      grandTotal,
      items: items.map((item, index) => {
        const product = products.find(p => p.productId === item.productId);
        if (!product) return null;

        const basePrice = item.unitPrice * item.quantity;
        let discountAmount = 0;

        if (item.discountType === "PERCENTAGE") {
          discountAmount = (basePrice * item.discount) / 100;
        } else {
          discountAmount = item.discount;
        }

        const itemTotal = basePrice - discountAmount;
        const cgstAmount = (itemTotal * 0.09);
        const sgstAmount = (itemTotal * 0.09);

        return {
          ...item,
          productName: product.name,
          hsn: product.hsn,
          unitPrice: item.unitPrice,
          discountAmount,
          cgstAmount,
          sgstAmount,
          totalPrice: itemTotal
        };
      }).filter(Boolean)
    };
  };

  // Update totals when form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      const totals = calculateTotals();
      setCurrentTotals(totals);
    });
    return () => subscription.unsubscribe();
  }, [form, products]);

  // Handle form submission
  const onSubmit = (data: FormData) => {
    if (!selectedCustomer || !selectedShop) {
      toast({
        title: "Error",
        description: "Please select customer and shop",
        variant: "destructive"
      });
      return;
    }

    const totals = calculateTotals();
    
    const invoiceData: InvoiceInput = {
      customerId: data.customerId,
      shopId: data.shopId,
      invoiceDate: data.invoiceDate,
      transactionId: data.transactionId,
      discount: data.additionalDiscount,
      discountType: data.additionalDiscountType,
      amountPaid: totals.grandTotal,
      paymentMode: data.paymentMode,
      paymentStatus: data.paymentStatus,
      remark: data.remark,
      dueDate: data.dueDate,
      saleItems: data.saleItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        discount: item.discount,
        discountType: item.discountType,
        unitPrice: item.unitPrice
      }))
    };

    createInvoiceMutation.mutate(invoiceData);
  };

  const onAddCustomer = (data: CustomerFormData) => {
    addCustomerMutation.mutate(data);
  };

  const handleProductSelect = (product: Product) => {
    if (currentItemIndex !== null) {
      form.setValue(`saleItems.${currentItemIndex}.productId`, product.productId);
      form.setValue(`saleItems.${currentItemIndex}.unitPrice`, product.retailPrice);
    }
    setIsProductSearchDialogOpen(false);
    setCurrentItemIndex(null);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customerId', customer.customerId);
  };

  // PDF Download function
  const downloadInvoicePDF = () => {
    if (!createdInvoiceData) return;
    
    const { customer, shop, totals, formData } = createdInvoiceData;
    
    const invoiceData = {
      customer,
      shop,
      items: totals.items,
      totals,
      amountPaid: totals.grandTotal,
      date: formData.invoiceDate,
      transactionId: formData.transactionId
    };

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
            .shop-info h1 { color: #3b82f6; font-size: 28px; margin-bottom: 5px; }
            .shop-info p { color: #6b7280; font-size: 14px; line-height: 1.4; }
            .invoice-details { text-align: right; }
            .invoice-details h2 { color: #1f2937; font-size: 24px; margin-bottom: 10px; }
            .invoice-details p { color: #6b7280; font-size: 14px; margin-bottom: 4px; }
            .billing-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 30px 0; }
            .billing-info h3 { color: #1f2937; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .billing-info p { color: #4b5563; font-size: 14px; margin-bottom: 4px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .items-table th { background: #f9fafb; color: #374151; font-weight: 600; padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 14px; }
            .items-table td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #4b5563; }
            .items-table tr:hover { background: #f9fafb; }
            .text-right { text-align: right; }
            .totals-section { margin-top: 30px; }
            .totals-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-left: auto; width: 300px; }
            .total-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .total-line span:first-child { color: #6b7280; }
            .total-line span:last-child { color: #1f2937; font-weight: 500; }
            .grand-total { border-top: 2px solid #3b82f6; padding-top: 8px; margin-top: 12px; font-weight: 600; font-size: 16px; }
            .grand-total span { color: #1f2937; }
            .payment-status { margin-top: 30px; padding: 15px; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center; }
            .payment-status p { color: #166534; font-weight: 600; font-size: 16px; }
            .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            @media print { body { background: white; padding: 0; } .invoice-container { box-shadow: none; padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="shop-info">
                <h1>${invoiceData.shop.shopName}</h1>
                <p>${invoiceData.shop.ownerName}</p>
                <p>${invoiceData.shop.place}</p>
                <p>Phone: ${invoiceData.shop.phone}</p>
              </div>
              <div class="invoice-details">
                <h2>INVOICE</h2>
                <p><strong>Date:</strong> ${new Date(invoiceData.date).toLocaleDateString()}</p>
                <p><strong>Transaction ID:</strong> ${invoiceData.transactionId}</p>
              </div>
            </div>

            <div class="billing-section">
              <div class="billing-info">
                <h3>Bill To:</h3>
                <p><strong>${invoiceData.customer.name}</strong></p>
                <p>${invoiceData.customer.place}</p>
                <p>Phone: ${invoiceData.customer.phone}</p>
              </div>
              <div class="billing-info">
                <h3>Payment Information:</h3>
                <p><strong>Status:</strong> <span style="color: #16a34a;">PAID</span></p>
                <p><strong>Amount:</strong> ₹${(invoiceData.amountPaid || 0).toFixed(2)}</p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Discount</th>
                  <th class="text-right">CGST (9%)</th>
                  <th class="text-right">SGST (9%)</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.items.map(item => `
                  <tr>
                    <td>
                      <div>
                        <div style="font-weight: 500; color: #1f2937;">${item.productName}</div>
                        <div style="font-size: 12px; color: #6b7280;">HSN: ${item.hsn}</div>
                      </div>
                    </td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">₹${(item?.unitPrice || 0).toFixed(2)}</td>
                    <td class="text-right">₹${(item?.discountAmount || 0).toFixed(2)}</td>
                    <td class="text-right">₹${(item?.cgstAmount || 0).toFixed(2)}</td>
                    <td class="text-right">₹${(item?.sgstAmount || 0).toFixed(2)}</td>
                    <td class="text-right" style="font-weight: 600; color: #2d3748;">₹${(item?.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="totals-box">
                <div class="total-line">
                  <span>Sub Total:</span>
                  <span>₹${(invoiceData.totals.subtotal || 0).toFixed(2)}</span>
                </div>
                <div class="total-line">
                  <span>Total Discount:</span>
                  <span>- ₹${((invoiceData.totals.itemDiscounts || 0) + (invoiceData.totals.additionalDiscountAmount || 0)).toFixed(2)}</span>
                </div>
                <div class="total-line">
                  <span>Total CGST (9%):</span>
                  <span>₹${((invoiceData.totals.totalTax || 0) / 2).toFixed(2)}</span>
                </div>
                <div class="total-line">
                  <span>Total SGST (9%):</span>
                  <span>₹${((invoiceData.totals.totalTax || 0) / 2).toFixed(2)}</span>
                </div>
                <div class="total-line grand-total">
                  <span>Grand Total:</span>
                  <span>₹${(invoiceData.totals.grandTotal || 0).toFixed(2)}</span>
                </div>
                <div class="total-line">
                  <span>Amount Paid:</span>
                  <span>₹${(invoiceData.amountPaid || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="payment-status">
              <p>✓ Payment Completed - Thank you for your business!</p>
            </div>

            <div class="footer">
              <p>This is a computer-generated invoice. Thank you for your business!</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? "Edit Invoice" : "Create Invoice"}
                </h1>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Transaction ID: {form.watch("transactionId")}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Banner */}
      <div className="bg-green-600 border-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-white font-medium">PAID</span>
              </div>
              <span className="text-green-200">•</span>
              <span className="font-medium text-white">₹{(currentTotals.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Invoice Layout */}
            <Card className="bg-white">
              <CardContent className="p-8">
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Date:</span>
                      <FormField
                        control={form.control}
                        name="invoiceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                className="w-auto border-0 p-0 font-medium text-gray-900"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Transaction ID:</span>
                      <FormField
                        control={form.control}
                        name="transactionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="w-auto border-0 p-0 font-medium text-gray-900"
                                placeholder="Enter transaction ID"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Customer and Shop Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Customer Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Bill To
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCustomerSearchDialogOpen(true)}
                        >
                          Select Customer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddCustomerDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add New
                        </Button>
                      </div>
                    </div>
                    
                    {selectedCustomer ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{selectedCustomer.name}</h4>
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="h-3 w-3" />
                                {selectedCustomer.phone}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-3 w-3" />
                                {selectedCustomer.place}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(null);
                              form.setValue('customerId', 0);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No customer selected</p>
                        <p className="text-sm text-gray-400">Click "Select Customer" to choose</p>
                      </div>
                    )}
                  </div>

                  {/* Shop Selection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      From Shop
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="shopId"
                      render={({ field }) => (
                        <FormItem>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(Number(value));
                              const shop = shops.find(s => s.shopId === Number(value));
                              setSelectedShop(shop || null);
                            }} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select shop" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {shops.map((shop) => (
                                <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                                  {shop.shopName} - {shop.place}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {selectedShop && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900">{selectedShop.shopName}</h4>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-600">{selectedShop.ownerName}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {selectedShop.place}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            {selectedShop.phone}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Items Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Items
                    </h3>
                    <Button
                      type="button"
                      onClick={() => append({
                        productId: 0,
                        quantity: 1,
                        discount: 0,
                        discountType: "AMOUNT",
                        unitPrice: 0
                      })}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const product = products.find(p => p.productId === form.watch(`saleItems.${index}.productId`));
                      
                      return (
                        <Card key={field.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Product Selection */}
                              <div className="space-y-2">
                                <Label>Product</Label>
                                <div className="flex gap-2">
                                  <Select
                                    onValueChange={(value) => {
                                      const productId = Number(value);
                                      const selectedProduct = products.find(p => p.productId === productId);
                                      form.setValue(`saleItems.${index}.productId`, productId);
                                      if (selectedProduct) {
                                        form.setValue(`saleItems.${index}.unitPrice`, selectedProduct.retailPrice);
                                      }
                                    }}
                                    value={form.watch(`saleItems.${index}.productId`)?.toString() || ""}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map((product) => (
                                        <SelectItem key={product.productId} value={product.productId.toString()}>
                                          {product.name} - ₹{product.retailPrice}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentItemIndex(index);
                                      setIsProductSearchDialogOpen(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                {product && (
                                  <div className="bg-gray-50 p-2 rounded text-xs">
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-gray-600">HSN: {product.hsn}</p>
                                    <p className="text-gray-600">Stock: {product.quantity}</p>
                                  </div>
                                )}
                              </div>

                              {/* Quantity */}
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
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Unit Price */}
                              <FormField
                                control={form.control}
                                name={`saleItems.${index}.unitPrice`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Unit Price</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Discount */}
                              <div className="space-y-2">
                                <Label>Discount</Label>
                                <div className="flex gap-2">
                                  <FormField
                                    control={form.control}
                                    name={`saleItems.${index}.discount`}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            {...field}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
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
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger className="w-20">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="AMOUNT">₹</SelectItem>
                                            <SelectItem value="PERCENTAGE">%</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Item calculations display */}
                            {product && (
                              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-600">Base Price:</span>
                                    <p className="font-medium">₹{(form.watch(`saleItems.${index}.unitPrice`) * form.watch(`saleItems.${index}.quantity`)).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">CGST (9%):</span>
                                    <p className="font-medium">₹{(((form.watch(`saleItems.${index}.unitPrice`) * form.watch(`saleItems.${index}.quantity`)) - (form.watch(`saleItems.${index}.discountType`) === "PERCENTAGE" ? (form.watch(`saleItems.${index}.unitPrice`) * form.watch(`saleItems.${index}.quantity`) * form.watch(`saleItems.${index}.discount`)) / 100 : form.watch(`saleItems.${index}.discount`))) * 0.09).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">SGST (9%):</span>
                                    <p className="font-medium">₹{(((form.watch(`saleItems.${index}.unitPrice`) * form.watch(`saleItems.${index}.quantity`)) - (form.watch(`saleItems.${index}.discountType`) === "PERCENTAGE" ? (form.watch(`saleItems.${index}.unitPrice`) * form.watch(`saleItems.${index}.quantity`) * form.watch(`saleItems.${index}.discount`)) / 100 : form.watch(`saleItems.${index}.discount`))) * 0.09).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Item Total:</span>
                                    <p className="font-medium text-blue-600">₹{(
                                      (form.watch(`saleItems.${index}.unitPrice`) * form.watch(`saleItems.${index}.quantity`)) - 
                                      (form.watch(`saleItems.${index}.discountType`) === "PERCENTAGE" ? 
                                        (form.watch(`saleItems.${index}.unitPrice`) * form.watch(`saleItems.${index}.quantity`) * form.watch(`saleItems.${index}.discount`)) / 100 : 
                                        form.watch(`saleItems.${index}.discount`)
                                      )
                                    ).toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Additional Discount Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Additional Discount
                  </h3>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Additional Discount</Label>
                        <div className="flex gap-2">
                          <FormField
                            control={form.control}
                            name="additionalDiscount"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    placeholder="0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="additionalDiscountType"
                            render={({ field }) => (
                              <FormItem>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="AMOUNT">₹</SelectItem>
                                    <SelectItem value="PERCENTAGE">%</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Additional Discount Amount:</span>
                          <span>₹{(currentTotals.additionalDiscountAmount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Totals Section */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sub Total:</span>
                        <span className="font-medium">₹{currentTotals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Item Discounts:</span>
                        <span className="font-medium text-red-600">-₹{currentTotals.itemDiscounts.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Additional Discount:</span>
                        <span className="font-medium text-red-600">-₹{currentTotals.additionalDiscountAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Tax (18%):</span>
                        <span className="font-medium">₹{currentTotals.totalTax.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Grand Total:</span>
                        <span className="text-blue-600">₹{currentTotals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
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
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="CARD">Card</SelectItem>
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
                        name="remark"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Remark (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Add any notes or remarks..."
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end pt-6">
                  <Button 
                    type="submit"
                    disabled={createInvoiceMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-center">
                <span className="text-green-600">✓</span> Invoice Created Successfully!
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4">
              <p className="text-gray-600">Your invoice has been created and saved.</p>
              <div className="flex justify-center space-x-3">
                <Button 
                  onClick={downloadInvoicePDF}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/dashboard")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product Search Dialog */}
        <ProductSearchDialog
          isOpen={isProductSearchDialogOpen}
          onClose={() => setIsProductSearchDialogOpen(false)}
          onSelect={handleProductSelect}
          products={products}
        />

        {/* Customer Search Dialog */}
        <CustomerSearchDialog
          isOpen={isCustomerSearchDialogOpen}
          onClose={() => setIsCustomerSearchDialogOpen(false)}
          onSelect={handleCustomerSelect}
          customers={customers}
        />

        {/* Add Customer Dialog */}
        <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Enter phone number" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
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
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddCustomerDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Add Customer</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}