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
