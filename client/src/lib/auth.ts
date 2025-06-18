// Authentication utilities and token management for the billing dashboard

import { User, AuthResponse } from "@/types/auth";

const TOKEN_KEY = "authToken";
const TOKEN_EXPIRY_KEY = "tokenExpiry";
const USER_KEY = "userData";

/**
 * Store authentication token and expiry in localStorage
 */
export function storeAuthToken(authResponse: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, authResponse.token);
  
  // Calculate expiry timestamp
  const expiryTime = Date.now() + authResponse.expiresIn;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

/**
 * Get stored authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated and token is not expired
 */
export function isAuthenticated(): boolean {
  try {
    const token = getAuthToken();
    if (!token) return false;

    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return false;

    const isValid = Date.now() < parseInt(expiry);
    if (!isValid) {
      clearAuthData();
    }
    return isValid;
  } catch (error) {
    clearAuthData();
    return false;
  }
}

/**
 * Clear all authentication data from localStorage
 */
export function clearAuthData(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Store user data in localStorage
 */
export function storeUserData(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get stored user data
 */
export function getUserData(): User | null {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
}

/**
 * Decode JWT token to extract user information
 * Note: This is a simple base64 decode - in production you might want to use a proper JWT library
 */
export function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token will expire soon (within 5 minutes)
 */
export function isTokenExpiringSoon(): boolean {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;

  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() + fiveMinutes >= parseInt(expiry);
}
