// API service for backend communication with the billing system

import { getAuthToken, decodeToken } from "./auth";
import { SignUpData, SignInData, AuthResponse, Country, ApiError } from "@/types/auth";

// Get base URL from environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://billing-backend.serins.in/api";

/**
 * Generic API request function with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  // Add authentication token if available
  const token = getAuthToken();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Handle 404 and 403 as empty data for GET requests
      if ((response.status === 404 || response.status === 403) && (!options.method || options.method === 'GET')) {
        console.log(`API returned ${response.status} for ${endpoint}, treating as empty data`);
        return [] as unknown as T;
      }
      
      let errorData: ApiError;
      try {
        errorData = await response.json();
        console.log(`API Error for ${endpoint}:`, errorData);
      } catch (parseError) {
        console.log(`Failed to parse error response for ${endpoint}:`, parseError);
        errorData = {
          detail: `HTTP ${response.status}`,
          title: `Request failed`,
          status: response.status,
          type: "about:blank",
          instance: endpoint
        };
      }
      throw errorData;
    }

    // Handle different response types
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      // For text responses like "product deleted successfully"
      const text = await response.text();
      return text as unknown as T;
    }
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Sign up a new user
   */
  async signUp(userData: Omit<SignUpData, 'roleId'>): Promise<void> {
    // Add hardcoded roleId as specified in requirements
    const signUpData: SignUpData = {
      ...userData,
      roleId: 4,
    };

    return apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(signUpData),
    });
  },

  /**
   * Sign in existing user
   */
  async signIn(credentials: SignInData): Promise<AuthResponse> {
    return apiRequest("/auth/signin", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Get list of all countries for signup form
   */
  async getCountries(): Promise<Country[]> {
    return apiRequest("/country/all");
  },
};

/**
 * Users management API endpoints
 */
export const usersApi = {
  /**
   * Get all users
   */
  async getAllUsers(): Promise<import("@/types/api").User[]> {
    return apiRequest("/users/all");
  },

  /**
   * Add new user
   */
  async addUser(userData: import("@/types/auth").SignUpData): Promise<void> {
    return apiRequest("/users/add", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  /**
   * Delete user by ID
   */
  async deleteUser(userId: number): Promise<void> {
    return apiRequest(`/users/delete/${userId}`, {
      method: "DELETE",
    });
  },
};

/**
 * Roles management API endpoints
 */
export const rolesApi = {
  /**
   * Get all roles
   */
  async getAllRoles(): Promise<import("@/types/api").Role[]> {
    return apiRequest("/roles/all");
  },
};

/**
 * Products management API endpoints
 */
export const productsApi = {
  /**
   * Get all products
   */
  async getAllProducts(): Promise<import("@/types/api").Product[]> {
    return apiRequest("/products/all");
  },

  /**
   * Add multiple products
   */
  async addProducts(products: import("@/types/api").ProductInput[]): Promise<void> {
    return apiRequest("/products/add", {
      method: "POST",
      body: JSON.stringify(products),
    });
  },

  /**
   * Update product by ID
   */
  async updateProduct(productId: number, product: Partial<import("@/types/api").Product>): Promise<void> {
    return apiRequest(`/products/update/${productId}`, {
      method: "POST",
      body: JSON.stringify(product),
    });
  },

  /**
   * Delete product by ID
   */
  async deleteProduct(productId: number): Promise<void> {
    return apiRequest(`/products/delete/${productId}`, {
      method: "DELETE",
    });
  },

  /**
   * Check if product number exists
   */
  async checkProductExists(productNumber: string, shopId: number): Promise<{ exists: boolean; productNumber: string }> {
    return apiRequest(`/products/product-number-exist?productNumber=${encodeURIComponent(productNumber)}&shopId=${shopId}`);
  },
};

/**
 * Shops management API endpoints
 */
export const shopsApi = {
  /**
   * Get all shops
   */
  async getAllShops(): Promise<any[]> {
    return apiRequest("/shop/all");
  },

  /**
   * Add new shop
   */
  async addShop(shopData: any): Promise<void> {
    return apiRequest("/shop/add", {
      method: "POST",
      body: JSON.stringify(shopData),
    });
  },

  /**
   * Update shop by ID
   */
  async updateShop(shopId: number, shopData: any): Promise<void> {
    return apiRequest(`/shop/update/${shopId}`, {
      method: "POST",
      body: JSON.stringify(shopData),
    });
  },

  /**
   * Delete shop by ID
   */
  async deleteShop(shopId: number): Promise<void> {
    return apiRequest(`/shop/delete/${shopId}`, {
      method: "DELETE",
    });
  },
};

/**
 * Customers management API endpoints
 */
export const customersApi = {
  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<import("@/types/api").Customer[]> {
    return apiRequest('/customer/all');
  },

  /**
   * Add new customer
   */
  async addCustomer(customerData: import("@/types/api").CustomerInput): Promise<void> {
    return apiRequest('/customer/add', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  /**
   * Update customer by ID
   */
  async updateCustomer(customerId: number, customerData: import("@/types/api").CustomerUpdate): Promise<void> {
    return apiRequest(`/customer/update/${customerId}`, {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  /**
   * Delete customer by ID
   */
  async deleteCustomer(customerId: number): Promise<void> {
    return apiRequest(`/customer/delete/${customerId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Invoice management API endpoints
 */
export const invoicesApi = {
  /**
   * Get all invoices
   */
  async getAllInvoices(): Promise<import("@/types/api").Invoice[]> {
    return apiRequest('/invoice/all');
  },

  /**
   * Add new invoice
   */
  async addInvoice(invoiceData: import("@/types/api").InvoiceInput): Promise<void> {
    return apiRequest('/invoice/add', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: number): Promise<import("@/types/api").Invoice> {
    return apiRequest(`/invoice/${invoiceId}`);
  },

  /**
   * Update invoice by ID
   */
  async updateInvoice(invoiceId: number, invoiceData: any): Promise<void> {
    // Get user and sales IDs from token if available
    const token = getAuthToken();
    let userId = 1;
    let salesId = 2;
    
    if (token) {
      try {
        const decoded = decodeToken(token);
        userId = decoded.userId || 1;
        salesId = decoded.salesId || 2;
      } catch (error) {
        console.warn('Failed to decode token for update invoice:', error);
      }
    }
    
    console.log('API updateInvoice - received complete data:', invoiceData);

    // Send the complete invoice data instead of creating a minimal payload
    const updatePayload = {
      ...invoiceData, // Include all fields from the invoice data
      invoiceId: invoiceId, // Explicitly add invoice ID to payload
      userId: userId, // Override/add userId from token
      dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate).toISOString() : new Date().toISOString(),
    };
    
    console.log('API updateInvoice - final complete payload:', updatePayload);
    
    return apiRequest(`/invoice/update/${invoiceId}`, {
      method: 'POST',
      body: JSON.stringify(updatePayload),
    });
  },

  /**
   * Delete invoice by ID
   */
  async deleteInvoice(invoiceId: number): Promise<void> {
    return apiRequest(`/invoice/delete/${invoiceId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Profile API endpoints
 */
export const profileApi = {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: number): Promise<any> {
    return apiRequest(`/users/${userId}`);
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: number, profileData: any): Promise<void> {
    return apiRequest(`/users/update/${userId}`, {
      method: 'POST',
      body: JSON.stringify({
        userId: userId,
        password: "", // Add empty password field as required by API
        ...profileData,
      }),
    });
  },

  /**
   * Change user password
   */
  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<void> {
    return apiRequest('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },
};

/**
 * Dashboard API endpoints
 */
export const dashboardApi = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<any> {
    return apiRequest("/dashboard/stats");
  },

  /**
   * Get recent invoices
   */
  async getRecentInvoices(): Promise<any[]> {
    return apiRequest("/invoices/recent");
  },
};

/**
 * Staff management API endpoints
 */
export const staffApi = {
  /**
   * Get all staff members
   */
  async getAllStaffs(): Promise<any[]> {
    return apiRequest("/api/users/shop/getstaff");
  },
  
  /**
   * Add new staff member
   */
  async addStaff(staffData: any): Promise<void> {
    return apiRequest("/api/users/shop/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staffData)
    });
  },
  
  /**
   * Delete staff member by ID
   */
  async deleteStaff(userId: number): Promise<void> {
    return apiRequest(`/api/users/${userId}`, {
      method: "DELETE"
    });
  }
};

/**
 * Reports API endpoints
 */
export const reportsApi = {
  /**
   * Get top products for a shop
   */
  async getTopProducts(shopId: number): Promise<any[]> {
    return await apiRequest(`/reports/shop/${shopId}/top-products`);
  },

  /**
   * Get top customers for a shop
   */
  async getTopCustomers(shopId: number): Promise<any[]> {
    return await apiRequest(`/reports/shop/${shopId}/top-customers`);
  },

  /**
   * Get sales summary for a shop with date range
   */
  async getSalesSummary(shopId: number, from: string, to: string): Promise<any> {
    return await apiRequest(`/reports/shop/${shopId}/sales-summary?from=${from}&to=${to}`);
  },

  /**
   * Get discount summary for a shop with date range
   */
  async getDiscountSummary(shopId: number, from: string, to: string): Promise<any> {
    return await apiRequest(`/reports/shop/${shopId}/discount-summary?from=${from}&to=${to}`);
  },

  /**
   * Get inventory movement for a shop with date range
   */
  async getInventoryMovement(shopId: number, from: string, to: string): Promise<any[]> {
    return await apiRequest(`/reports/shop/${shopId}/inventory-movement?from=${from}&to=${to}`);
  },

  /**
   * Get time insights for a shop with date range
   */
  async getTimeInsights(shopId: number, from: string, to: string): Promise<any> {
    return await apiRequest(`/reports/shop/${shopId}/time-insights?from=${from}&to=${to}`);
  },

  /**
   * Get deadstock for a shop with date range
   */
  async getDeadstock(shopId: number, from: string, to: string): Promise<any[]> {
    return await apiRequest(`/reports/shop/${shopId}/deadstock?from=${from}&to=${to}`);
  },
};

/**
 * Generic API error handler
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
