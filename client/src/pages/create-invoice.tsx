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
import { Switch } from "@/components/ui/switch";
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
  invoiceDate: z.string().min(1, "Invoice date is required"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).default("PERCENTAGE"),
  additionalDiscountValue: z.number().min(0, "Additional discount cannot be negative").default(0),
  additionalDiscountType: z.enum(["percentage", "amount"]).default("amount"),
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
  name: z.string().min(2, "Name must be at least 2 characters"),
  place: z.string().min(2, "Place must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\d+$/, "Phone number must contain only digits"),
  shopId: z.number().min(1, "Shop is required"),
  customerType: z.string().min(1, "Please select a customer type"),
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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdInvoiceData, setCreatedInvoiceData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  
  // Fetch products - use high page size to get all products at once for invoice creation
  // This ensures all selected products remain available for calculations across the dialog
  const { data: productsResponse } = useQuery({
    queryKey: ["/api/products/paginated", 0, 1000], // Fetch up to 1000 products
    queryFn: () => productsApi.getPaginatedProducts(0, 1000),
  });
  
  // Extract products from paginated response
  const products = productsResponse?.content || [];
  const totalProducts = productsResponse?.totalElements || 0;

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers/all"],
    queryFn: () => customersApi.getAllCustomers(),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Fetch invoice data if in edit mode - always get fresh data
  const { data: editInvoice } = useQuery({
    queryKey: ["/api/invoices", editInvoiceId],
    queryFn: () => invoicesApi.getInvoiceById(parseInt(editInvoiceId!)),
    enabled: isEditMode && !!editInvoiceId,
    staleTime: 0, // Always consider data stale to force refetch
    cacheTime: 0, // Don't cache the data
  });

  // Main invoice form
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: 0,
      shopId: 0,
      invoiceDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      discount: 0,
      additionalDiscountValue: 0,
      additionalDiscountType: "amount",
      discountType: "AMOUNT",
      amountPaid: 0,
      paymentMode: "CASH",
      paymentStatus: "PAID",
      remark: "",
      dueDate: null,
      billType: "GST",
      saleType: "RETAIL",
      transactionId: `TXN${Date.now()}`,
      saleItems: [{ productId: 0, quantity: 1, discount: 0, discountType: "PERCENTAGE" }],
      termsAndConditions: "",
      signature: "",
      useCustomBillingAddress: false,
      customBillingAddress: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "saleItems",
  });

  // Prevent default items from being added
  useEffect(() => {
    if (!isEditMode && fields.length > 0 && form.getValues('saleItems').some(item => item.productId === 0)) {
      form.setValue('saleItems', []);
    }
  }, [fields, form, isEditMode]);

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
      shopId: 0,
      customerType: "",
    },
  });

  // Auto-select shop in customer form if only one is available
  useEffect(() => {
    if (Array.isArray(shops) && shops.length === 1 && !customerForm.getValues('shopId')) {
      customerForm.setValue('shopId', shops[0].shopId);
    }
  }, [shops, customerForm]);

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceInput) => {
      const response = await invoicesApi.addInvoice(invoiceData);
      return response;
    },
    onSuccess: (data, variables) => {
      const invoiceNumber = variables.transactionId;
      const customerName = selectedCustomer?.name || "Customer";
      const currentTotals = calculateTotals();
      
      toast({
        title: "Invoice Created Successfully!",
        description: (
          <div className="space-y-2">
            <p className="text-sm text-green-100">Customer: {customerName}</p>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-white font-medium">PAID</span>
              </div>
              <span className="text-green-200">•</span>
              <span className="font-medium text-white">₹{(currentTotals.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        ),
        className: "bg-green-600 border-green-600 text-white [&>div]:text-white",
        duration: 4000,
      });
      
      // Store created invoice data with backend response
      setCreatedInvoiceData({
        invoiceResponse: data, // Full backend response including invoiceId, invoiceNo
        invoiceNumber: variables.transactionId,
        customer: selectedCustomer,
        shop: selectedShop,
        totals: currentTotals,
        formData: variables
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/all"] });
      
      // Show success dialog instead of navigating
      setShowSuccessDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Invoice",
        description: (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{error?.detail || error?.message || "An unexpected error occurred while creating the invoice."}</p>
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  // Retry with current form data
                  const formData = form.getValues();
                  const totals = calculateTotals();
                  const invoiceInput = {
                    ...formData,
                    totalAmount: totals.grandTotal,
                    tax: totals.totalTax,
                  };
                  createInvoiceMutation.mutate(invoiceInput);
                }}
                className="h-8 px-3 text-xs"
              >
                Try Again
              </Button>
            </div>
          </div>
        ),
        variant: "destructive",
        duration: 10000,
      });
    },
  });

  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceInput) => {
      await invoicesApi.updateInvoice(parseInt(editInvoiceId!), invoiceData);
    },
    onSuccess: () => {
      toast({
        title: "Invoice updated successfully",
        description: "The invoice has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/all"] });
      setLocation("/dashboard?tab=invoices");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update invoice",
        description: error?.detail || error?.message || "Failed to update invoice.",
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

  // Calculate totals with reactivity
  const calculateTotals = () => {
    const formData = form.watch();
    
    if (!selectedCustomer || !selectedShop) return { subtotal: 0, totalTax: 0, totalDiscount: 0, overallDiscountAmount: 0, grandTotal: 0, items: [], itemDiscounts: 0, itemsBeforeDiscount: 0 };

    const items = formData.saleItems.map(item => {
      const product = Array.isArray(products) ? products.find(p => p.productId === item.productId) : null;
      if (!product) return null;

      const unitPrice = formData.saleType === 'RETAIL' ? product.retailRate : product.wholesaleRate;
      const itemSubtotal = unitPrice * item.quantity;
      
      let discountAmount = 0;
      if (item.discountType === 'PERCENTAGE') {
        discountAmount = (itemSubtotal * item.discount) / 100;
      } else {
        discountAmount = item.discount; // Apply discount to total product value
      }
      
      const lineTotal = itemSubtotal - discountAmount;
      
      const cgstRate = formData.billType === 'GST' ? (product.cgst || 0) : 0;
      const sgstRate = formData.billType === 'GST' ? (product.sgst || 0) : 0;
      
      const cgstAmount = (lineTotal * cgstRate) / 100;
      const sgstAmount = (lineTotal * sgstRate) / 100;
      const taxAmount = cgstAmount + sgstAmount;
      const totalPrice = lineTotal + taxAmount; // Total price includes tax

      return {
        product,
        quantity: item.quantity,
        discount: item.discount,
        discountType: item.discountType,
        discountAmount,
        unitPrice,
        itemSubtotal,
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
    
    // Calculate totals before and after discounts
    const itemsBeforeDiscount = items.reduce((sum, item) => sum + (item?.itemSubtotal || 0), 0);
    const itemDiscounts = items.reduce((sum, item) => sum + (item?.discountAmount || 0), 0);
    
    // Calculate additional discount
    let additionalDiscountAmount = 0;
    if (formData.additionalDiscountValue > 0) {
      if (formData.additionalDiscountType === "percentage") {
        additionalDiscountAmount = (subtotal * formData.additionalDiscountValue) / 100;
      } else {
        additionalDiscountAmount = formData.additionalDiscountValue;
      }
    }
    
    // Grand total is subtotal minus additional discounts plus taxes (CGST + SGST)
    let grandTotal = subtotal - additionalDiscountAmount + totalTax;
    
    // Apply auto round-off if enabled
    if (autoRoundOff) {
      grandTotal = Math.round(grandTotal);
    }

    console.log('Tax calculation debug:', { 
      subtotal, 
      totalTax, 
      itemsCount: items.length,
      billType: formData.billType,
      items: items.map(item => ({ name: item?.product?.name, cgst: item?.cgst, sgst: item?.sgst, taxAmount: item?.taxAmount }))
    });
    
    return { 
      subtotal, 
      totalTax, 
      totalDiscount: itemDiscounts + additionalDiscountAmount, 
      overallDiscountAmount: itemDiscounts + additionalDiscountAmount, 
      grandTotal, 
      items, 
      itemDiscounts,
      additionalDiscountAmount,
      itemsBeforeDiscount 
    };
  };

  const totals = calculateTotals();

  // Handle form submission
  const onSubmit = (data: InvoiceFormData) => {
    const totals = calculateTotals();
    
    const invoiceInput: InvoiceInput = {
      customerId: data.customerId,
      shopId: data.shopId,
      invoiceDate: data.invoiceDate,
      discount: totals.additionalDiscountAmount, // Send only additional discount value to backend
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      paymentStatus: data.paymentStatus,
      remark: data.remark,
      dueDate: data.dueDate,
      billType: data.billType,
      saleType: data.saleType,
      transactionId: data.transactionId,
      totalAmount: totals.grandTotal,
      tax: totals.totalTax,
      saleItems: data.saleItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        discount: item.discount,
      })),
    };

    if (isEditMode) {
      updateInvoiceMutation.mutate(invoiceInput);
    } else {
      createInvoiceMutation.mutate(invoiceInput);
    }
  };

  // Handle add customer
  const onAddCustomer = (data: CustomerFormData) => {
    const customerInput = {
      name: data.name,
      place: data.place,
      phone: data.phone,
      shopId: data.shopId,
      customerType: data.customerType,
    };
    addCustomerMutation.mutate(customerInput);
  };

  // Update selected customer when form changes
  useEffect(() => {
    const customerId = form.watch("customerId");
    const customer = Array.isArray(customers) ? customers.find(c => c.customerId === customerId) : null;
    setSelectedCustomer(customer || null);
  }, [form.watch("customerId"), customers]);

  // Update selected shop when form changes
  useEffect(() => {
    const shopId = form.watch("shopId");
    const shop = Array.isArray(shops) ? shops.find(s => s.shopId === shopId) : null;
    setSelectedShop(shop || null);
  }, [form.watch("shopId"), shops]);

  // Populate form with edit data
  useEffect(() => {
    if (isEditMode && editInvoice) {
      form.reset({
        customerId: editInvoice.customerId,
        shopId: editInvoice.shopId,
        invoiceDate: editInvoice.invoiceDate ? editInvoice.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
        discount: editInvoice.discount || 0,
        discountType: "AMOUNT",
        amountPaid: editInvoice.amountPaid || 0,
        paymentMode: editInvoice.paymentMode,
        paymentStatus: editInvoice.paymentStatus,
        remark: editInvoice.remark || "",
        dueDate: editInvoice.dueDate ? editInvoice.dueDate.split('T')[0] : null,
        billType: editInvoice.billType || "GST",
        saleType: editInvoice.saleType || "RETAIL",
        transactionId: editInvoice.transactionId || `TXN${Date.now()}`,
        saleItems: editInvoice.saleItems && editInvoice.saleItems.length > 0 
          ? editInvoice.saleItems.map(item => ({
              productId: item.product?.productId || 0,
              quantity: item.quantity,
              discount: item.discount,
              discountType: "AMOUNT" as const,
              unitPrice: item.unitPrice || 0
            }))
          : [],
      });
    }
  }, [isEditMode, editInvoice, form]);

  // Auto-update amount paid to match grand total for both new and edited invoices
  useEffect(() => {
    if (totals.grandTotal > 0) {
      // Always update amount paid to match grand total when it changes
      form.setValue('amountPaid', totals.grandTotal);
    }
  }, [totals.grandTotal, form]);

  // Track form changes to detect unsaved data
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Reset unsaved changes flag when form is submitted
  const handleFormSubmit = (data: InvoiceFormData) => {
    setHasUnsavedChanges(false);
    if (isEditMode) {
      const totals = calculateTotals();
      updateInvoiceMutation.mutate({
        ...data,
        totalAmount: totals.grandTotal,
        tax: totals.totalTax,
      });
    } else {
      const totals = calculateTotals();
      createInvoiceMutation.mutate({
        ...data,
        totalAmount: totals.grandTotal,
        tax: totals.totalTax,
      });
    }
  };

  // Handle back button with warning
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowBackWarning(true);
    } else {
      setLocation("/dashboard");
    }
  };

  // Confirm navigation away
  const handleConfirmNavigation = () => {
    setShowBackWarning(false);
    setHasUnsavedChanges(false);
    setLocation("/dashboard");
  };

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customerId', customer.customerId);
  };

  // @ts-ignore
  // Download PDF function - using exact same design as preview  
  const downloadInvoicePDF = () => {
    if (!createdInvoiceData) return;
    
    const { customer, shop, totals, formData, invoiceResponse } = createdInvoiceData;
    
    const previewData = {
      invoiceId: invoiceResponse?.invoiceId || null,
      invoiceNo: invoiceResponse?.invoiceNo || null,
      invoiceDate: new Date().toISOString(),
      shop: {
        name: shop.name,
        place: shop.place,
        address: shop.address || "",
        gstNo: shop.gstNo || "",
        phone: shop.phone || "",
        logo: shop.logo || null,
        tagline: shop.description || "Quality Products & Services"
      },
      customer: {
        name: customer.name,
        place: customer.place,
        phone: customer.phone
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

    // Create PDF window with EXACT same template as existing preview function
    const pdfWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!pdfWindow) return;

    pdfWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Invoice ${previewData.invoiceNo || previewData.invoiceId ? `- ${previewData.invoiceNo || previewData.invoiceId}` : ''}</title>
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
                          height: 180px;
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
                          color: #000000;
                          padding: 25px 40px;
                          display: flex;
                          justify-content: space-between;
                          align-items: flex-start;
                        }
                        
                        .logo-section {
                          display: flex;
                          align-items: center;
                          gap: 15px;
                        }
                        
                        .logo-placeholder {
                          width: 50px;
                          height: 50px;
                          background: rgba(255,255,255,0.2);
                          border-radius: 10px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-size: 20px;
                          font-weight: bold;
                          border: 2px solid rgba(255,255,255,0.3);
                        }
                        
                        .company-info h1 {
                          font-size: 26px;
                          font-weight: 700;
                          margin-bottom: 5px;
                          text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        
                        .company-tagline {
                          font-size: 13px;
                          opacity: 0.9;
                          font-weight: 300;
                        }
                        
                        .invoice-title {
                          text-align: right;
                        }
                        
                        .invoice-title h2 {
                          font-size: 34px;
                          font-weight: 300;
                          letter-spacing: 2px;
                          margin-bottom: 5px;
                          text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        
                        .invoice-meta {
                          font-size: 13px;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000; font-weight: 700;
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
                          font-weight: 700;
                        }
                        
                        @media print {
                          body { padding: 0; background: white; }
                          .invoice-container { box-shadow: none; }
                          .header-wave::after { display: none; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="invoice-container">
                        <!-- Header Section -->
                        <div class="header-wave">
                          <div class="header-content">
                            <div class="logo-section">
                              <div class="logo-placeholder">
                                ${previewData.shop.logo ? `<img src="${previewData.shop.logo}" alt="${previewData.shop.name} Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 10px;" onerror="this.style.display='none'; this.parentElement.innerHTML='${previewData.shop.name.charAt(0)}'; this.parentElement.style.fontSize='20px'; this.parentElement.style.fontWeight='bold';" />` : previewData.shop.name.charAt(0)}
                              </div>
                              <div class="company-info">
                                <h1>${previewData.shop.name}</h1>
                                <div class="company-tagline">${previewData.shop.tagline}</div>
                                ${previewData.shop.address ? `<div style="font-size: 11px; margin-top: 3px; opacity: 0.9;">${previewData.shop.address}</div>` : ''}
                                ${previewData.shop.place ? `<div style="font-size: 11px; margin-top: 2px; opacity: 0.9;">📍 ${previewData.shop.place}</div>` : ''}
                                ${previewData.shop.gstNo ? `<div style="font-size: 11px; margin-top: 2px; opacity: 0.9;">GST: ${previewData.shop.gstNo}</div>` : ''}
                                ${previewData.shop.phone ? `<div style="font-size: 11px; margin-top: 2px; opacity: 0.9;">📞 ${previewData.shop.phone}</div>` : ''}
                              </div>
                            </div>
                            <div class="invoice-title">
                              <h2>INVOICE</h2>
                              <div class="invoice-meta">
                                ${previewData.invoiceNo ? `<div style="font-weight: 600; margin-bottom: 3px;">${previewData.invoiceNo}</div>` : ''}
                                <div>${new Date(previewData.invoiceDate).toLocaleDateString('en-GB')}</div>
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
                            </div>
                          </div>

                          <!-- Items Table -->
                          <table class="items-table">
                            <thead>
                              <tr>
                                <th class="text-left">Item Description</th>
                                <th class="text-center">Product Number</th>
                                <th class="text-center">HSN</th>
                                <th class="text-center">Qty.</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Discount</th>
                                <th class="text-right">CGST</th>
                                <th class="text-right">SGST</th>
                                <th class="text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${previewData.items.map((item, index) => `
                                <tr>
                                  <td class="text-left">
                                    <div style="font-weight: 600; color: #000000; font-weight: 700;">${item?.product?.name || 'N/A'}</div>
                                  </td>
                                  <td class="text-center">${item?.product?.productNumber || 'N/A'}</td>
                                  <td class="text-center">${item?.product?.hsn || 'N/A'}</td>
                                  <td class="text-center">${item?.quantity?.toString().padStart(2, '0') || '0'}</td>
                                  <td class="text-right">₹${item?.unitPrice?.toFixed(2) || '0.00'}</td>
                                  <td class="text-right">₹${item?.discountAmount?.toFixed(2) || '0.00'}</td>
                                  <td class="text-right">
                                    <div>${item?.product?.cgst || 0}%</div>
                                    <div style="font-size: 10px; color: #666;">₹${(item?.cgstAmount || 0).toFixed(2)}</div>
                                  </td>
                                  <td class="text-right">
                                    <div>${item?.product?.sgst || 0}%</div>
                                    <div style="font-size: 10px; color: #666;">₹${(item?.sgstAmount || 0).toFixed(2)}</div>
                                  </td>
                                  <td class="text-right" style="font-weight: 600; color: #000000; font-weight: 700;">₹${item?.totalPrice?.toFixed(2) || '0.00'}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>

                          <!-- Totals Section -->
                          <div class="totals-section">
                            <div class="totals-box">
                              <div class="total-line">
                                <span>Sub Total:</span>
                                <span>₹${(previewData.totals.subtotal || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Total discount:</span>
                                <span>- ₹${(previewData.totals.itemDiscounts || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Round off:</span>
                                <span>- ₹${(previewData.totals.additionalDiscountAmount || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Total CGST:</span>
                                <span>₹${((previewData.totals.totalTax || 0) / 2).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Total SGST:</span>
                                <span>₹${((previewData.totals.totalTax || 0) / 2).toFixed(2)}</span>
                              </div>
                              <div class="total-line grand-total">
                                <span>Grand Total:</span>
                                <span>₹${(previewData.totals.grandTotal || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Amount Paid:</span>
                                <span>₹${(previewData.amountPaid || 0).toFixed(2)}</span>
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

                            <div class="signature-section">
                              <div class="signature-line"></div>
                              <p class="signature-text">Authorized Signature</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <script>
                        window.onload = function() {
                          setTimeout(() => {
                            window.print();
                          }, 500);
                        }
                      </script>
                    </body>
                  </html>
                `);
    
    pdfWindow.document.close();
  };

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
                    name: selectedShop.name,
                    place: selectedShop.place,
                    address: selectedShop.address || "",
                    gstNo: selectedShop.gstNo || "",
                    phone: selectedShop.phone || "",
                    logo: selectedShop.logo || null,
                    tagline: selectedShop.description || "Quality Products & Services"
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
                          height: 180px;
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
                          color: #000000;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000; font-weight: 700;
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
                          font-weight: 700;
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
                          font-weight: 700;
                          font-size: 13px;
                        }
                        
                        .btn-close {
                          background: #e53e3e;
                          color: #000000;
                        }
                        
                        .btn-print {
                          background: #4299e1;
                          color: #000000;
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
                                ${previewData.shop.logo ? `<img src="${previewData.shop.logo}" alt="${previewData.shop.name} Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" onerror="this.style.display='none'; this.parentElement.innerHTML='${previewData.shop.name.charAt(0)}'; this.parentElement.style.fontSize='20px'; this.parentElement.style.fontWeight='bold';" />` : previewData.shop.name.charAt(0)}
                              </div>
                              <div class="company-info">
                                <h1>${previewData.shop.name}</h1>
                                <div class="company-tagline">${previewData.shop.tagline}</div>
                                ${previewData.shop.address ? `<div style="font-size: 11px; margin-top: 3px; opacity: 0.9;">${previewData.shop.address}</div>` : ''}
                                ${previewData.shop.place ? `<div style="font-size: 11px; margin-top: 2px; opacity: 0.9;">📍 ${previewData.shop.place}</div>` : ''}
                                ${previewData.shop.gstNo ? `<div style="font-size: 11px; margin-top: 2px; opacity: 0.9;">GST: ${previewData.shop.gstNo}</div>` : ''}
                                ${previewData.shop.phone ? `<div style="font-size: 11px; margin-top: 2px; opacity: 0.9;">📞 ${previewData.shop.phone}</div>` : ''}
                              </div>
                            </div>
                            <div class="invoice-title">
                              <h2>INVOICE</h2>
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
                            </div>
                          </div>

                          <!-- Items Table -->
                          <table class="items-table">
                            <thead>
                              <tr>
                                <th class="text-left">Item Description</th>
                                <th class="text-center">Product Number</th>
                                <th class="text-center">HSN</th>
                                <th class="text-center">Qty.</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Discount</th>
                                <th class="text-right">CGST</th>
                                <th class="text-right">SGST</th>
                                <th class="text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${previewData.items.map((item, index) => `
                                <tr>
                                  <td class="text-left">
                                    <div style="font-weight: 600; color: #000000; font-weight: 700;">${item?.product?.name || 'N/A'}</div>
                                  </td>
                                  <td class="text-center">${item?.product?.productNumber || 'N/A'}</td>
                                  <td class="text-center">${item?.product?.hsn || 'N/A'}</td>
                                  <td class="text-center">${item?.quantity?.toString().padStart(2, '0') || '0'}</td>
                                  <td class="text-right">₹${item?.unitPrice?.toFixed(2) || '0.00'}</td>
                                  <td class="text-right">₹${item?.discountAmount?.toFixed(2) || '0.00'}</td>
                                  <td class="text-right">
                                    <div>${item?.product?.cgst || 0}%</div>
                                    <div style="font-size: 10px; color: #666;">₹${(item?.cgstAmount || 0).toFixed(2)}</div>
                                  </td>
                                  <td class="text-right">
                                    <div>${item?.product?.sgst || 0}%</div>
                                    <div style="font-size: 10px; color: #666;">₹${(item?.sgstAmount || 0).toFixed(2)}</div>
                                  </td>
                                  <td class="text-right" style="font-weight: 600; color: #000000; font-weight: 700;">₹${item?.totalPrice?.toFixed(2) || '0.00'}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>

                          <!-- Totals Section -->
                          <div class="totals-section">
                            <div class="totals-box">
                              <div class="total-line">
                                <span>Sub Total:</span>
                                <span>₹${(previewData.totals.subtotal || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Total discount:</span>
                                <span>- ₹${(previewData.totals.itemDiscounts || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Round off:</span>
                                <span>- ₹${(previewData.totals.additionalDiscountAmount || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Total CGST:</span>
                                <span>₹${((previewData.totals.totalTax || 0) / 2).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Total SGST:</span>
                                <span>₹${((previewData.totals.totalTax || 0) / 2).toFixed(2)}</span>
                              </div>
                              <div class="total-line grand-total">
                                <span>Grand Total:</span>
                                <span>₹${(previewData.totals.grandTotal || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Amount Paid:</span>
                                <span>₹${(previewData.amountPaid || 0).toFixed(2)}</span>
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
                if (!selectedCustomer || !selectedShop) return;
                
                const formData = form.getValues();
                const totals = calculateTotals();
                
                const invoiceData = {
                  invoiceDate: new Date().toISOString(),
                  shop: {
                    name: selectedShop.name,
                    place: selectedShop.place,
                    address: selectedShop.address || "",
                    gstNo: selectedShop.gstNo || "",
                    phone: selectedShop.phone || "",
                    logo: selectedShop.logo || null,
                    tagline: selectedShop.description || "Quality Products & Services"
                  },
                  customer: {
                    name: selectedCustomer.name,
                    place: selectedCustomer.place,
                    phone: selectedCustomer.phone?.toString() || ""
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
                      <title>Invoice Preview</title>
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
                          height: 180px;
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
                          color: #000000;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000;
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
                          color: #000000; font-weight: 700;
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
                          color: #000000; font-weight: 700;
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
                          font-weight: 700;
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
                                ${invoiceData.shop.logo ? `<img src="${invoiceData.shop.logo}" alt="${invoiceData.shop.name} Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'; this.parentElement.innerHTML='${invoiceData.shop.name.charAt(0)}'; this.parentElement.style.fontSize='18px'; this.parentElement.style.fontWeight='bold';" />` : invoiceData.shop.name.charAt(0)}
                              </div>
                              <div class="company-info">
                                <h1>${invoiceData.shop.name}</h1>
                                <div class="company-tagline">${invoiceData.shop.tagline}</div>
                                ${invoiceData.shop.address ? `<div class="company-tagline">${invoiceData.shop.address}</div>` : ''}
                                ${invoiceData.shop.place ? `<div class="company-tagline">📍 ${invoiceData.shop.place}</div>` : ''}
                                ${invoiceData.shop.gstNo ? `<div class="company-tagline">GST: ${invoiceData.shop.gstNo}</div>` : ''}
                                ${invoiceData.shop.phone ? `<div class="company-tagline">Phone: ${invoiceData.shop.phone}</div>` : ''}
                              </div>
                            </div>
                            <div class="invoice-title">
                              <div class="invoice-meta">
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
                            </div>
                          </div>

                          <!-- Items Table -->
                          <table class="items-table">
                            <thead>
                              <tr>
                                <th class="text-left">Item Description</th>
                                <th class="text-center">Product Number</th>
                                <th class="text-center">HSN</th>
                                <th class="text-center">Qty.</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Discount</th>
                                <th class="text-right">CGST</th>
                                <th class="text-right">SGST</th>
                                <th class="text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${invoiceData.items.map((item, index) => `
                                <tr>
                                  <td class="text-left">
                                    <div style="font-weight: 600; color: #000000; font-weight: 700;">${item?.product?.name || 'N/A'}</div>
                                  </td>
                                  <td class="text-center">${item?.product?.productNumber || 'N/A'}</td>
                                  <td class="text-center">${item?.product?.hsn || 'N/A'}</td>
                                  <td class="text-center">${item?.quantity?.toString().padStart(2, '0') || '0'}</td>
                                  <td class="text-right">₹${item?.unitPrice?.toFixed(2) || '0.00'}</td>
                                  <td class="text-right">₹${item?.discountAmount?.toFixed(2) || '0.00'}</td>
                                  <td class="text-right">
                                    <div>${item?.product?.cgst || 0}%</div>
                                    <div style="font-size: 10px; color: #666;">₹${(item?.cgstAmount || 0).toFixed(2)}</div>
                                  </td>
                                  <td class="text-right">
                                    <div>${item?.product?.sgst || 0}%</div>
                                    <div style="font-size: 10px; color: #666;">₹${(item?.sgstAmount || 0).toFixed(2)}</div>
                                  </td>
                                  <td class="text-right" style="font-weight: 600; color: #000000; font-weight: 700;">₹${item?.totalPrice?.toFixed(2) || '0.00'}</td>
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
                                <span>Total discount:</span>
                                <span>- ₹${invoiceData.totals.itemDiscounts.toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Round off:</span>
                                <span>- ₹${(invoiceData.totals.additionalDiscountAmount || 0).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Total CGST:</span>
                                <span>₹${((invoiceData.totals.totalTax || 0) / 2).toFixed(2)}</span>
                              </div>
                              <div class="total-line">
                                <span>Total SGST:</span>
                                <span>₹${((invoiceData.totals.totalTax || 0) / 2).toFixed(2)}</span>
                              </div>
                              <div class="total-line grand-total">
                                <span>Grand Total:</span>
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
              disabled={isEditMode ? updateInvoiceMutation.isPending : createInvoiceMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditMode 
                ? (updateInvoiceMutation.isPending ? "Saving..." : "Save")
                : (createInvoiceMutation.isPending ? "Saving..." : "Save")
              }
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Invoice Layout */}
            <Card className="bg-white">
              <CardContent className="p-8">
                {/* Header Section */}
                <div className="mb-8">
                  <div className="flex justify-between items-start">
                    {/* Shop Info */}
                    <div className="flex-1">
{Array.isArray(shops) && shops.length === 1 ? (
                        // Show shop info directly when only one shop exists
                        <div>
                          <FormLabel className="text-sm text-gray-600">Shop</FormLabel>
                          <div className="border border-gray-300 text-2xl font-bold text-gray-900 p-3 rounded-md bg-gray-50">
                            {shops[0].name}
                          </div>
                        </div>
                      ) : (
                        // Show dropdown when multiple shops exist
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
                      )}
                      {selectedShop && (
                        <div className="mt-2">
                          <FormField
                            control={form.control}
                            name="useCustomBillingAddress"
                            render={({ field }) => (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="rounded"
                                />
                                <label className="text-sm">Use custom billing address</label>
                              </div>
                            )}
                          />
                          {form.watch("useCustomBillingAddress") ? (
                            <FormField
                              control={form.control}
                              name="customBillingAddress"
                              render={({ field }) => (
                                <Textarea
                                  {...field}
                                  placeholder="Enter custom billing address"
                                  className="mt-2 text-gray-600"
                                />
                              )}
                            />
                          ) : (
                            <p className="text-gray-600 mt-1">{selectedShop.place}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Invoice Details */}
                    <div className="text-right">
                      <h2 className="text-3xl font-bold text-gray-900 mb-4">INVOICE</h2>
                      <div className="space-y-2">
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

                {/* Customer and Settings Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Bill To */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Bill To:</h3>
                      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" size="sm" className="bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white border-0">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Customer
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Customer</DialogTitle>
                          </DialogHeader>
                          <Form {...customerForm}>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              customerForm.handleSubmit(onAddCustomer)(e);
                            }} className="space-y-4">
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
                                name="customerType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Customer Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select customer type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                                        <SelectItem value="DEALER">Dealer</SelectItem>
                                        <SelectItem value="CREDIT">Credit</SelectItem>
                                        <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                                      </SelectContent>
                                    </Select>
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
                    
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left h-12 border-dashed border-2"
                        onClick={() => setIsCustomerSearchDialogOpen(true)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        {selectedCustomer ? (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{selectedCustomer.name} - {selectedCustomer.place}</span>
                            <span className="text-xs text-gray-500">{selectedCustomer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Select Customer</span>
                        )}
                      </Button>
                    </div>
                    
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

                  {/* Invoice Settings */}
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
                                <SelectTrigger className="border-2 border-gray-300 p-2 font-semibold bg-white rounded-md cursor-pointer hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors">
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
                      name="invoiceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              max={new Date().toISOString().split('T')[0]}
                              className="border-2 border-gray-300 p-2 font-semibold bg-white rounded-md cursor-pointer hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" value={field.value || ""} className="border-2 border-gray-300 p-2 font-semibold bg-white rounded-md cursor-pointer hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Items Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                    <ProductSearchDialog
                      saleType={form.watch("saleType")}
                      existingItems={fields.map((field, index) => {
                        const productId = form.watch(`saleItems.${index}.productId`);
                        const product = Array.isArray(products) ? products.find(p => p.productId === productId) : null;
                        if (!product) return null;
                        return {
                          ...product,
                          quantity: form.watch(`saleItems.${index}.quantity`) || 1,
                          discountAmount: form.watch(`saleItems.${index}.discount`) || 0
                        };
                      }).filter((item): item is NonNullable<typeof item> => item !== null)}
                      onSelect={(selectedProducts) => {
                        // Replace all items with new selection
                        form.setValue('saleItems', []);
                        selectedProducts.forEach((product) => {
                          const rate = form.watch("saleType") === 'RETAIL' ? product.retailRate : product.wholesaleRate;
                          append({
                            productId: product.productId,
                            quantity: product.quantity,
                            unitPrice: rate,
                            discount: product.discountAmount || 0,
                            discountType: "AMOUNT"
                          });
                        });
                      }}
                      trigger={
                        <Button size="sm" className="bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white border-0" data-testid="button-add-invoice-items">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Items
                        </Button>
                      }
                    />
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

                    {fields.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Package className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                        <p>No items added yet. Click "Add Items" to get started.</p>
                      </div>
                    ) : fields.map((field, index) => {
                      const selectedProduct = Array.isArray(products) ? products.find(p => p.productId === form.watch(`saleItems.${index}.productId`)) : null;
                      const quantity = form.watch(`saleItems.${index}.quantity`) || 0;
                      const discount = form.watch(`saleItems.${index}.discount`) || 0;
                      const discountType = form.watch(`saleItems.${index}.discountType`) || "AMOUNT";
                      
                      let itemTotal = 0;
                      let cgstAmount = 0;
                      let sgstAmount = 0;
                      
                      if (selectedProduct) {
                        const saleType = form.watch("saleType");
                        const unitPrice = saleType === 'RETAIL' ? selectedProduct.retailRate : selectedProduct.wholesaleRate;
                        
                        const baseAmount = unitPrice * quantity;
                        let discountAmount = 0;
                        
                        if (discountType === 'PERCENTAGE') {
                          discountAmount = (baseAmount * discount) / 100;
                        } else {
                          discountAmount = discount;
                        }
                        
                        itemTotal = baseAmount - discountAmount;
                        
                        // Calculate CGST/SGST for display only (not added to total)
                        cgstAmount = (itemTotal * (selectedProduct.cgst || 0)) / 100;
                        sgstAmount = (itemTotal * (selectedProduct.sgst || 0)) / 100;
                      }

                      return (
                        <div key={field.id} className="grid grid-cols-12 gap-4 p-4 border-b items-center">
                          <div className="col-span-3">
                            <div className="text-sm font-medium">
                              {selectedProduct ? selectedProduct.name : 'Unknown Product'}
                            </div>
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
                                  type="text"
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow empty string or valid numbers
                                    if (value === '' || /^\d+$/.test(value)) {
                                      const qty = value === '' ? '' : parseInt(value);
                                      field.onChange(qty);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Ensure minimum value on blur
                                    const value = e.target.value;
                                    if (value === '' || parseInt(value) < 1) {
                                      field.onChange(1);
                                    }
                                  }}
                                  className="text-center h-8"
                                />
                              )}
                            />
                          </div>
                          
                          <div className="col-span-1">
                            <div className="text-sm text-center">
                              ₹{selectedProduct ? (form.watch("saleType") === 'RETAIL' ? selectedProduct.retailRate : selectedProduct.wholesaleRate).toFixed(2) : '0.00'}
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <div className="flex space-x-1">
                              <FormField
                                control={form.control}
                                name={`saleItems.${index}.discount`}
                                render={({ field }) => (
                                  <Input
                                    type="text"
                                    value={field.value || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Allow empty string or valid decimal numbers
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        const discount = value === '' ? '' : parseFloat(value) || 0;
                                        field.onChange(discount);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // Ensure minimum value on blur
                                      const value = e.target.value;
                                      if (value === '') {
                                        field.onChange(0);
                                      }
                                    }}
                                    className="flex-1 h-8"
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
                            {form.watch("billType") === 'GST' && selectedProduct ? (
                              <div>
                                <div>{selectedProduct.cgst || 0}%</div>
                                <div className="text-xs">₹{cgstAmount.toFixed(2)}</div>
                              </div>
                            ) : '-'}
                          </div>
                          
                          <div className="col-span-1 text-sm text-gray-600">
                            {form.watch("billType") === 'GST' && selectedProduct ? (
                              <div>
                                <div>{selectedProduct.sgst || 0}%</div>
                                <div className="text-xs">₹{sgstAmount.toFixed(2)}</div>
                              </div>
                            ) : '-'}
                          </div>
                          
                          <div className="col-span-1 font-semibold">
                            ₹{(itemTotal + cgstAmount + sgstAmount).toFixed(2)}
                          </div>
                          
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Totals Section */}
                <div className="flex justify-end">
                  <div className="w-96 space-y-4">
                    {/* Overall Discount - Display Only */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Overall Discount:</span>
                      <span className="font-semibold text-gray-900">₹{(totals.itemDiscounts + (totals.additionalDiscountAmount || 0)).toFixed(2)}</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total (Before Discount):</span>
                        <span className="font-semibold">₹{totals.itemsBeforeDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Item Discounts:</span>
                        <span>-₹{totals.itemDiscounts.toFixed(2)}</span>
                      </div>
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
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Grand Total:</span>
                        <span className="font-semibold text-lg">₹{totals.grandTotal.toFixed(2)}</span>
                      </div>

                      {/* Amount Paid Section */}
                      <div className="flex items-center justify-between pt-2">
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
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="w-32 text-right"
                              placeholder={totals.grandTotal.toFixed(2)}
                            />
                          )}
                        />
                      </div>
                      
                      {/* Balance Calculation */}
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Balance:</span>
                        <span className={totals.grandTotal - (form.watch("amountPaid") || 0) > 0 ? "text-red-600" : "text-green-600"}>
                          ₹{(totals.grandTotal - (form.watch("amountPaid") || 0)).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Auto Round Off Toggle */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-gray-700">Auto Round Off</span>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={autoRoundOff}
                            onCheckedChange={setAutoRoundOff}
                          />
                          <span className="text-xs text-gray-500">
                            {autoRoundOff ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Discount Section */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">Additional Discount</label>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="additionalDiscountType"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage</SelectItem>
                                  <SelectItem value="amount">Amount</SelectItem>
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
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="0"
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow empty string or valid decimal numbers
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      const discount = value === '' ? '' : parseFloat(value) || 0;
                                      field.onChange(discount);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Ensure minimum value on blur
                                    const value = e.target.value;
                                    if (value === '') {
                                      field.onChange(0);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="text-sm text-gray-600 space-y-1 mt-4">
                        <div className="flex justify-between border-b border-gray-300 pb-1">
                          <span>Additional Discount Amount:</span>
                          <span>₹{(totals.additionalDiscountAmount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => form.handleSubmit(onSubmit)()}
                      disabled={isEditMode ? updateInvoiceMutation.isPending : createInvoiceMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isEditMode 
                        ? (updateInvoiceMutation.isPending ? "Saving..." : "Save")
                        : (createInvoiceMutation.isPending ? "Saving..." : "Save")
                      }
                    </Button>
                  </div>
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
                  variant="outline"
                  onClick={downloadInvoicePDF}
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

        {/* Back Warning Dialog */}
        <AlertDialog open={showBackWarning} onOpenChange={setShowBackWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Are you sure you want to leave this page?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay on Page</AlertDialogCancel>
              <AlertDialogAction onClick={() => setLocation("/dashboard")}>
                Leave Page
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Customer Search Dialog */}
        <CustomerSearchDialog
          open={isCustomerSearchDialogOpen}
          onOpenChange={setIsCustomerSearchDialogOpen}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={handleSelectCustomer}
        />

      </div>
    </div>
  );
}
