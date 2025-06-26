// Invoice creation page with direct editing layout
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Save, Eye, Download, FileText, User, Building2, Calendar, CreditCard, Percent, Hash, Phone, MapPin, Package } from "lucide-react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { productsApi, customersApi, shopsApi, invoicesApi } from "@/lib/api";
import { Product, Customer, Shop, InvoiceInput } from "@/types/api";

// Form schemas
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  shopId: z.string().min(1, "Shop is required"),
  paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE"]),
  paymentMode: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE"]),
  billType: z.enum(["RETAIL", "WHOLESALE"]),
  saleType: z.enum(["SALE", "RETURN"]),
  amountPaid: z.number().min(0),
  remark: z.string().optional(),
  saleItems: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    rate: z.number().min(0.01, "Rate must be greater than 0"),
    discountPercentage: z.number().min(0).max(100),
  })),
  additionalDiscountType: z.enum(["PERCENTAGE", "AMOUNT"]),
  additionalDiscountValue: z.number().min(0),
});

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  place: z.string().min(1, "Place is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;
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
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [showBackWarning, setShowBackWarning] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdInvoiceData, setCreatedInvoiceData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // Fetch data
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products/all"],
    queryFn: () => productsApi.getAllProducts(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers/all"],
    queryFn: () => customersApi.getAllCustomers(),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["/api/shops/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Form setup
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: "",
      shopId: "",
      paymentStatus: "PAID",
      paymentMode: "CASH",
      billType: "RETAIL",
      saleType: "SALE",
      amountPaid: 0,
      remark: "",
      saleItems: [{ productId: "", quantity: 1, rate: 0, discountPercentage: 0 }],
      additionalDiscountType: "AMOUNT",
      additionalDiscountValue: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "saleItems",
  });

  // Calculate totals with combined discount logic
  const calculateTotals = () => {
    const formData = form.getValues();
    
    const items = formData.saleItems.map(item => {
      const product = Array.isArray(products) ? products.find(p => p.productId === item.productId) : null;
      
      if (!product || !item.quantity || !item.rate) {
        return null;
      }

      const itemSubtotal = item.quantity * item.rate;
      const discountAmount = (itemSubtotal * item.discountPercentage) / 100;
      const afterDiscount = itemSubtotal - discountAmount;
      
      // Tax calculation (18% total: 9% CGST + 9% SGST)
      const taxRate = 0.18;
      const taxAmount = afterDiscount * taxRate;
      const cgstAmount = taxAmount / 2;
      const sgstAmount = taxAmount / 2;
      
      const lineTotal = afterDiscount + taxAmount;

      return {
        product,
        quantity: item.quantity,
        rate: item.rate,
        discountPercentage: item.discountPercentage,
        itemSubtotal,
        discountAmount,
        lineTotal,
        taxAmount,
        cgstAmount,
        sgstAmount,
      };
    }).filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + (item?.lineTotal || 0), 0);
    const totalTax = items.reduce((sum, item) => sum + (item?.taxAmount || 0), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item?.discountAmount || 0), 0);
    
    // Calculate item totals before discount
    const itemsBeforeDiscount = items.reduce((sum, item) => sum + (item?.itemSubtotal || 0), 0);
    const itemDiscounts = items.reduce((sum, item) => sum + (item?.discountAmount || 0), 0);

    // Additional discount calculation
    let additionalDiscountAmount = 0;
    if (formData.additionalDiscountValue > 0) {
      if (formData.additionalDiscountType === "PERCENTAGE") {
        additionalDiscountAmount = (subtotal * formData.additionalDiscountValue) / 100;
      } else {
        additionalDiscountAmount = formData.additionalDiscountValue;
      }
    }

    const grandTotal = Math.max(0, subtotal - additionalDiscountAmount);

    return {
      items,
      subtotal,
      totalTax,
      totalDiscount,
      itemsBeforeDiscount,
      itemDiscounts,
      additionalDiscountAmount,
      grandTotal,
    };
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => invoicesApi.addInvoice(data),
    onSuccess: (invoice, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      const totals = calculateTotals();
      setCreatedInvoiceData({
        invoice,
        customer: selectedCustomer,
        shop: selectedShop,
        totals,
        formData: variables,
      });
      
      setShowSuccessDialog(true);
      setHasUnsavedChanges(false);
      
      toast({
        title: "Success",
        description: "Invoice created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: (data: CustomerFormData) => customersApi.addCustomer(data),
    onSuccess: (newCustomer: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSelectedCustomer(newCustomer);
      form.setValue('customerId', newCustomer.customerId.toString());
      setIsAddCustomerDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Customer added successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    createInvoiceMutation.mutate(data);
  };

  const onAddCustomer = (data: CustomerFormData) => {
    addCustomerMutation.mutate(data);
  };

  // Handle customer selection
  const handleSelectCustomer = (customerId: string) => {
    const customer = Array.isArray(customers) ? customers.find(c => c.customerId === customerId) : null;
    if (customer) {
      setSelectedCustomer(customer);
      form.setValue('customerId', customer.customerId);
    }
  };

  // Handle shop selection
  const handleSelectShop = (shopId: string) => {
    const shop = Array.isArray(shops) ? shops.find(s => s.shopId === shopId) : null;
    if (shop) {
      setSelectedShop(shop);
      form.setValue('shopId', shop.shopId);
    }
  };

  // Back navigation with warning
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowBackWarning(true);
    } else {
      setLocation("/dashboard");
    }
  };

  const handleConfirmBack = () => {
    setShowBackWarning(false);
    setHasUnsavedChanges(false);
    setLocation("/dashboard");
  };

  // Download PDF function with combined discount display
  const downloadInvoicePDF = () => {
    if (!createdInvoiceData) return;
    
    const { customer, shop, totals, formData } = createdInvoiceData;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice PDF</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; }
            .customer-info { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f5f5f5; }
            .totals { margin-top: 20px; text-align: right; }
            .total-line { margin: 5px 0; }
            .grand-total { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${shop.name}</div>
            <div>${shop.place}</div>
          </div>
          
          <div class="customer-info">
            <strong>Bill To:</strong><br>
            ${customer.name}<br>
            ${customer.place}<br>
            ${customer.phone}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Discount</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${totals.items.map((item) => `
                <tr>
                  <td>${item?.product?.name || 'N/A'}</td>
                  <td>${item?.quantity || 0}</td>
                  <td>₹${item?.rate?.toFixed(2) || '0.00'}</td>
                  <td>${item?.discountPercentage || 0}%</td>
                  <td>₹${item?.lineTotal?.toFixed(2) || '0.00'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-line">Sub Total: ₹${totals.subtotal.toFixed(2)}</div>
            <div class="total-line">Total Discount: -₹${(totals.itemDiscounts + (totals.additionalDiscountAmount || 0)).toFixed(2)}</div>
            <div class="total-line">Total CGST (9%): ₹${((totals.totalTax || 0) / 2).toFixed(2)}</div>
            <div class="total-line">Total SGST (9%): ₹${((totals.totalTax || 0) / 2).toFixed(2)}</div>
            <div class="total-line grand-total">Grand Total: ₹${totals.grandTotal.toFixed(2)}</div>
            <div class="total-line">Amount Paid: ₹${formData.amountPaid || 0}</div>
            <div class="total-line">Balance: ₹${(totals.grandTotal - (formData.amountPaid || 0)).toFixed(2)}</div>
          </div>
          
          ${formData.remark ? `<div style="margin-top: 20px;"><strong>Remarks:</strong> ${formData.remark}</div>` : ''}
          
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={handleBackClick}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? "Edit Invoice" : "Create Invoice"}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              onClick={() => {
                if (!selectedCustomer || !selectedShop) return;
                
                const formData = form.getValues();
                const totals = calculateTotals();
                
                const previewData = {
                  invoiceDate: new Date().toISOString(),
                  shop: {
                    name: selectedShop.name,
                    place: selectedShop.place,
                    tagline: "Quality Products & Services"
                  },
                  customer: {
                    name: selectedCustomer.name,
                    place: selectedCustomer.place,
                    phone: selectedCustomer.phone
                  },
                  paymentDetails: {
                    paymentStatus: formData.paymentStatus,
                    paymentMode: formData.paymentMode,
                    billType: formData.billType,
                    saleType: formData.saleType
                  },
                  items: totals.items.filter((item: any) => item),
                  totals,
                  amountPaid: formData.amountPaid || 0,
                  remark: formData.remark
                };

                const previewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
                if (!previewWindow) return;

                previewWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Invoice Preview</title>
                      <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .company-name { font-size: 24px; font-weight: bold; }
                        .customer-info { margin: 20px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                        th { background-color: #f5f5f5; }
                        .totals { margin-top: 20px; text-align: right; }
                        .total-line { margin: 5px 0; }
                        .grand-total { font-weight: bold; font-size: 18px; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div class="company-name">${previewData.shop.name}</div>
                        <div>${previewData.shop.place}</div>
                      </div>
                      
                      <div class="customer-info">
                        <strong>Bill To:</strong><br>
                        ${previewData.customer.name}<br>
                        ${previewData.customer.place}<br>
                        ${previewData.customer.phone}
                      </div>
                      
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Discount</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${previewData.items.map((item) => `
                            <tr>
                              <td>${item?.product?.name || 'N/A'}</td>
                              <td>${item?.quantity || 0}</td>
                              <td>₹${item?.rate?.toFixed(2) || '0.00'}</td>
                              <td>${item?.discountPercentage || 0}%</td>
                              <td>₹${item?.lineTotal?.toFixed(2) || '0.00'}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      
                      <div class="totals">
                        <div class="total-line">Sub Total: ₹${previewData.totals.subtotal.toFixed(2)}</div>
                        <div class="total-line">Total Discount: -₹${(previewData.totals.itemDiscounts + (previewData.totals.additionalDiscountAmount || 0)).toFixed(2)}</div>
                        <div class="total-line">Total CGST (9%): ₹${((previewData.totals.totalTax || 0) / 2).toFixed(2)}</div>
                        <div class="total-line">Total SGST (9%): ₹${((previewData.totals.totalTax || 0) / 2).toFixed(2)}</div>
                        <div class="total-line grand-total">Grand Total: ₹${previewData.totals.grandTotal.toFixed(2)}</div>
                        <div class="total-line">Amount Paid: ₹${previewData.amountPaid}</div>
                        <div class="total-line">Balance: ₹${(previewData.totals.grandTotal - previewData.amountPaid).toFixed(2)}</div>
                      </div>
                      
                      ${previewData.remark ? `<div style="margin-top: 20px;"><strong>Remarks:</strong> ${previewData.remark}</div>` : ''}
                    </body>
                  </html>
                `);
                
                previewWindow.document.close();
              }}
              disabled={!selectedCustomer || !selectedShop}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-green-600">Invoice Created Successfully!</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Your invoice has been created and saved successfully.
              </p>
              <div className="flex space-x-2">
                <Button 
                  onClick={downloadInvoicePDF}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowSuccessDialog(false);
                    setLocation('/dashboard');
                  }}
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Warning Dialog */}
        <Dialog open={showBackWarning} onOpenChange={setShowBackWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
            </DialogHeader>
            <p className="py-4">You have unsaved changes. Are you sure you want to leave without saving?</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBackWarning(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmBack}>
                Leave Without Saving
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <p className="text-sm text-gray-500 mb-6">
          Fill in the details below to create a new invoice
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer *</FormLabel>
                        <Select onValueChange={handleSelectCustomer} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.customerId} value={customer.customerId}>
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
                        <FormLabel>Shop *</FormLabel>
                        <Select onValueChange={handleSelectShop} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shop" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {shops.map((shop) => (
                              <SelectItem key={shop.shopId} value={shop.shopId}>
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

                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                  <FormField
                    control={form.control}
                    name="paymentMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CARD">Card</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    name="saleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SALE">Sale</SelectItem>
                            <SelectItem value="RETURN">Return</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Items
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "", quantity: 1, rate: 0, discountPercentage: 0 })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-6 gap-4 items-end p-4 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`saleItems.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.productId} value={product.productId}>
                                    {product.name}
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
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`saleItems.${index}.rate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rate (₹)</FormLabel>
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

                      <FormField
                        control={form.control}
                        name={`saleItems.${index}.discountPercentage`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="text-right">
                        <FormLabel>Amount</FormLabel>
                        <p className="text-lg font-semibold">
                          ₹{(() => {
                            const item = totals.items[index];
                            return item ? item.lineTotal.toFixed(2) : '0.00';
                          })()}
                        </p>
                      </div>

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
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Discount */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Percent className="h-5 w-5 mr-2" />
                  Additional Discount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="additionalDiscountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                            <SelectItem value="AMOUNT">Amount (₹)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalDiscountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Discount Value {form.watch("additionalDiscountType") === "PERCENTAGE" ? "(%)" : "(₹)"}
                        </FormLabel>
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

                  <div>
                    <FormLabel>Discount Amount</FormLabel>
                    <p className="text-lg font-semibold text-green-600">
                      -₹{totals.additionalDiscountAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end">
                  <div className="w-96 space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total (Before Discount):</span>
                        <span className="font-semibold">₹{totals.itemsBeforeDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Item Discounts:</span>
                        <span>-₹{totals.itemDiscounts.toFixed(2)}</span>
                      </div>
                      {totals.additionalDiscountAmount > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Additional Discount:</span>
                          <span>-₹{totals.additionalDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Subtotal (After Discount):</span>
                        <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Total CGST:</span>
                        <span>₹{totals.items.reduce((sum, item) => sum + (item?.cgstAmount || 0), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Total SGST:</span>
                        <span>₹{totals.items.reduce((sum, item) => sum + (item?.sgstAmount || 0), 0).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Grand Total:</span>
                        <span>₹{totals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div>
                        <FormLabel>Balance</FormLabel>
                        <p className={`text-lg font-semibold ${(totals.grandTotal - form.watch("amountPaid")) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{(totals.grandTotal - form.watch("amountPaid")).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="remark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional remarks or notes..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={handleBackClick}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createInvoiceMutation.isPending}
                className="min-w-[120px]"
              >
                {createInvoiceMutation.isPending ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}