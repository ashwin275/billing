// Edit invoice page with pre-filled invoice data
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Save, User, MapPin, Phone, Eye, Download } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { useToast } from "@/hooks/use-toast";
import { productsApi, customersApi, shopsApi, invoicesApi } from "@/lib/api";
import { Product, Customer, Shop, InvoiceInput } from "@/types/api";

// Validation schemas
const saleItemSchema = z.object({
  productId: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  discount: z.number().min(0, "Discount cannot be negative"),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).default("PERCENTAGE"),
});

const invoiceSchema = z.object({
  customerId: z.number().min(1, "Customer is required"),
  shopId: z.number().min(1, "Shop is required"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).default("PERCENTAGE"),
  amountPaid: z.number().min(0, "Amount paid cannot be negative").default(0),
  paymentMode: z.enum(["CASH", "CARD", "UPI", "CHEQUE", "BANK_TRANSFER"]).default("CASH"),
  paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE"]).default("PENDING"),
  remark: z.string().default(""),
  dueDate: z.string().nullable().default(null),
  billType: z.enum(["GST", "NON_GST"]).default("GST"),
  saleType: z.enum(["RETAIL", "WHOLESALE"]).default("RETAIL"),
  transactionId: z.string().min(1, "Transaction ID is required"),
  saleItems: z.array(saleItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  place: z.string().min(1, "Place is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  shopId: z.number().min(1, "Shop is required"),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function EditInvoice() {
  const [match, params] = useRoute("/edit-invoice/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  const invoiceId = params?.id ? parseInt(params.id) : null;

  // Fetch invoice data
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    queryFn: () => invoicesApi.getInvoiceById(invoiceId!),
    enabled: !!invoiceId,
  });

  // Fetch other data
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products/all"],
    queryFn: () => productsApi.getAllProducts(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers/all"],
    queryFn: () => customersApi.getAllCustomers(),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Main invoice form
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: 0,
      shopId: 0,
      discount: 0,
      discountType: "PERCENTAGE",
      amountPaid: 0,
      paymentMode: "CASH",
      paymentStatus: "PENDING",
      remark: "",
      dueDate: null,
      billType: "GST",
      saleType: "RETAIL",
      transactionId: `TXN${Date.now()}`,
      saleItems: [{ productId: 0, quantity: 1, discount: 0, discountType: "PERCENTAGE" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "saleItems",
  });

  // Customer form
  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      place: "",
      phone: "",
      shopId: 1,
    },
  });

  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceInput) => {
      await invoicesApi.updateInvoice(invoiceId!, invoiceData);
    },
    onSuccess: () => {
      toast({
        title: "Invoice updated successfully",
        description: "The invoice has been updated and saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update invoice",
        description: error?.detail || error?.message || "An error occurred while updating the invoice.",
        variant: "destructive",
      });
    },
  });

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      await customersApi.addCustomer(customerData);
    },
    onSuccess: () => {
      toast({
        title: "Customer added",
        description: "Customer has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/all"] });
      setIsAddCustomerDialogOpen(false);
      customerForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add customer",
        description: error?.detail || error?.message || "Failed to add customer.",
        variant: "destructive",
      });
    },
  });

  // Populate form with invoice data
  useEffect(() => {
    if (invoice) {
      form.reset({
        customerId: invoice.customerId,
        shopId: invoice.shopId,
        discount: invoice.discount || 0,
        discountType: "PERCENTAGE", // Default as this isn't in the invoice data
        amountPaid: invoice.amountPaid || 0,
        paymentMode: invoice.paymentMode,
        paymentStatus: invoice.paymentStatus,
        remark: invoice.remark || "",
        dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : null,
        billType: invoice.billType || "GST",
        saleType: invoice.saleType || "RETAIL",
        transactionId: invoice.transactionId || `TXN${Date.now()}`,
        saleItems: invoice.saleItems && invoice.saleItems.length > 0 
          ? invoice.saleItems.map(item => ({
              productId: item.product?.productId || 0,
              quantity: item.quantity,
              discount: item.discount,
              discountType: "PERCENTAGE" as const,
            }))
          : [{ productId: 0, quantity: 1, discount: 0, discountType: "PERCENTAGE" as const }],
      });
    }
  }, [invoice, form]);

  // Calculate totals
  const calculateTotals = () => {
    const formData = form.getValues();
    
    if (!selectedCustomer || !selectedShop) return { subtotal: 0, totalTax: 0, totalDiscount: 0, grandTotal: 0, items: [] };

    const items = formData.saleItems.map(item => {
      const product = products.find(p => p.productId === item.productId);
      if (!product) return null;

      const unitPrice = formData.saleType === 'RETAIL' ? product.retailRate : product.wholesaleRate;
      
      let discountAmount = 0;
      if (item.discountType === 'PERCENTAGE') {
        discountAmount = (unitPrice * item.discount) / 100;
      } else {
        discountAmount = item.discount;
      }
      
      const discountedPrice = unitPrice - discountAmount;
      const lineTotal = discountedPrice * item.quantity;
      
      const cgstRate = formData.billType === 'GST' ? product.cgst : 0;
      const sgstRate = formData.billType === 'GST' ? product.sgst : 0;
      
      const cgstAmount = (lineTotal * cgstRate) / 100;
      const sgstAmount = (lineTotal * sgstRate) / 100;
      const taxAmount = cgstAmount + sgstAmount;
      const totalPrice = lineTotal; // Tax not included in total

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

    const subtotal = items.reduce((sum, item) => sum + (item?.lineTotal || 0), 0);
    const totalTax = items.reduce((sum, item) => sum + (item?.taxAmount || 0), 0);
    
    let totalDiscount = 0;
    if (formData.discountType === 'PERCENTAGE') {
      totalDiscount = (subtotal * formData.discount) / 100;
    } else {
      totalDiscount = formData.discount;
    }
    
    const grandTotal = subtotal - totalDiscount; // Exclude tax from grand total

    return { subtotal, totalTax, totalDiscount, grandTotal, items };
  };

  const totals = calculateTotals();

  // Handle form submission
  const onSubmit = (data: InvoiceFormData) => {
    const invoiceInput: InvoiceInput = {
      customerId: data.customerId,
      shopId: data.shopId,
      discount: data.discount,
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      paymentStatus: data.paymentStatus,
      remark: data.remark,
      dueDate: data.dueDate,
      billType: data.billType,
      saleType: data.saleType,
      transactionId: data.transactionId,
      saleItems: data.saleItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        discount: item.discount,
      })),
    };

    updateInvoiceMutation.mutate(invoiceInput);
  };

  // Handle add customer
  const onAddCustomer = (data: CustomerFormData) => {
    const customerInput = {
      name: data.name,
      place: data.place,
      phone: data.phone,
      shopId: data.shopId,
    };
    addCustomerMutation.mutate(customerInput);
  };

  // Update selected customer when form changes
  useEffect(() => {
    const customerId = form.watch("customerId");
    const customer = customers.find(c => c.customerId === customerId);
    setSelectedCustomer(customer || null);
  }, [form.watch("customerId"), customers]);

  // Update selected shop when form changes
  useEffect(() => {
    const shopId = form.watch("shopId");
    const shop = shops.find(s => s.shopId === shopId);
    setSelectedShop(shop || null);
  }, [form.watch("shopId"), shops]);

  if (!match) {
    return <div>Invoice not found</div>;
  }

  if (isLoadingInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading invoice...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-2">Invoice not found</h3>
              <p className="text-muted-foreground text-center mb-4">
                The invoice you're looking for doesn't exist or has been deleted.
              </p>
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Edit Invoice #{invoice.invoiceNo}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(true)}
              disabled={!selectedCustomer || !selectedShop}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                const { jsPDF } = await import('jspdf');
                const formData = form.getValues();
                
                const doc = new jsPDF();
                
                // Header with better formatting
                doc.setFontSize(24);
                doc.setFont("helvetica", "bold");
                doc.text(selectedShop?.name || "Shop Name", 20, 25);
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(selectedShop?.place || "Shop Address", 20, 35);
                
                // Invoice title and details - right aligned
                doc.setFontSize(28);
                doc.setFont("helvetica", "bold");
                doc.text("INVOICE", 210 - doc.getTextWidth("INVOICE"), 25);
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                const invoiceText = `Invoice #: ${invoice?.invoiceNo}`;
                doc.text(invoiceText, 210 - doc.getTextWidth(invoiceText), 35);
                const dateText = `Date: ${invoice?.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : new Date().toLocaleDateString()}`;
                doc.text(dateText, 210 - doc.getTextWidth(dateText), 42);
                
                // Horizontal line
                doc.setLineWidth(0.5);
                doc.line(20, 50, 190, 50);
                
                // Bill To and Payment Details sections
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("Bill To:", 20, 65);
                doc.text("Payment Details:", 120, 65);
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(selectedCustomer?.name || "Customer", 20, 75);
                doc.text(selectedCustomer?.place || "Address", 20, 82);
                doc.text(selectedCustomer?.phone?.toString() || "Phone", 20, 89);
                
                doc.text(`Status: ${formData.paymentStatus}`, 120, 75);
                doc.text(`Mode: ${formData.paymentMode}`, 120, 82);
                doc.text(`Type: ${formData.billType} ${formData.saleType}`, 120, 89);
                
                // Items table with proper formatting
                let yPos = 110;
                
                // Table header with background
                doc.setFillColor(240, 240, 240);
                doc.rect(20, yPos - 5, 170, 12, 'F');
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text("Product", 25, yPos);
                doc.text("Qty", 100, yPos);
                doc.text("Rate", 120, yPos);
                doc.text("Discount", 145, yPos);
                doc.text("Total", 170, yPos);
                
                // Table border
                doc.setLineWidth(0.3);
                doc.rect(20, yPos - 5, 170, 12);
                
                yPos += 15;
                doc.setFont("helvetica", "normal");
                
                // Items with proper alignment
                totals.items.forEach((item, index) => {
                  if (item) {
                    if (index % 2 === 0) {
                      doc.setFillColor(250, 250, 250);
                      doc.rect(20, yPos - 5, 170, 10, 'F');
                    }
                    
                    doc.text(item.product?.name || "Product", 25, yPos);
                    doc.text(item.quantity.toString(), 105, yPos);
                    doc.text(`₹${item.unitPrice?.toFixed(2)}`, 125, yPos);
                    doc.text(`₹${item.discountAmount?.toFixed(2)}`, 150, yPos);
                    const totalText = `₹${item.totalPrice?.toFixed(2)}`;
                    doc.text(totalText, 190 - doc.getTextWidth(totalText), yPos);
                    
                    doc.rect(20, yPos - 5, 170, 10);
                    yPos += 10;
                  }
                });
                
                // Totals section with proper alignment
                yPos += 10;
                doc.setLineWidth(0.5);
                doc.line(120, yPos, 190, yPos);
                yPos += 10;
                
                const totalsData = [
                  { label: "Subtotal:", value: `₹${totals.subtotal.toFixed(2)}` },
                  { label: "Tax (Not included):", value: `₹${totals.totalTax.toFixed(2)}` },
                  { label: "Discount:", value: `-₹${totals.totalDiscount.toFixed(2)}` }
                ];
                
                totalsData.forEach(item => {
                  doc.setFont("helvetica", "normal");
                  doc.text(item.label, 125, yPos);
                  doc.text(item.value, 190 - doc.getTextWidth(item.value), yPos);
                  yPos += 7;
                });
                
                // Grand total with emphasis
                doc.setLineWidth(0.8);
                doc.line(120, yPos, 190, yPos);
                yPos += 10;
                
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("Grand Total:", 125, yPos);
                const grandTotalText = `₹${totals.grandTotal.toFixed(2)}`;
                doc.text(grandTotalText, 190 - doc.getTextWidth(grandTotalText), yPos);
                
                yPos += 10;
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text("Amount Paid:", 125, yPos);
                const amountPaidText = `₹${(formData.amountPaid || 0).toFixed(2)}`;
                doc.text(amountPaidText, 190 - doc.getTextWidth(amountPaidText), yPos);
                
                yPos += 7;
                doc.setFont("helvetica", "bold");
                doc.text("Balance:", 125, yPos);
                const balanceText = `₹${(totals.grandTotal - (formData.amountPaid || 0)).toFixed(2)}`;
                doc.text(balanceText, 190 - doc.getTextWidth(balanceText), yPos);
                
                // Terms and Conditions with better formatting
                yPos += 25;
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text("Terms and Conditions:", 20, yPos);
                
                yPos += 8;
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                const terms = [
                  "1. Payment is due within 30 days of invoice date.",
                  "2. Late payments may incur additional charges.",
                  "3. Goods once sold cannot be returned without prior approval.",
                  "4. Any disputes must be resolved within 7 days of delivery."
                ];
                
                terms.forEach(term => {
                  doc.text(term, 20, yPos);
                  yPos += 6;
                });
                
                // Remarks if present
                if (formData.remark) {
                  yPos += 10;
                  doc.setFontSize(11);
                  doc.setFont("helvetica", "bold");
                  doc.text("Remarks:", 20, yPos);
                  yPos += 8;
                  doc.setFontSize(9);
                  doc.setFont("helvetica", "normal");
                  doc.text(formData.remark, 20, yPos);
                }
                
                doc.save(`invoice-${invoice?.invoiceNo}.pdf`);
              }}
              disabled={!selectedCustomer || !selectedShop}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button 
              onClick={() => form.handleSubmit(onSubmit)()}
              disabled={updateInvoiceMutation.isPending || !form.formState.isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateInvoiceMutation.isPending ? "Updating..." : "Update Invoice"}
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Invoice Layout - Same as create page but with pre-filled data */}
            <Card className="bg-white">
              <CardContent className="p-8">
                {/* Header Section */}
                <div className="mb-8">
                  <div className="flex justify-between items-start">
                    {/* Shop Info */}
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="shopId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Shop</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger className="border border-gray-300 text-2xl font-bold text-gray-900 p-3 h-auto rounded-md">
                                  <SelectValue placeholder="Select Shop" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.isArray(shops) ? shops.map((shop) => (
                                  <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                                    {shop.name}
                                  </SelectItem>
                                )) : null}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {selectedShop && (
                        <p className="text-gray-600 mt-1">{selectedShop.place}</p>
                      )}
                    </div>

                    {/* Invoice Details */}
                    <div className="text-right">
                      <h2 className="text-3xl font-bold text-gray-900 mb-4">INVOICE</h2>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-sm text-gray-600">Invoice #</Label>
                          <p className="font-semibold">{invoice.invoiceNo}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Date</Label>
                          <p className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Transaction ID</Label>
                          <FormField
                            control={form.control}
                            name="transactionId"
                            render={({ field }) => (
                              <Input {...field} className="text-right border-none p-0 font-semibold" />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Customer and Settings Section - Same layout as create page */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Bill To */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Bill To:</h3>
                      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Customer
                          </Button>
                        </DialogTrigger>
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
                                    <FormLabel>Customer Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Enter customer name" />
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
                                      <Input {...field} placeholder="Enter place" />
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
                                      <Input {...field} placeholder="Enter phone number" />
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
                                        {Array.isArray(shops) ? shops.map((shop) => (
                                          <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                                            {shop.name} - {shop.place}
                                          </SelectItem>
                                        )) : null}
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
                    
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="border-dashed border-2">
                                <SelectValue placeholder="Select Customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(customers) ? customers.map((customer) => (
                                <SelectItem key={customer.customerId} value={customer.customerId.toString()}>
                                  {customer.name} - {customer.place}
                                </SelectItem>
                              )) : null}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {selectedCustomer && (
                      <div className="mt-4 p-4 bg-gray-50 rounded border">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{selectedCustomer.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="h-4 w-4 text-gray-600" />
                          <span className="text-gray-600">{selectedCustomer.place}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-600" />
                          <span className="text-gray-600">{selectedCustomer.phone}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Invoice Settings - Same as create page */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Items Section - Same as create page but with pre-filled items */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ productId: 0, quantity: 1, discount: 0, discountType: "PERCENTAGE" })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 font-semibold text-sm">
                      <div className="col-span-3">Product</div>
                      <div className="col-span-1">HSN</div>
                      <div className="col-span-1">Qty</div>
                      <div className="col-span-1">Rate</div>
                      <div className="col-span-2">Discount</div>
                      <div className="col-span-1">CGST</div>
                      <div className="col-span-1">SGST</div>
                      <div className="col-span-1">Total</div>
                      <div className="col-span-1">Action</div>
                    </div>

                    {fields.map((field, index) => {
                      const selectedProduct = products.find(p => p.productId === form.watch(`saleItems.${index}.productId`));
                      const quantity = form.watch(`saleItems.${index}.quantity`) || 0;
                      const discount = form.watch(`saleItems.${index}.discount`) || 0;
                      const discountType = form.watch(`saleItems.${index}.discountType`) || "PERCENTAGE";
                      
                      let itemTotal = 0;
                      let cgstAmount = 0;
                      let sgstAmount = 0;
                      
                      if (selectedProduct) {
                        const saleType = form.watch("saleType");
                        const billType = form.watch("billType");
                        const unitPrice = saleType === 'RETAIL' ? selectedProduct.retailRate : selectedProduct.wholesaleRate;
                        
                        let discountAmount = 0;
                        if (discountType === 'PERCENTAGE') {
                          discountAmount = (unitPrice * discount) / 100;
                        } else {
                          discountAmount = discount;
                        }
                        
                        const discountedPrice = unitPrice - discountAmount;
                        const lineTotal = discountedPrice * quantity;
                        
                        if (billType === 'GST') {
                          cgstAmount = (lineTotal * selectedProduct.cgst) / 100;
                          sgstAmount = (lineTotal * selectedProduct.sgst) / 100;
                        }
                        
                        itemTotal = lineTotal; // Tax not included in total
                      }

                      return (
                        <div key={field.id} className="grid grid-cols-12 gap-4 p-4 border-b items-center">
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name={`saleItems.${index}.productId`}
                              render={({ field }) => (
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                  <SelectTrigger className="border-dashed">
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.isArray(products) ? products.map((product) => (
                                      <SelectItem key={product.productId} value={product.productId.toString()}>
                                        {product.name}
                                      </SelectItem>
                                    )) : null}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          
                          <div className="col-span-1 text-sm text-gray-600">
                            {selectedProduct?.hsn || '-'}
                          </div>
                          
                          <div className="col-span-1">
                            <FormField
                              control={form.control}
                              name={`saleItems.${index}.quantity`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min="1"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  className="text-center"
                                />
                              )}
                            />
                          </div>
                          
                          <div className="col-span-1 text-sm text-gray-600">
                            {selectedProduct ? `₹${(form.watch("saleType") === 'RETAIL' ? selectedProduct.retailRate : selectedProduct.wholesaleRate).toFixed(2)}` : '-'}
                          </div>
                          
                          <div className="col-span-2">
                            <div className="flex space-x-1">
                              <FormField
                                control={form.control}
                                name={`saleItems.${index}.discount`}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    className="flex-1"
                                  />
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`saleItems.${index}.discountType`}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="w-16">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PERCENTAGE">%</SelectItem>
                                      <SelectItem value="AMOUNT">₹</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                          
                          <div className="col-span-1 text-sm text-gray-600">
                            {form.watch("billType") === 'GST' && selectedProduct ? `₹${cgstAmount.toFixed(2)}` : '-'}
                          </div>
                          
                          <div className="col-span-1 text-sm text-gray-600">
                            {form.watch("billType") === 'GST' && selectedProduct ? `₹${sgstAmount.toFixed(2)}` : '-'}
                          </div>
                          
                          <div className="col-span-1 font-semibold">
                            ₹{itemTotal.toFixed(2)}
                          </div>
                          
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Totals Section - Same as create page */}
                <div className="flex justify-end">
                  <div className="w-96 space-y-4">
                    {/* Overall Discount */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Overall Discount:</span>
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="discount"
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              step="0.01"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="w-24 text-right"
                            />
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="discountType"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PERCENTAGE">%</SelectItem>
                                <SelectItem value="AMOUNT">₹</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
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
                      <div className="flex justify-between text-gray-600">
                        <span>Total Tax (Not included):</span>
                        <span>₹{totals.totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Overall Discount:</span>
                        <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                      </div>
                    </div>

                    <Separator />
                    
                    <div className="flex justify-between text-xl font-bold">
                      <span>Grand Total:</span>
                      <span>₹{totals.grandTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <FormField
                        control={form.control}
                        name="amountPaid"
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="w-32 text-right"
                          />
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Balance:</span>
                      <span className={totals.grandTotal - (form.watch("amountPaid") || 0) > 0 ? "text-red-600" : "text-green-600"}>
                        ₹{(totals.grandTotal - (form.watch("amountPaid") || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Additional Fields - Same as create page */}
                <div>
                  <FormField
                    control={form.control}
                    name="remark"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Enter any remarks..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Preview - #{invoice?.invoiceNo}</DialogTitle>
            </DialogHeader>
            
            {selectedCustomer && selectedShop && (
              <div className="space-y-6 p-6 bg-white text-black">
                {/* Invoice Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-black">{selectedShop.name}</h2>
                    <p className="text-gray-600">{selectedShop.place}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-bold text-black">INVOICE</h3>
                    <p className="text-gray-600">{invoice?.invoiceNo}</p>
                    <p className="text-gray-600">{invoice?.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <Separator className="border-black" />

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-black mb-2">Bill To:</h4>
                    <p className="text-gray-600">{selectedCustomer.name}</p>
                    <p className="text-gray-600">{selectedCustomer.place}</p>
                    <p className="text-gray-600">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-2">Payment Details:</h4>
                    <p className="text-gray-600">Status: {form.watch("paymentStatus")}</p>
                    <p className="text-gray-600">Mode: {form.watch("paymentMode")}</p>
                    <p className="text-gray-600">Type: {form.watch("billType")} {form.watch("saleType")}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="font-semibold text-black mb-4">Items:</h4>
                  <div className="border border-black">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border-b border-black p-2 text-left text-black">Product</th>
                          <th className="border-b border-black p-2 text-right text-black">Qty</th>
                          <th className="border-b border-black p-2 text-right text-black">Rate</th>
                          <th className="border-b border-black p-2 text-right text-black">Discount</th>
                          <th className="border-b border-black p-2 text-right text-black">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totals.items.map((item, index) => (
                          <tr key={index}>
                            <td className="border-b border-black p-2 text-black">{item?.product?.name || 'Product'}</td>
                            <td className="border-b border-black p-2 text-right text-black">{item?.quantity}</td>
                            <td className="border-b border-black p-2 text-right text-black">₹{item?.unitPrice?.toFixed(2)}</td>
                            <td className="border-b border-black p-2 text-right text-black">₹{item?.discountAmount?.toFixed(2)}</td>
                            <td className="border-b border-black p-2 text-right text-black">₹{item?.totalPrice?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-black">
                      <span>Subtotal:</span>
                      <span>₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (Not included):</span>
                      <span>₹{totals.totalTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Discount:</span>
                      <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                    </div>
                    <Separator className="border-black" />
                    <div className="flex justify-between font-bold text-lg text-black">
                      <span>Grand Total:</span>
                      <span>₹{totals.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-black">
                      <span>Amount Paid:</span>
                      <span>₹{(form.watch("amountPaid") || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-black">
                      <span>Balance:</span>
                      <span>₹{(totals.grandTotal - (form.watch("amountPaid") || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {form.watch("remark") && (
                  <div>
                    <h4 className="font-semibold text-black mb-2">Remarks:</h4>
                    <p className="text-gray-600">{form.watch("remark")}</p>
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="mt-8">
                  <h4 className="font-semibold text-black mb-2">Terms and Conditions:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>1. Payment is due within 30 days of invoice date.</p>
                    <p>2. Late payments may incur additional charges.</p>
                    <p>3. Goods once sold cannot be returned without prior approval.</p>
                    <p>4. Any disputes must be resolved within 7 days of delivery.</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}