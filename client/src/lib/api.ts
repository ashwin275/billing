// API service for backend communication with the billing system

import { getAuthToken } from "./auth";
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
 * Generic API error handler
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
