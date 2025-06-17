// API response types for the billing dashboard

export interface DashboardStats {
  totalRevenue: string;
  totalInvoices: number;
  activeShops: number;
  pendingPayments: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: string;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
}

export interface Role {
  roleId: number;
  roleName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: number;
  fullName: string;
  place: string;
  countryId: number | null;
  country: string | null;
  phone: string;
  email: string;
  password: string | null;
  referredBy: string | null;
  referredUsers: string | null;
  shop: any | null;
  roles: Role[];
  roleId: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED';
  referredByUserId: number | null;
}

export interface Shop {
  shopId: number;
  name: string;
  place: string;
  status: 'CREATED' | 'ACTIVE' | 'INACTIVE';
  map: string;
  ownerId: number | null;
  subscriptionPlanId: number | null;
  owner: User | null;
  subscriptionPlan: any | null;
  shopSubscription: any | null;
}

export interface Product {
  productId: number;
  productNumber: string;
  hsn: number | string;
  name: string;
  description: string;
  quantity: number;
  ourPrice: number;
  wholesaleRate: number;
  retailRate: number;
  taxRate: number;
  category: string;
  imageUrl: string;
  expiry: string;
  barcode: string;
  shopId: number | null;
  shop: Shop | null;
  createdAt: string | null;
  updatedAt: string | null;
  cgst: number;
  sgst: number;
}

export interface ProductInput {
  name: string;
  productNumber: string;
  hsn: string;
  description: string;
  quantity: number;
  ourPrice: number;
  wholesaleRate: number;
  retailRate: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  category: string;
  imageUrl: string;
  expiry: string;
  barcode: string;
  shopId: number;
}

export interface Customer {
  customerId: number;
  name: string;
  place: string;
  phone: string | number;
  shop: Shop;
  shopId: number;
  totalSpend: number | null;
  referredby: string | null;
}

export interface CustomerInput {
  name: string;
  place: string;
  phone: string;
  shopId: number;
}

export interface CustomerUpdate {
  customerId: number;
  name: string;
  place: string;
  phone: number;
}

export interface Invoice {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  customerId: number;
  shopId: number;
  salesId: number;
  discount: number;
  staffId: number;
  totalAmount: number;
  amountPaid: number | null;
  tax: number;
  dueDate: string | null;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';
  remark: string;
  shop: Shop;
  sales: {
    saleId: number | null;
    staffId: number | null;
    customerId: number | null;
    shopId: number | null;
    totalAmount: number | null;
    taxRate: number | null;
    discountId: number | null;
    discountAmount: number | null;
    finalAmount: number | null;
    paymentMode: string | null;
    paymentStatus: string | null;
    saleType: 'RETAIL' | 'WHOLESALE';
    billType: 'GST' | 'NON_GST';
    transactionId: string | null;
    saleDate: string | null;
  };
  billType: 'GST' | 'NON_GST' | null;
  saleType: 'RETAIL' | 'WHOLESALE' | null;
  transactionId: string | null;
  saleItems: SaleItem[] | null;
}

export interface SaleItem {
  saleItemId: number;
  product: Product;
  quantity: number;
  discount: number;
  unitPrice: number;
  totalPrice: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
}

export interface InvoiceInput {
  customerId: number;
  shopId: number;
  discount: number;
  amountPaid: number;
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  remark: string;
  dueDate: string | null;
  billType: 'GST' | 'NON_GST';
  saleType: 'RETAIL' | 'WHOLESALE';
  transactionId: string;
  saleItems: SaleItemInput[];
}

export interface SaleItemInput {
  productId: number;
  quantity: number;
  discount: number;
}
