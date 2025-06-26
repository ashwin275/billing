// Create invoice page with invoice creation functionality
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Save, User, MapPin, Phone, Eye, Download } from "lucide-react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProductSearchDialog } from "@/components/ui/product-search-dialog";

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
  amountPaid: z.number().min(0, "Amount paid cannot be negative").default(0),
  paymentMode: z.enum(["CASH", "CARD", "UPI", "CHEQUE", "BANK_TRANSFER"]).default("CASH"),
  paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE"]).default("PAID"),
  remark: z.string().default(""),
  dueDate: z.string().nullable().default(null),
  billType: z.enum(["GST", "NON_GST"]).default("GST"),
  saleType: z.enum(["RETAIL", "WHOLESALE"]).default("RETAIL"),
  transactionId: z.string().min(1, "Transaction ID is required"),
  signature: z.string().optional(),
  saleItems: z.array(saleItemSchema).min(0, "No items required for validation"),
});

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  place: z.string().min(1, "Place is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  customerType: z.string().default("RETAIL"),
  shopId: z.number().min(1, "Shop is required"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;
type CustomerFormData = z.infer<typeof customerSchema>;

export default function CreateInvoice() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
      customerId: 0,
      shopId: 0,
      discount: 0,
      discountType: "PERCENTAGE",
      amountPaid: 0,
      paymentMode: "CASH",
      paymentStatus: "PAID",
      remark: "",
      dueDate: null,
      billType: "GST",
      saleType: "RETAIL",
      transactionId: `TXN${Date.now()}`,
      saleItems: [{ productId: 0, quantity: 1, discount: 0, discountType: "PERCENTAGE", unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "saleItems",
  });

  // Prevent default items from being added
  useEffect(() => {
    if (fields.length > 0 && form.getValues('saleItems').some(item => item.productId === 0)) {
      form.setValue('saleItems', []);
    }
  }, [fields, form]);

  // Auto-select shop if only one is available
  useEffect(() => {
    if (Array.isArray(shops) && shops.length === 1 && !form.getValues('shopId')) {
      const singleShop = shops[0];
      form.setValue('shopId', singleShop.shopId);
      setSelectedShop(singleShop);
    }
  }, [shops, form]);

  // Customer form
  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      place: "",
      phone: "",
      customerType: "RETAIL",
      shopId: 1,
    },
  });

  // Calculate totals with combined discount logic
  const calculateTotals = () => {
    const formData = form.getValues();
    
    const items = formData.saleItems.map(item => {
      const product = Array.isArray(products) ? products.find(p => p.productId === item.productId) : null;
      
      if (!product || !item.quantity || !item.unitPrice) {
        return null;
      }

      const itemTotal = item.quantity * item.unitPrice;
      let itemDiscount = 0;
      
      if (item.discountType === "PERCENTAGE") {
        itemDiscount = (itemTotal * item.discount) / 100;
      } else {
        itemDiscount = item.discount;
      }

      const itemAfterDiscount = itemTotal - itemDiscount;

      return {
        ...item,
        product,
        itemTotal,
        itemDiscount,
        itemAfterDiscount,
      };
    }).filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + (item?.itemTotal || 0), 0);
    const totalItemDiscounts = items.reduce((sum, item) => sum + (item?.itemDiscount || 0), 0);
    
    // Calculate additional discount from form
    let additionalDiscount = 0;
    if (formData.discountType === "PERCENTAGE") {
      additionalDiscount = (subtotal * formData.discount) / 100;
    } else {
      additionalDiscount = formData.discount;
    }

    const totalDiscount = totalItemDiscounts + additionalDiscount;
    const grandTotal = subtotal - totalDiscount;

    return {
      items,
      subtotal,
      totalItemDiscounts,
      additionalDiscount,
      totalDiscount,
      grandTotal,
    };
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => invoicesApi.addInvoice(data),
    onSuccess: (invoice, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      setCreatedInvoiceData({
        ...variables,
        invoiceId: invoice?.invoiceId || Math.floor(Math.random() * 10000),
        invoiceNo: invoice?.invoiceNo || `INV${Date.now()}`,
        customer: selectedCustomer,
        shop: selectedShop,
        ...calculateTotals(),
      });
      
      setShowSuccessDialog(true);
      setHasUnsavedChanges(false);
      
      toast({
        title: "Invoice Created Successfully",
        description: "Your invoice has been created and saved.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("Invoice creation error:", error);
      toast({
        title: "Failed to Create Invoice",
        description: error?.message || "An error occurred while creating the invoice.",
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
      form.setValue('customerId', newCustomer.customerId);
      setIsAddCustomerDialogOpen(false);
      customerForm.reset();
      toast({
        title: "Customer Added",
        description: "New customer has been added successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Customer creation error:", error);
      toast({
        title: "Failed to Add Customer",
        description: error?.message || "An error occurred while adding the customer.",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (data: InvoiceFormData) => {
    if (!data.saleItems || data.saleItems.length === 0) {
      toast({
        title: "No Items Added",
        description: "Please add at least one item to create an invoice.",
        variant: "destructive",
      });
      return;
    }

    // Check if customer and shop are selected
    if (!selectedCustomer || !selectedShop) {
      toast({
        title: "Missing Information",
        description: "Please select both customer and shop.",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    
    const invoiceData = {
      ...data,
      totalAmount: totals.grandTotal,
      taxAmount: 0, // Calculate if needed
      saleItems: data.saleItems.map(item => ({
        ...item,
        rate: item.unitPrice,
        amount: item.quantity * item.unitPrice,
      })),
    };

    createInvoiceMutation.mutate(invoiceData);
  };

  const onAddCustomer = (data: CustomerFormData) => {
    const customerData = {
      ...data,
      shopId: form.getValues('shopId') || 1,
    };
    addCustomerMutation.mutate(customerData);
  };

  // Add new item
  const addNewItem = () => {
    append({ productId: 0, quantity: 1, discount: 0, discountType: "PERCENTAGE", unitPrice: 0 });
  };

  // Select customer
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customerId', customer.customerId);
    setIsCustomerSearchDialogOpen(false);
  };

  // Select shop
  const selectShop = (shop: Shop) => {
    setSelectedShop(shop);
    form.setValue('shopId', shop.shopId);
    customerForm.setValue('shopId', shop.shopId);
  };

  // Select product for item
  const selectProduct = (product: Product, itemIndex: number) => {
    form.setValue(`saleItems.${itemIndex}.productId`, product.productId);
    form.setValue(`saleItems.${itemIndex}.unitPrice`, product.retailPrice || 0);
    setIsProductDialogOpen(false);
  };

  // Generate PDF function
  const generatePDF = () => {
    if (!selectedCustomer || !selectedShop) {
      toast({
        title: "Missing Information",
        description: "Customer and shop information is required for PDF generation.",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    
    if (!totals.items || totals.items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items to generate PDF.",
        variant: "destructive",
      });
      return;
    }

    const invoiceData = {
      invoiceNo: `PREVIEW-${Date.now()}`,
      invoiceDate: new Date().toLocaleDateString(),
      customer: selectedCustomer,
      shop: selectedShop,
      ...totals,
      transactionId: form.getValues('transactionId'),
      paymentStatus: form.getValues('paymentStatus'),
      remark: form.getValues('remark'),
    };

    // Generate PDF HTML content
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${invoiceData.invoiceNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .invoice-header { text-align: center; margin-bottom: 30px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .customer-details, .shop-details { width: 48%; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items-table th { background-color: #f5f5f5; }
          .totals { text-align: right; margin-top: 20px; }
          .total-row { margin: 5px 0; }
          .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>INVOICE</h1>
          <p>Date: ${invoiceData.invoiceDate}</p>
          <p>Transaction ID: ${invoiceData.transactionId}</p>
        </div>
        
        <div class="invoice-details">
          <div class="shop-details">
            <h3>From:</h3>
            <p><strong>${invoiceData.shop.name}</strong></p>
            <p>${invoiceData.shop.place}</p>
            <p>Phone: ${invoiceData.shop.phone}</p>
            <p>GST No: ${invoiceData.shop.gstNo}</p>
          </div>
          
          <div class="customer-details">
            <h3>To:</h3>
            <p><strong>${invoiceData.customer.name}</strong></p>
            <p>${invoiceData.customer.place}</p>
            <p>Phone: ${invoiceData.customer.phone}</p>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Discount</th>
              <th>Final Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items.map((item: any) => `
              <tr>
                <td>${item.product.name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unitPrice.toFixed(2)}</td>
                <td>₹${item.itemTotal.toFixed(2)}</td>
                <td>₹${item.itemDiscount.toFixed(2)}</td>
                <td>₹${item.itemAfterDiscount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="total-row">Subtotal: ₹${invoiceData.subtotal.toFixed(2)}</div>
          <div class="total-row">Total Discount: ₹${invoiceData.totalDiscount.toFixed(2)}</div>
          <div class="total-row grand-total">Grand Total: ₹${invoiceData.grandTotal.toFixed(2)}</div>
        </div>
        
        <div style="margin-top: 30px;">
          <p><strong>Payment Status:</strong> ${invoiceData.paymentStatus}</p>
          ${invoiceData.remark ? `<p><strong>Remarks:</strong> ${invoiceData.remark}</p>` : ''}
        </div>
      </body>
      </html>
    `;

    // Create and download PDF
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceData.invoiceNo}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Create Invoice</h1>
        </div>
        <div className="flex space-x-2">
          <Button onClick={generatePDF} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview PDF
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Details Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Date</Label>
                  <Input value={new Date().toLocaleDateString()} disabled />
                </div>
                <div>
                  <Label>Transaction ID</Label>
                  <FormField
                    control={form.control}
                    name="transactionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomerSearchDialogOpen(true)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Select Customer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddCustomerDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </div>
              </div>

              {selectedCustomer && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium">{selectedCustomer.name}</h4>
                  <p className="text-sm text-gray-600 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {selectedCustomer.place}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {selectedCustomer.phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shop Selection */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Shop Information</h3>
              <FormField
                control={form.control}
                name="shopId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Shop</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(parseInt(value));
                      const shop = shops.find(s => s.shopId === parseInt(value));
                      if (shop) selectShop(shop);
                    }} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a shop" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(shops) && shops.map((shop: any) => (
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

              {selectedShop && (
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium">{selectedShop.name}</h4>
                  <p className="text-sm text-gray-600">{selectedShop.place}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedShop.phone}</p>
                  <p className="text-sm text-gray-600">GST No: {selectedShop.gstNo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Invoice Items</h3>
                <Button type="button" onClick={addNewItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                      <div className="md:col-span-2">
                        <Label>Product</Label>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setIsProductDialogOpen(true)}
                        >
                          {(() => {
                            const productId = form.getValues(`saleItems.${index}.productId`);
                            const product = products.find((p: any) => p.productId === productId);
                            return product ? product.name : "Select Product";
                          })()}
                        </Button>
                      </div>

                      <div>
                        <Label>Quantity</Label>
                        <FormField
                          control={form.control}
                          name={`saleItems.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <Label>Rate</Label>
                        <FormField
                          control={form.control}
                          name={`saleItems.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <Label>Discount</Label>
                        <FormField
                          control={form.control}
                          name={`saleItems.${index}.discount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Discount */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Additional Discount</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountType"
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
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Totals Summary */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Invoice Summary</h3>
              <div className="space-y-2 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Discount:</span>
                  <span>₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span>₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
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
                  <FormItem className="mt-4">
                    <FormLabel>Remarks (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Link href="/dashboard">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={createInvoiceMutation.isPending}>
              {createInvoiceMutation.isPending ? (
                "Creating..."
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

      {/* Customer Search Dialog */}
      <Dialog open={isCustomerSearchDialogOpen} onOpenChange={setIsCustomerSearchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Array.isArray(customers) && customers.map((customer: any) => (
              <div
                key={customer.customerId}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => selectCustomer(customer)}
              >
                <h4 className="font-medium">{customer.name}</h4>
                <p className="text-sm text-gray-600">{customer.place}</p>
                <p className="text-sm text-gray-600">{customer.phone}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
        <DialogContent>
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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

      {/* Product Search Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Array.isArray(products) && products.map((product: any) => (
              <div
                key={product.productId}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  const currentIndex = fields.findIndex(f => f.id === fields[fields.length - 1].id);
                  selectProduct(product, currentIndex);
                }}
              >
                <h4 className="font-medium">{product.name}</h4>
                <p className="text-sm text-gray-600">HSN: {product.hsn}</p>
                <p className="text-sm text-gray-600">Retail Price: ₹{product.retailPrice}</p>
                <p className="text-sm text-gray-600">Wholesale Price: ₹{product.wholesalePrice}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Created Successfully!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Your invoice has been created and saved successfully.</p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  generatePDF();
                  setShowSuccessDialog(false);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  setLocation("/dashboard");
                }}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}