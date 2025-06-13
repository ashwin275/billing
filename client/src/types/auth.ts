// Authentication related types for the billing dashboard application

export interface SignUpData {
  fullName: string;
  place: string;
  age: number;
  countryId: number;
  phone: string;
  email: string;
  password: string;
  roleId: number;
}

export interface SignInData {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
}

export interface User {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  place: string;
  age: number;
  roleId: number;
  roleName: string;
}

export interface Country {
  countryId: number;
  countryCode: string;
  country: string;
}

export interface ApiError {
  instance: string;
  detail: string;
  type: string;
  title: string;
  status: number;
}
