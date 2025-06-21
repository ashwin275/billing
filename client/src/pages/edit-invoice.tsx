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
  signature: z.string().optional(),
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
        signature: invoice.signature || "",
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

  if (!match || !invoiceId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-2">Invoice not found</h3>
              <p className="text-muted-foreground text-center mb-4">
                The invoice you're looking for doesn't exist or the URL is invalid.
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
              onClick={() => {
                if (!selectedCustomer || !selectedShop) return;
                
                const formData = form.getValues();
                const previewData = {
                  invoiceNo: invoice?.invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
                  invoiceDate: invoice?.invoiceDate || new Date().toISOString(),
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
                  items: totals.items.filter(item => item),
                  totals,
                  amountPaid: formData.amountPaid || 0,
                  remark: formData.remark
                };
                
                // Create preview window with modern compact design
                const previewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
                if (!previewWindow) return;

                previewWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Invoice Preview - ${previewData.invoiceNo}</title>
                      <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                        
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        
                        body { 
                          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                          background: #f8fafc;
                          padding: 20px;
                          line-height: 1.4;
                        }
                        
                        .invoice-container {
                          max-width: 800px;
                          margin: 0 auto;
                          background: white;
                          border-radius: 12px;
                          overflow: hidden;
                          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                          position: relative;
                          page-break-inside: avoid;
                        }
                        
                        .header-wave {
                          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                          height: 120px;
                          position: relative;
                          overflow: hidden;
                        }
                        
                        .header-wave::after {
                          content: '';
                          position: absolute;
                          bottom: -30px;
                          left: 0;
                          width: 100%;
                          height: 60px;
                          background: white;
                          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
                        }
                        
                        .header-content {
                          position: relative;
                          z-index: 2;
                          color: white;
                          padding: 25px 40px;
                          display: flex;
                          justify-content: space-between;
                          align-items: flex-start;
                        }
                        
                        .logo-section {
                          display: flex;
                          align-items: center;
                          gap: 12px;
                        }
                        
                        .logo-placeholder {
                          width: 45px;
                          height: 45px;
                          background: rgba(255,255,255,0.2);
                          border-radius: 8px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-size: 18px;
                          font-weight: bold;
                          border: 2px solid rgba(255,255,255,0.3);
                        }
                        
                        .company-info h1 {
                          font-size: 24px;
                          font-weight: 700;
                          margin-bottom: 3px;
                          text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        
                        .company-tagline {
                          font-size: 12px;
                          opacity: 0.9;
                          font-weight: 300;
                        }
                        
                        .invoice-title {
                          text-align: right;
                        }
                        
                        .invoice-title h2 {
                          font-size: 32px;
                          font-weight: 300;
                          letter-spacing: 2px;
                          margin-bottom: 5px;
                          text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        
                        .invoice-meta {
                          font-size: 12px;
                          opacity: 0.9;
                        }
                        
                        .content-section {
                          padding: 40px 40px 30px;
                        }
                        
                        .bill-to-section {
                          display: grid;
                          grid-template-columns: 1fr 1fr;
                          gap: 40px;
                          margin-bottom: 30px;
                        }
                        
                        .info-block h3 {
                          color: #2d3748;
                          font-size: 14px;
                          font-weight: 600;
                          margin-bottom: 10px;
                          padding-bottom: 5px;
                          border-bottom: 2px solid #e2e8f0;
                        }
                        
                        .info-block p {
                          color: #4a5568;
                          line-height: 1.5;
                          margin-bottom: 3px;
                          font-size: 13px;
                        }
                        
                        .customer-name {
                          font-weight: 600;
                          color: #2d3748;
                          font-size: 15px;
                        }
                        
                        .items-table {
                          width: 100%;
                          border-collapse: collapse;
                          margin-bottom: 25px;
                          border-radius: 8px;
                          overflow: hidden;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                        }
                        
                        .items-table thead tr {
                          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                        }
                        
                        .items-table th {
                          padding: 12px 10px;
                          font-weight: 600;
                          font-size: 12px;
                          letter-spacing: 0.5px;
                        }
                        
                        .items-table td {
                          padding: 10px;
                          border-bottom: 1px solid #e2e8f0;
                          color: #4a5568;
                          font-size: 12px;
                        }
                        
                        .items-table tbody tr:last-child td {
                          border-bottom: none;
                        }
                        
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .text-left { text-align: left; }
                        
                        .totals-section {
                          display: flex;
                          justify-content: flex-end;
                          margin-bottom: 25px;
                        }
                        
                        .totals-box {
                          background: #f7fafc;
                          padding: 20px;
                          border-radius: 8px;
                          min-width: 280px;
                        }
                        
                        .total-line {
                          display: flex;
                          justify-content: space-between;
                          padding: 4px 0;
                          color: #4a5568;
                          font-size: 13px;
                        }
                        
                        .grand-total {
                          border-top: 2px solid #e2e8f0;
                          margin-top: 10px;
                          padding-top: 10px;
                          font-size: 16px;
                          font-weight: 700;
                          color: #2d3748;
                        }
                        
                        .balance {
                          font-weight: 600;
                          font-size: 14px;
                        }
                        
                        .balance.positive { color: #e53e3e; }
                        .balance.negative { color: #38a169; }
                        
                        .bottom-section {
                          display: grid;
                          grid-template-columns: 2fr 1fr;
                          gap: 25px;
                        }
                        
                        .terms-section {
                          background: #f7fafc;
                          padding: 15px;
                          border-radius: 8px;
                        }
                        
                        .terms-section h3 {
                          color: #2d3748;
                          font-size: 14px;
                          font-weight: 600;
                          margin-bottom: 8px;
                        }
                        
                        .terms-section p {
                          color: #4a5568;
                          font-size: 11px;
                          line-height: 1.4;
                          margin-bottom: 4px;
                        }
                        
                        .signature-section {
                          text-align: center;
                          padding: 15px;
                        }
                        
                        .signature-line {
                          border-top: 2px solid #2d3748;
                          width: 120px;
                          margin: 25px auto 8px;
                        }
                        
                        .signature-text {
                          color: #4a5568;
                          font-size: 12px;
                          font-weight: 500;
                        }
                        
                        .preview-controls {
                          position: fixed;
                          top: 20px;
                          right: 20px;
                          background: white;
                          padding: 12px;
                          border-radius: 6px;
                          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                          z-index: 1000;
                        }
                        
                        .preview-controls button {
                          margin-left: 8px;
                          padding: 6px 12px;
                          border: none;
                          border-radius: 4px;
                          cursor: pointer;
                          font-weight: 500;
                          font-size: 13px;
                        }
                        
                        .btn-close {
                          background: #e53e3e;
                          color: white;
                        }
                        
                        .btn-print {
                          background: #4299e1;
                          color: white;
                        }
                        
                        @media print {
                          body { 
                            background: white;
                            padding: 0;
                          }
                          .invoice-container {
                            box-shadow: none;
                            border-radius: 0;
                            page-break-inside: avoid;
                          }
                          .preview-controls {
                            display: none;
                          }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="preview-controls">
                        <button class="btn-print" onclick="window.print()">Print</button>
                        <button class="btn-close" onclick="window.close()">Close</button>
                      </div>
                      
                      <div class="invoice-container">
                        <!-- Header Wave Section -->
                        <div class="header-wave">
                          <div class="header-content">
                            <div class="logo-section">
                              <div class="logo-placeholder">
                                ${previewData.shop.name.charAt(0)}
                              </div>
                              <div class="company-info">
                                <h1>${previewData.shop.name}</h1>
                                <div class="company-tagline">${previewData.shop.tagline}</div>
                              </div>
                            </div>
                            <div class="invoice-title">
                              <div class="invoice-meta">
                                <div><strong>Invoice #:</strong> ${previewData.invoiceNo}</div>
                                <div><strong>Date:</strong> ${new Date(previewData.invoiceDate).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Content Section -->
                        <div class="content-section">
                          <!-- Bill To Section -->
                          <div class="bill-to-section">
                            <div class="info-block">
                              <h3>Invoice To:</h3>
                              <p class="customer-name">${previewData.customer.name}</p>
                              <p>📍 ${previewData.customer.place}</p>
                              <p>📞 ${previewData.customer.phone}</p>
                            </div>
                            <div class="info-block">
                              <h3>Payment Info:</h3>
                              <p><strong>Status:</strong> ${previewData.paymentDetails.paymentStatus}</p>
                              <p><strong>Mode:</strong> ${previewData.paymentDetails.paymentMode}</p>
                              <p><strong>Type:</strong> ${previewData.paymentDetails.billType} ${previewData.paymentDetails.saleType}</p>
                            </div>
                          </div>

                          <!-- Items Table -->
                          <table class="items-table">
                            <thead>
                              <tr>
                                <th class="text-left">Item Description</th>
                                <th class="text-center">Qty.</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Discount</th>
                                <th class="text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${previewData.items.map((item, index) => `
                                <tr>
                                  <td class="text-left">
                                    <div style="font-weight: 600; color: #2d3748;">${item.product.name}</div>
                                  </td>
                                  <td class="text-center">${item.quantity.toString().padStart(2, '0')}</td>
                                  <td class="text-right">₹${item.unitPrice.toFixed(2)}</td>
                                  <td class="text-right">₹${item.discountAmount.toFixed(2)}</td>
                                  <td class="text-right" style="font-weight: 600; color: #2d3748;">₹${item.totalPrice.toFixed(2)}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>

                          <!-- Totals Section -->
                          <div class="totals-section">
                            <div class="totals-box">
                              <div class="total-line">
                                <span>Sub Total:</span>
                                <span>₹${previewData.totals.subtotal.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Discount:</span>
                                <span>- ₹${previewData.totals.totalDiscount.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Tax - GST:</span>
                                <span>₹${previewData.totals.totalTax.toFixed(2)}</span>
                              </div>
                              <div class="total-line grand-total">
                                <span>Total:</span>
                                <span>₹${previewData.totals.grandTotal.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Amount Paid:</span>
                                <span>₹${previewData.amountPaid.toFixed(2)}</span>
                              </div>
                              <div class="total-line balance ${(previewData.totals.grandTotal - previewData.amountPaid) > 0 ? 'positive' : 'negative'}">
                                <span>Balance:</span>
                                <span>₹${(previewData.totals.grandTotal - previewData.amountPaid).toFixed(2)}</span>
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
                              ${previewData.remark ? `
                                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
                                  <strong>Remarks:</strong><br>
                                  ${previewData.remark}
                                </div>
                              ` : ''}
                            </div>

                          </div>
                        </div>
                      </div>
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
            <Button 
              variant="outline"
              onClick={() => {
                const formData = form.getValues();
                
                const invoiceData = {
                  invoiceNo: invoice?.invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
                  invoiceDate: invoice?.invoiceDate || new Date().toISOString(),
                  shop: {
                    name: selectedShop?.name || "Shop Name",
                    place: selectedShop?.place || "Shop Address",
                    tagline: "Quality Products & Services"
                  },
                  customer: {
                    name: selectedCustomer?.name || "Customer",
                    place: selectedCustomer?.place || "Address",
                    phone: selectedCustomer?.phone?.toString() || "Phone"
                  },
                  paymentDetails: {
                    paymentStatus: formData.paymentStatus,
                    paymentMode: formData.paymentMode,
                    billType: formData.billType,
                    saleType: formData.saleType
                  },
                  items: totals.items.filter(item => item),
                  totals,
                  amountPaid: formData.amountPaid || 0,
                  remark: formData.remark
                };

                // Create a new window for PDF generation
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;

                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Invoice ${invoiceData.invoiceNo}</title>
                      <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                        
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        
                        body { 
                          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                          background: white;
                          padding: 0;
                          line-height: 1.4;
                        }
                        
                        .invoice-container {
                          max-width: 800px;
                          margin: 0 auto;
                          background: white;
                          position: relative;
                          page-break-inside: avoid;
                        }
                        
                        .header-wave {
                          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                          height: 120px;
                          position: relative;
                          overflow: hidden;
                        }
                        
                        .header-wave::after {
                          content: '';
                          position: absolute;
                          bottom: -30px;
                          left: 0;
                          width: 100%;
                          height: 60px;
                          background: white;
                          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
                        }
                        
                        .header-content {
                          position: relative;
                          z-index: 2;
                          color: white;
                          padding: 25px 40px;
                          display: flex;
                          justify-content: space-between;
                          align-items: flex-start;
                        }
                        
                        .logo-section {
                          display: flex;
                          align-items: center;
                          gap: 12px;
                        }
                        
                        .logo-placeholder {
                          width: 45px;
                          height: 45px;
                          background: rgba(255,255,255,0.2);
                          border-radius: 8px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-size: 18px;
                          font-weight: bold;
                          border: 2px solid rgba(255,255,255,0.3);
                        }
                        
                        .company-info h1 {
                          font-size: 24px;
                          font-weight: 700;
                          margin-bottom: 3px;
                          text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        
                        .company-tagline {
                          font-size: 12px;
                          opacity: 0.9;
                          font-weight: 300;
                        }
                        
                        .invoice-title {
                          text-align: right;
                        }
                        
                        .invoice-title h2 {
                          font-size: 32px;
                          font-weight: 300;
                          letter-spacing: 2px;
                          margin-bottom: 5px;
                          text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        
                        .invoice-meta {
                          font-size: 12px;
                          opacity: 0.9;
                        }
                        
                        .content-section {
                          padding: 40px 40px 30px;
                        }
                        
                        .bill-to-section {
                          display: grid;
                          grid-template-columns: 1fr 1fr;
                          gap: 40px;
                          margin-bottom: 30px;
                        }
                        
                        .info-block h3 {
                          color: #2d3748;
                          font-size: 14px;
                          font-weight: 600;
                          margin-bottom: 10px;
                          padding-bottom: 5px;
                          border-bottom: 2px solid #e2e8f0;
                        }
                        
                        .info-block p {
                          color: #4a5568;
                          line-height: 1.5;
                          margin-bottom: 3px;
                          font-size: 13px;
                        }
                        
                        .customer-name {
                          font-weight: 600;
                          color: #2d3748;
                          font-size: 15px;
                        }
                        
                        .items-table {
                          width: 100%;
                          border-collapse: collapse;
                          margin-bottom: 25px;
                          border-radius: 8px;
                          overflow: hidden;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                        }
                        
                        .items-table thead tr {
                          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                        }
                        
                        .items-table th {
                          padding: 12px 10px;
                          font-weight: 600;
                          font-size: 12px;
                          letter-spacing: 0.5px;
                        }
                        
                        .items-table td {
                          padding: 10px;
                          border-bottom: 1px solid #e2e8f0;
                          color: #4a5568;
                          font-size: 12px;
                        }
                        
                        .items-table tbody tr:last-child td {
                          border-bottom: none;
                        }
                        
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .text-left { text-align: left; }
                        
                        .totals-section {
                          display: flex;
                          justify-content: flex-end;
                          margin-bottom: 25px;
                        }
                        
                        .totals-box {
                          background: #f7fafc;
                          padding: 20px;
                          border-radius: 8px;
                          min-width: 280px;
                        }
                        
                        .total-line {
                          display: flex;
                          justify-content: space-between;
                          padding: 4px 0;
                          color: #4a5568;
                          font-size: 13px;
                        }
                        
                        .grand-total {
                          border-top: 2px solid #e2e8f0;
                          margin-top: 10px;
                          padding-top: 10px;
                          font-size: 16px;
                          font-weight: 700;
                          color: #2d3748;
                        }
                        
                        .balance {
                          font-weight: 600;
                          font-size: 14px;
                        }
                        
                        .balance.positive { color: #e53e3e; }
                        .balance.negative { color: #38a169; }
                        
                        .bottom-section {
                          display: grid;
                          grid-template-columns: 2fr 1fr;
                          gap: 25px;
                        }
                        
                        .terms-section {
                          background: #f7fafc;
                          padding: 15px;
                          border-radius: 8px;
                        }
                        
                        .terms-section h3 {
                          color: #2d3748;
                          font-size: 14px;
                          font-weight: 600;
                          margin-bottom: 8px;
                        }
                        
                        .terms-section p {
                          color: #4a5568;
                          font-size: 11px;
                          line-height: 1.4;
                          margin-bottom: 4px;
                        }
                        
                        .signature-section {
                          text-align: center;
                          padding: 15px;
                        }
                        
                        .signature-line {
                          border-top: 2px solid #2d3748;
                          width: 120px;
                          margin: 25px auto 8px;
                        }
                        
                        .signature-text {
                          color: #4a5568;
                          font-size: 12px;
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
                            page-break-inside: avoid;
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
                              <div class="logo-placeholder">
                                ${invoiceData.shop.name.charAt(0)}
                              </div>
                              <div class="company-info">
                                <h1>${invoiceData.shop.name}</h1>
                                <div class="company-tagline">${invoiceData.shop.tagline}</div>
                              </div>
                            </div>
                            <div class="invoice-title">
                              <div class="invoice-meta">
                                <div><strong>Invoice #:</strong> ${invoiceData.invoiceNo}</div>
                                <div><strong>Date:</strong> ${new Date(invoiceData.invoiceDate).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Content Section -->
                        <div class="content-section">
                          <!-- Bill To Section -->
                          <div class="bill-to-section">
                            <div class="info-block">
                              <h3>Invoice To:</h3>
                              <p class="customer-name">${invoiceData.customer.name}</p>
                              <p>📍 ${invoiceData.customer.place}</p>
                              <p>📞 ${invoiceData.customer.phone}</p>
                            </div>
                            <div class="info-block">
                              <h3>Payment Info:</h3>
                              <p><strong>Status:</strong> ${invoiceData.paymentDetails.paymentStatus}</p>
                              <p><strong>Mode:</strong> ${invoiceData.paymentDetails.paymentMode}</p>
                              <p><strong>Type:</strong> ${invoiceData.paymentDetails.billType} ${invoiceData.paymentDetails.saleType}</p>
                            </div>
                          </div>

                          <!-- Items Table -->
                          <table class="items-table">
                            <thead>
                              <tr>
                                <th class="text-left">Item Description</th>
                                <th class="text-center">Qty.</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Discount</th>
                                <th class="text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${invoiceData.items.map((item, index) => `
                                <tr>
                                  <td class="text-left">
                                    <div style="font-weight: 600; color: #2d3748;">${item.product.name}</div>
                                  </td>
                                  <td class="text-center">${item.quantity.toString().padStart(2, '0')}</td>
                                  <td class="text-right">₹${item.unitPrice.toFixed(2)}</td>
                                  <td class="text-right">₹${item.discountAmount.toFixed(2)}</td>
                                  <td class="text-right" style="font-weight: 600; color: #2d3748;">₹${item.totalPrice.toFixed(2)}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>

                          <!-- Totals Section -->
                          <div class="totals-section">
                            <div class="totals-box">
                              <div class="total-line">
                                <span>Sub Total:</span>
                                <span>₹${invoiceData.totals.subtotal.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Discount:</span>
                                <span>- ₹${invoiceData.totals.totalDiscount.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Tax - GST:</span>
                                <span>₹${invoiceData.totals.totalTax.toFixed(2)}</span>
                              </div>
                              <div class="total-line grand-total">
                                <span>Total:</span>
                                <span>₹${invoiceData.totals.grandTotal.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Amount Paid:</span>
                                <span>₹${invoiceData.amountPaid.toFixed(2)}</span>
                              </div>
                              <div class="total-line balance ${(invoiceData.totals.grandTotal - invoiceData.amountPaid) > 0 ? 'positive' : 'negative'}">
                                <span>Balance:</span>
                                <span>₹${(invoiceData.totals.grandTotal - invoiceData.amountPaid).toFixed(2)}</span>
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
                                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
                                  <strong>Remarks:</strong><br>
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
                  {/* Signature Section */}
                  <FormField
                    control={form.control}
                    name="signature"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <SignatureInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Add signature"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button type="submit" className="w-full" disabled={updateInvoiceMutation.isPending}>
                    {updateInvoiceMutation.isPending ? "Updating..." : "Update Invoice"}
                  </Button>
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