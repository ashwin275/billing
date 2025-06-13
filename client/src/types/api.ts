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

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive';
}
