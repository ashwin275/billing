// Invoice creation page with direct editing layout
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Save, Eye, FileText, User, Building2, Calendar, CreditCard, Percent, Hash, Phone, MapPin, Package } from "lucide-react";
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
  termsAndConditions: z.string().optional(),
  useCustomBillingAddress: z.boolean().default(false),
  customBillingAddress: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  place: z.string().min(1, "Place is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  shopId: z.number().min(1, "Shop is required"),
  customerType: z.string().default("INDIVIDUAL"),
});

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
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Fetch invoice data for edit mode
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ["/api/invoices", editInvoiceId],
    queryFn: () => invoicesApi.getInvoiceById(parseInt(editInvoiceId!)),
    enabled: isEditMode,
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
      paymentStatus: "PAID",
      remark: "",
      dueDate: null,
      billType: "GST",
      saleType: "RETAIL",
      transactionId: `TXN-${Date.now()}`,
      signature: "",
      saleItems: [{ productId: 0, quantity: 1, discount: 0, discountType: "AMOUNT", unitPrice: 0 }],
      termsAndConditions: "",
      useCustomBillingAddress: false,
      customBillingAddress: "",
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "saleItems"
  });

  // Customer form for adding new customers
  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      place: "",
      phone: "",
      shopId: 0,
      customerType: "INDIVIDUAL",
    },
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceInput) => {
      const response = await invoicesApi.addInvoice(invoiceData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      // Redirect to invoice management tab after creating invoice
      setLocation("/dashboard?tab=invoices");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive"
      });
    }
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceInput) => {
      const response = await invoicesApi.updateInvoice(parseInt(editInvoiceId!), invoiceData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setLocation("/dashboard?tab=invoices");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive"
      });
    }
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      const response = await customersApi.addCustomer(customerData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer added successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/all"] });
      setIsAddCustomerDialogOpen(false);
      customerForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
        variant: "destructive"
      });
    }
  });

  // Calculate totals
  const [totals, setTotals] = useState({
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: 0,
    items: [] as any[]
  });

  // Calculate totals whenever form data changes
  useEffect(() => {
    const subscription = form.watch(() => {
      calculateTotals();
    });
    return () => subscription.unsubscribe();
  }, [form, products]);

  const calculateTotals = () => {
    const formData = form.getValues();
    const saleItems = formData.saleItems || [];
    
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    const itemsWithTotals = saleItems.map(item => {
      const product = products.find(p => p.productId === item.productId);
      if (!product || !item.quantity) {
        return null;
      }

      const unitPrice = item.unitPrice || (formData.saleType === "RETAIL" ? product.retailRate : product.wholesaleRate);
      const lineSubtotal = unitPrice * item.quantity;
      
      // Calculate item discount
      let itemDiscount = 0;
      if (item.discountType === "PERCENTAGE") {
        itemDiscount = (lineSubtotal * item.discount) / 100;
      } else {
        itemDiscount = item.discount;
      }
      
      const lineTotal = lineSubtotal - itemDiscount;
      
      // Calculate tax
      const cgstRate = product.cgst || 0;
      const sgstRate = product.sgst || 0;
      
      const cgstAmount = (lineTotal * cgstRate) / 100;
      const sgstAmount = (lineTotal * sgstRate) / 100;
      
      const itemTotalTax = cgstAmount + sgstAmount;
      const totalPrice = lineTotal + itemTotalTax;
      
      subtotal += lineSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTotalTax;
      
      return {
        ...item,
        product,
        unitPrice,
        lineSubtotal,
        discountAmount: itemDiscount,
        cgstAmount,
        sgstAmount,
        totalPrice
      };
    }).filter(Boolean);

    // Apply overall discount
    let overallDiscount = 0;
    if (formData.discountType === "PERCENTAGE") {
      overallDiscount = (subtotal * formData.discount) / 100;
    } else {
      overallDiscount = formData.discount;
    }
    
    totalDiscount += overallDiscount;
    const grandTotal = subtotal - totalDiscount + totalTax;

    setTotals({
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      items: itemsWithTotals
    });
  };

  // Load invoice data for edit mode
  useEffect(() => {
    if (invoice && isEditMode) {
      const customer = customers.find(c => c.customerId === invoice.customerId);
      const shop = shops.find(s => s.shopId === invoice.shopId);
      
      if (customer) setSelectedCustomer(customer);
      if (shop) setSelectedShop(shop);

      form.reset({
        customerId: invoice.customerId,
        shopId: invoice.shopId,
        discount: invoice.discount || 0,
        discountType: "PERCENTAGE",
        amountPaid: invoice.amountPaid || 0,
        paymentMode: invoice.paymentMode || "CASH",
        paymentStatus: invoice.paymentStatus || "PENDING",
        remark: invoice.remark || "",
        dueDate: invoice.dueDate || null,
        billType: invoice.billType || "GST",
        saleType: invoice.saleType || "RETAIL",
        transactionId: invoice.transactionId || "",
        saleItems: invoice.saleItems || []
      });
    }
  }, [invoice, customers, shops, form, isEditMode]);

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
      saleItems: data.saleItems,
      totalAmount: totals.grandTotal,
      tax: totals.totalTax
    };

    if (isEditMode) {
      updateInvoiceMutation.mutate(invoiceInput);
    } else {
      createInvoiceMutation.mutate(invoiceInput);
    }
  };

  const onAddCustomer = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  const handleFormSubmit = (data: InvoiceFormData) => {
    onSubmit(data);
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowBackWarning(true);
    } else {
      setLocation("/dashboard");
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue("customerId", customer.customerId);
    setIsCustomerSearchDialogOpen(false);
  };

  if (isEditMode && isLoadingInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
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
                const previewData = {
                  invoiceDate: new Date().toISOString(),
                  shop: {
                    name: selectedShop?.name || "Shop Name",
                    place: selectedShop?.place || "Shop Address",
                    gstNo: selectedShop?.gstNo || "",
                    phone: selectedShop?.phone || "",
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

                // Create a new window for preview
                const previewWindow = window.open('', '_blank');
                if (!previewWindow) return;

                previewWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Invoice Preview</title>
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
                                ${previewData.shop.name.charAt(0)}
                              </div>
                              <div class="company-info">
                                <h1>${previewData.shop.name}</h1>
                                <div class="company-tagline">${previewData.shop.tagline}</div>
                                ${previewData.shop.gstNo ? `<div class="company-tagline">GST: ${previewData.shop.gstNo}</div>` : ''}
                                ${previewData.shop.phone ? `<div class="company-tagline">Phone: ${previewData.shop.phone}</div>` : ''}
                              </div>
                            </div>
                            <div class="invoice-title">
                              <div class="invoice-meta">
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
                                <th class="text-left">Product</th>
                                <th class="text-center">HSN</th>
                                <th class="text-center">Qty</th>
                                <th class="text-right">Rate</th>
                                <th class="text-right">Discount</th>
                                <th class="text-right">CGST (%)</th>
                                <th class="text-right">SGST (%)</th>
                                <th class="text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${previewData.items.map((item, index) => `
                                <tr>
                                  <td class="text-left">
                                    <div style="font-weight: 600; color: #2d3748;">${item?.product?.name || 'N/A'}</div>
                                    <div style="font-size: 10px; color: #718096;">${item?.product?.description || ''}</div>
                                  </td>
                                  <td class="text-center">${item?.product?.hsn || 'N/A'}</td>
                                  <td class="text-center">${item?.quantity?.toString().padStart(2, '0') || '0'}</td>
                                  <td class="text-right">₹${item?.unitPrice?.toFixed(2) || '0.00'}</td>
                                  <td class="text-right">₹${item?.discountAmount?.toFixed(2) || '0.00'}</td>
                                  <td class="text-right">
                                    <div>CGST (${item?.product?.cgst || 0}%)</div>
                                    <div style="font-size: 10px;">₹${item?.cgstAmount?.toFixed(2) || '0.00'}</div>
                                  </td>
                                  <td class="text-right">
                                    <div>SGST (${item?.product?.sgst || 0}%)</div>
                                    <div style="font-size: 10px;">₹${item?.sgstAmount?.toFixed(2) || '0.00'}</div>
                                  </td>
                                  <td class="text-right" style="font-weight: 600; color: #2d3748;">₹${item?.totalPrice?.toFixed(2) || '0.00'}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>

                          <!-- Totals Section -->
                          <div class="totals-section">
                            <div class="totals-box">
                              <div class="total-line">
                                <span>Subtotal:</span>
                                <span>₹${previewData.totals.subtotal.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Discount:</span>
                                <span>- ₹${previewData.totals.totalDiscount.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>CGST (9%):</span>
                                <span>₹${(previewData.totals.totalTax / 2).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>SGST (9%):</span>
                                <span>₹${(previewData.totals.totalTax / 2).toFixed(2)}</span>
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
                      
                      <script>
                        window.onload = function() {
                          window.print();
                          setTimeout(function() { window.close(); }, 1000);
                        }
                      </script>
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
              onClick={() => form.handleSubmit(onSubmit)()}
              disabled={isEditMode ? updateInvoiceMutation.isPending : createInvoiceMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditMode 
                ? (updateInvoiceMutation.isPending ? "Updating..." : "Update Invoice")
                : (createInvoiceMutation.isPending ? "Creating..." : "Create Invoice")
              }
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer and Shop Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomerSearchDialog
                    customers={customers}
                    onSelectCustomer={handleSelectCustomer}
                    selectedCustomer={selectedCustomer}
                    open={isCustomerSearchDialogOpen}
                    onOpenChange={setIsCustomerSearchDialogOpen}
                  />
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <Building2 className="h-5 w-5 mr-2" />
                        Shop
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="shopId"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                const shopId = parseInt(value);
                                const shop = shops.find(s => s.shopId === shopId);
                                if (shop) {
                                  setSelectedShop(shop);
                                }
                                field.onChange(shopId);
                              }}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Shop" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {shops.map((shop) => (
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
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium">{selectedShop.name}</p>
                          <p className="text-sm text-gray-600">{selectedShop.place}</p>
                          {selectedShop.gstNo && <p className="text-sm text-gray-600">GST: {selectedShop.gstNo}</p>}
                          {selectedShop.phone && <p className="text-sm text-gray-600">Phone: {selectedShop.phone}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sale Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        Items
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ productId: 0, quantity: 1, discount: 0, discountType: "AMOUNT", unitPrice: 0 })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Item {index + 1}</h4>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <FormField
                            control={form.control}
                            name={`saleItems.${index}.productId`}
                            render={({ field }) => (
                              <FormItem className="lg:col-span-2">
                                <FormLabel>Product</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    const productId = parseInt(value);
                                    const product = products.find(p => p.productId === productId);
                                    if (product) {
                                      const saleType = form.getValues("saleType");
                                      const price = saleType === "RETAIL" ? product.retailRate : product.wholesaleRate;
                                      form.setValue(`saleItems.${index}.unitPrice`, price);
                                    }
                                    field.onChange(productId);
                                  }}
                                  value={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.productId} value={product.productId.toString()}>
                                        {product.name} - ₹{form.getValues("saleType") === "RETAIL" ? product.retailRate : product.wholesaleRate}
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
                            name={`saleItems.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit Price</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                    <SelectItem value="AMOUNT">Amount</SelectItem>
                                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
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
                                <FormLabel>Discount</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Payment and Transaction Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Payment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                      
                      <FormField
                        control={form.control}
                        name="amountPaid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount Paid</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Hash className="h-5 w-5 mr-2" />
                        Transaction Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="transactionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transaction ID</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="GST">GST</SelectItem>
                                <SelectItem value="NON_GST">Non-GST</SelectItem>
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
                    </CardContent>
                  </Card>
                </div>

                {/* Overall Discount and Remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Percent className="h-5 w-5 mr-2" />
                        Overall Discount
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="discountType"
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
                                <SelectItem value="AMOUNT">Amount</SelectItem>
                                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
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
                            <FormLabel>Discount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Remarks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="remark"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Add any additional remarks..."
                                className="resize-none"
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column - Preview and Totals */}
              <div className="space-y-6">
                {/* Invoice Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Invoice Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Shop and Customer Info */}
                    <div className="space-y-3">
                      {selectedShop && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-blue-900">{selectedShop.name}</h4>
                          <p className="text-sm text-blue-700">{selectedShop.place}</p>
                          {selectedShop.gstNo && <p className="text-xs text-blue-600">GST: {selectedShop.gstNo}</p>}
                        </div>
                      )}
                      
                      {selectedCustomer && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-semibold text-green-900">{selectedCustomer.name}</h4>
                          <p className="text-sm text-green-700">{selectedCustomer.place}</p>
                          <p className="text-xs text-green-600">📞 {selectedCustomer.phone}</p>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Invoice Details */}
                    <div className="text-right">
                      <h2 className="text-3xl font-bold text-gray-900 mb-4">INVOICE</h2>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-sm text-gray-600">Date</Label>
                          <p className="font-semibold">{new Date().toLocaleDateString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Transaction ID</Label>
                          <p className="font-semibold">{form.watch("transactionId")}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Totals Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Totals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span>
                        <span className="font-medium">- ₹{totals.totalDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CGST (9%):</span>
                        <span className="font-medium">₹{(totals.totalTax / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (9%):</span>
                        <span className="font-medium">₹{(totals.totalTax / 2).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>₹{totals.grandTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span className="font-medium">₹{form.watch("amountPaid")?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${(totals.grandTotal - (form.watch("amountPaid") || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        <span>Balance:</span>
                        <span>₹{(totals.grandTotal - (form.watch("amountPaid") || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Add New Customer
            </DialogTitle>
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
                          <SelectValue placeholder="Select Shop" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {shops.map((shop) => (
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
              
              <FormField
                control={customerForm.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        <SelectItem value="BUSINESS">Business</SelectItem>
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
                <Button type="submit" disabled={createCustomerMutation.isPending}>
                  {createCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Back Warning Dialog */}
      <AlertDialog open={showBackWarning} onOpenChange={setShowBackWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLocation("/dashboard")}>
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}