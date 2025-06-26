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
  saleItems: z.array(saleItemSchema).min(1, "At least one item is required")
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface SaleItem {
  productId: number;
  quantity: number;
  discount: number;
  discountType: "PERCENTAGE" | "AMOUNT";
  unitPrice: number;
  product?: Product;
  cgstAmount?: number;
  sgstAmount?: number;
  totalAmount?: number;
  discountAmount?: number;
}

export default function CreateInvoice() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Extract invoiceId from URL for edit mode
  const isEditMode = location.includes('/edit/');
  const invoiceId = isEditMode ? parseInt(location.split('/').pop() || '0') : 0;

  // State management
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [createdInvoiceData, setCreatedInvoiceData] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Form setup
  const form = useForm<InvoiceFormData>({
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
      saleItems: []
    }
  });

  // API queries
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => productsApi.getAll()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: () => customersApi.getAll()
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['/api/shops'],
    queryFn: () => shopsApi.getAll()
  });

  // Load invoice data for edit mode
  const { data: invoiceData } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: () => invoicesApi.getById(invoiceId),
    enabled: isEditMode && invoiceId > 0
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setCreatedInvoiceData(data);
      setShowSuccessDialog(true);
      toast({
        title: "Success",
        description: "Invoice created successfully!"
      });
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
    mutationFn: ({ id, data }: { id: number, data: InvoiceInput }) => invoicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Invoice updated successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive"
      });
    }
  });

  // Load data for edit mode
  useEffect(() => {
    if (isEditMode && invoiceData) {
      const invoice = invoiceData;
      
      // Set customer and shop
      const customer = customers.find(c => c.customerId === invoice.customerId);
      const shop = shops.find(s => s.shopId === invoice.shopId);
      
      if (customer) setSelectedCustomer(customer);
      if (shop) setSelectedShop(shop);

      // Set form values
      form.reset({
        customerId: invoice.customerId,
        shopId: invoice.shopId,
        discount: invoice.discount || 0,
        discountType: invoice.discountType || "PERCENTAGE",
        additionalDiscount: invoice.additionalDiscount || 0,
        additionalDiscountType: invoice.additionalDiscountType || "AMOUNT",
        amountPaid: invoice.amountPaid || 0,
        paymentMode: invoice.paymentMode || "CASH",
        paymentStatus: invoice.paymentStatus || "PAID",
        remark: invoice.remark || "",
        dueDate: invoice.dueDate || null,
        saleItems: invoice.saleItems || []
      });

      // Set sale items
      const itemsWithProducts = invoice.saleItems?.map((item: any) => {
        const product = products.find(p => p.productId === item.productId);
        return {
          ...item,
          product,
          unitPrice: item.unitPrice || product?.retailPrice || 0
        };
      }) || [];
      
      setSaleItems(itemsWithProducts);
    }
  }, [invoiceData, customers, shops, products, form, isEditMode]);

  // Calculate totals
  const calculateTotals = () => {
    const formData = form.getValues();
    
    // Calculate item totals
    const items = saleItems.map(item => {
      const product = products.find(p => p.productId === item.productId);
      if (!product) return null;

      const unitPrice = item.unitPrice || product.retailPrice;
      const quantity = item.quantity || 0;
      const subtotal = unitPrice * quantity;

      // Calculate item discount
      let discountAmount = 0;
      if (item.discountType === "PERCENTAGE") {
        discountAmount = (subtotal * item.discount) / 100;
      } else {
        discountAmount = item.discount;
      }

      const afterDiscount = Math.max(0, subtotal - discountAmount);
      
      // Calculate GST (9% CGST + 9% SGST = 18% total)
      const cgstAmount = (afterDiscount * 9) / 100;
      const sgstAmount = (afterDiscount * 9) / 100;
      const totalAmount = afterDiscount;

      return {
        ...item,
        product,
        unitPrice,
        subtotal,
        discountAmount,
        cgstAmount,
        sgstAmount,
        totalAmount,
        afterDiscount
      };
    }).filter(Boolean);

    // Calculate overall totals
    const itemsBeforeDiscount = items.reduce((sum, item) => sum + (item?.subtotal || 0), 0);
    const itemDiscounts = items.reduce((sum, item) => sum + (item?.discountAmount || 0), 0);
    const subtotalAfterItemDiscounts = itemsBeforeDiscount - itemDiscounts;

    // Calculate additional discount
    let additionalDiscountAmount = 0;
    if (formData.additionalDiscountType === "PERCENTAGE") {
      additionalDiscountAmount = (subtotalAfterItemDiscounts * formData.additionalDiscount) / 100;
    } else {
      additionalDiscountAmount = formData.additionalDiscount || 0;
    }

    const subtotal = Math.max(0, subtotalAfterItemDiscounts - additionalDiscountAmount);
    const totalTax = items.reduce((sum, item) => sum + (item?.cgstAmount || 0) + (item?.sgstAmount || 0), 0);
    const grandTotal = subtotal;

    return {
      items,
      itemsBeforeDiscount,
      itemDiscounts,
      additionalDiscountAmount,
      subtotal,
      totalTax,
      grandTotal
    };
  };

  const totals = calculateTotals();

  // Handle form submission
  const onSubmit = async (data: InvoiceFormData) => {
    if (!selectedCustomer || !selectedShop) {
      toast({
        title: "Error", 
        description: "Please select customer and shop",
        variant: "destructive"
      });
      return;
    }

    if (saleItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive"
      });
      return;
    }

    const invoiceInput: InvoiceInput = {
      customerId: selectedCustomer.customerId,
      shopId: selectedShop.shopId,
      discount: data.discount,
      discountType: data.discountType,
      additionalDiscount: data.additionalDiscount,
      additionalDiscountType: data.additionalDiscountType,
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      paymentStatus: data.paymentStatus,
      remark: data.remark,
      dueDate: data.dueDate,
      saleItems: saleItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        discount: item.discount,
        discountType: item.discountType,
        unitPrice: item.unitPrice
      }))
    };

    if (isEditMode) {
      updateInvoiceMutation.mutate({ id: invoiceId, data: invoiceInput });
    } else {
      createInvoiceMutation.mutate(invoiceInput);
    }
  };

  // Add item to invoice
  const addItem = () => {
    setSaleItems([...saleItems, {
      productId: 0,
      quantity: 1,
      discount: 0,
      discountType: "AMOUNT",
      unitPrice: 0
    }]);
  };

  // Remove item from invoice
  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  // Update item
  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...saleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill unit price when product is selected
    if (field === 'productId') {
      const product = products.find(p => p.productId === value);
      if (product) {
        newItems[index].product = product;
        newItems[index].unitPrice = product.retailPrice;
      }
    }
    
    setSaleItems(newItems);
  };

  // Download PDF function
  const downloadInvoicePDF = () => {
    if (!selectedCustomer || !selectedShop) return;
    
    const formData = form.getValues();
    
    const invoiceData = {
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
        paymentMode: formData.paymentMode
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
              color: #1f2937;
            }
            
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              min-height: 100vh;
            }
            
            .header-section {
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              padding: 30px;
              position: relative;
              overflow: hidden;
            }
            
            .header-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              position: relative;
              z-index: 2;
            }
            
            .company-info {
              display: flex;
              align-items: center;
              gap: 20px;
            }
            
            .company-logo {
              width: 60px;
              height: 60px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: 700;
              color: white;
              border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .company-details h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 5px;
            }
            
            .company-tagline {
              font-size: 14px;
              opacity: 0.9;
              margin-bottom: 2px;
            }
            
            .invoice-title {
              text-align: right;
            }
            
            .invoice-meta {
              font-size: 14px;
              opacity: 0.9;
            }
            
            .content-section {
              padding: 40px 30px;
            }
            
            .bill-to-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              gap: 30px;
            }
            
            .info-block {
              flex: 1;
            }
            
            .info-block h3 {
              color: #374151;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .customer-name {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 5px;
            }
            
            .info-block p {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 3px;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 14px;
            }
            
            .items-table th {
              background: #f9fafb;
              padding: 12px 8px;
              border: 1px solid #e5e7eb;
              font-weight: 600;
              color: #374151;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .items-table td {
              padding: 12px 8px;
              border: 1px solid #e5e7eb;
              color: #6b7280;
            }
            
            .items-table tr:nth-child(even) {
              background: #f9fafb;
            }
            
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-top: 30px;
            }
            
            .totals-box {
              min-width: 300px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            
            .total-line {
              display: flex;
              justify-content: space-between;
              padding: 10px 15px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            
            .total-line:last-child {
              border-bottom: none;
            }
            
            .total-line.grand-total {
              background: #f3f4f6;
              font-weight: 600;
              font-size: 16px;
              color: #1f2937;
            }
            
            .total-line.balance {
              font-weight: 600;
            }
            
            .total-line.balance.positive {
              color: #dc2626;
            }
            
            .total-line.balance.negative {
              color: #059669;
            }
            
            .bottom-section {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
              gap: 40px;
            }
            
            .terms-section {
              flex: 1;
            }
            
            .terms-section h3 {
              color: #374151;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .terms-section p {
              color: #6b7280;
              font-size: 13px;
              margin-bottom: 8px;
              line-height: 1.5;
            }
            
            .signature-section {
              text-align: center;
              min-width: 200px;
            }
            
            .signature-line {
              width: 200px;
              height: 1px;
              background: #d1d5db;
              margin: 60px auto 10px;
            }
            
            .signature-text {
              color: #6b7280;
              font-size: 13px;
              font-weight: 500;
            }
            
            @media print {
              body { margin: 0; }
              .invoice-container { margin: 0; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header Section -->
            <div class="header-section">
              <div class="header-content">
                <div class="company-info">
                  <div class="company-logo">
                    ${invoiceData.shop.name.charAt(0)}
                  </div>
                  <div class="company-details">
                    <h1>${invoiceData.shop.name}</h1>
                    <div class="company-tagline">${invoiceData.shop.tagline}</div>
                    ${invoiceData.shop.gstNo ? `<div class="company-tagline">GST: ${invoiceData.shop.gstNo}</div>` : ''}
                    ${invoiceData.shop.phone ? `<div class="company-tagline">Phone: ${invoiceData.shop.phone}</div>` : ''}
                  </div>
                </div>
                <div class="invoice-title">
                  <div class="invoice-meta">
                    <div><strong>Date:</strong> ${new Date(invoiceData.invoiceDate).toLocaleDateString('en-GB')}</div>
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
                    <th class="text-center">Qty.</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">CGST (9%)</th>
                    <th class="text-right">SGST (9%)</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.items.map((item, index) => `
                    <tr>
                      <td class="text-left">
                        <div style="font-weight: 600; color: #2d3748;">${item?.product?.name || 'N/A'}</div>
                      </td>
                      <td class="text-center">${item?.quantity?.toString().padStart(2, '0') || '0'}</td>
                      <td class="text-right">₹${(item?.unitPrice || 0).toFixed(2)}</td>
                      <td class="text-right">₹${(item?.discountAmount || 0).toFixed(2)}</td>
                      <td class="text-right">₹${(item?.cgstAmount || 0).toFixed(2)}</td>
                      <td class="text-right">₹${(item?.sgstAmount || 0).toFixed(2)}</td>
                      <td class="text-right">₹${(item?.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- Totals Section -->
              <div class="totals-section">
                <div class="totals-box">
                  <div class="total-line">
                    <span>Sub Total:</span>
                    <span>₹${invoiceData.totals.itemsBeforeDiscount.toFixed(2)}</span>
                  </div>
                  <div class="total-line">
                    <span>Item Discounts:</span>
                    <span>- ₹${invoiceData.totals.itemDiscounts.toFixed(2)}</span>
                  </div>
                  ${invoiceData.totals.additionalDiscountAmount > 0 ? `
                  <div class="total-line">
                    <span>Additional Discount:</span>
                    <span>- ₹${invoiceData.totals.additionalDiscountAmount.toFixed(2)}</span>
                  </div>` : ''}
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

                <div class="signature-section">
                  <div class="signature-line"></div>
                  <div class="signature-text">Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/invoice-management">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? "Edit Invoice" : "Create Invoice"}
              </h1>
              <p className="text-gray-600">
                {isEditMode ? "Update invoice details" : "Add a new invoice to your system"}
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Invoice Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer & Shop Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Customer & Shop Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Customer Selection */}
                      <div className="space-y-2">
                        <Label>Customer *</Label>
                        <CustomerSearchDialog
                          customers={customers}
                          selectedCustomer={selectedCustomer}
                          onSelectCustomer={(customer) => {
                            setSelectedCustomer(customer);
                            form.setValue('customerId', customer.customerId);
                          }}
                        />
                        {selectedCustomer && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 text-blue-800">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{selectedCustomer.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-600 text-sm mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>{selectedCustomer.place}</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-600 text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{selectedCustomer.phone}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Shop Selection */}
                      <div className="space-y-2">
                        <Label>Shop *</Label>
                        <Select 
                          value={selectedShop?.shopId?.toString() || ""} 
                          onValueChange={(value) => {
                            const shop = shops.find(s => s.shopId === parseInt(value));
                            if (shop) {
                              setSelectedShop(shop);
                              form.setValue('shopId', shop.shopId);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shop" />
                          </SelectTrigger>
                          <SelectContent>
                            {shops.map((shop) => (
                              <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                                {shop.name} - {shop.place}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedShop && (
                          <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 text-green-800">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">{selectedShop.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>{selectedShop.place}</span>
                            </div>
                            {selectedShop.gstNo && (
                              <div className="text-green-600 text-sm">
                                GST: {selectedShop.gstNo}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Items Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Invoice Items
                      </CardTitle>
                      <Button type="button" onClick={addItem} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {saleItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No items added yet</p>
                        <p className="text-sm">Click "Add Item" to start building your invoice</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {saleItems.map((item, index) => (
                          <div key={index} className="p-4 border rounded-lg bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                              {/* Product Selection */}
                              <div className="md:col-span-2">
                                <Label className="text-sm">Product</Label>
                                <ProductSearchDialog
                                  products={products}
                                  selectedProduct={item.product}
                                  onSelectProduct={(product) => {
                                    updateItem(index, 'productId', product.productId);
                                    updateItem(index, 'product', product);
                                    updateItem(index, 'unitPrice', product.retailPrice);
                                  }}
                                />
                              </div>

                              {/* Quantity */}
                              <div>
                                <Label className="text-sm">Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </div>

                              {/* Unit Price */}
                              <div>
                                <Label className="text-sm">Unit Price</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                />
                              </div>

                              {/* Discount */}
                              <div>
                                <Label className="text-sm">Discount</Label>
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.discount}
                                    onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                    className="flex-1"
                                  />
                                  <Select
                                    value={item.discountType}
                                    onValueChange={(value: "PERCENTAGE" | "AMOUNT") => updateItem(index, 'discountType', value)}
                                  >
                                    <SelectTrigger className="w-16">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AMOUNT">₹</SelectItem>
                                      <SelectItem value="PERCENTAGE">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Remove Button */}
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="w-full text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Item Summary */}
                            {item.product && (
                              <div className="mt-3 pt-3 border-t bg-white p-3 rounded">
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Subtotal:</span>
                                    <span className="ml-2 font-medium">₹{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">CGST (9%):</span>
                                    <span className="ml-2 font-medium">₹{totals.items[index]?.cgstAmount?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">SGST (9%):</span>
                                    <span className="ml-2 font-medium">₹{totals.items[index]?.sgstAmount?.toFixed(2) || '0.00'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Total:</span>
                                    <span className="ml-2 font-medium text-blue-600">₹{totals.items[index]?.totalAmount?.toFixed(2) || '0.00'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="paymentMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Mode</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment mode" />
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
                                  <SelectValue placeholder="Select payment status" />
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

                    {/* Additional Discount */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="additionalDiscount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Discount</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="flex-1"
                                />
                              </FormControl>
                              <FormField
                                control={form.control}
                                name="additionalDiscountType"
                                render={({ field: discountTypeField }) => (
                                  <Select onValueChange={discountTypeField.onChange} value={discountTypeField.value}>
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AMOUNT">₹</SelectItem>
                                      <SelectItem value="PERCENTAGE">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
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
                          <FormLabel>Remarks (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any additional notes or remarks"
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

              {/* Right Column - Summary */}
              <div className="space-y-6">
                {/* Invoice Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                    <div className="flex justify-between text-gray-600">
                      <span>Total Tax (Not included):</span>
                      <span>₹{totals.totalTax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Grand Total:</span>
                      <span>₹{totals.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>Amount Paid:</span>
                      <span>₹{form.watch('amountPaid')?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className={`flex justify-between font-semibold ${
                      (totals.grandTotal - (form.watch('amountPaid') || 0)) > 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      <span>Balance:</span>
                      <span>₹{(totals.grandTotal - (form.watch('amountPaid') || 0)).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Button 
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={downloadInvoicePDF}
                        disabled={!selectedCustomer || !selectedShop}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button 
                        type="submit"
                        className="w-full"
                        disabled={isEditMode ? updateInvoiceMutation.isPending : createInvoiceMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isEditMode 
                          ? (updateInvoiceMutation.isPending ? "Updating..." : "Update Invoice")
                          : (createInvoiceMutation.isPending ? "Creating..." : "Create Invoice")
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>

        {/* Success Dialog */}
        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Invoice Created Successfully!</AlertDialogTitle>
              <AlertDialogDescription>
                Your invoice has been created and saved. What would you like to do next?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowSuccessDialog(false)}>
                Stay Here
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Link href="/dashboard/invoice-management">
                  <Button>View All Invoices</Button>
                </Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}