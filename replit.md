# Billing Dashboard - Frontend Application

## Overview
A frontend-only billing application built with React, TypeScript, and Vite. The application connects to external backend APIs for all data operations.

## Project Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **API**: External backend at `https://billing-backend.serins.in/api`

### Directory Structure
```
client/
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication components (protected routes)
│   │   ├── dashboard/      # Dashboard management components
│   │   │   ├── customers-management.tsx
│   │   │   ├── invoice-management.tsx
│   │   │   ├── products-management.tsx
│   │   │   ├── profile-management.tsx
│   │   │   ├── shops-management.tsx
│   │   │   ├── staff-management.tsx
│   │   │   └── users-management.tsx
│   │   ├── invoice/        # Invoice template components
│   │   ├── layout/         # Layout components (header, sidebar)
│   │   └── ui/             # shadcn UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── api.ts          # API service functions
│   │   ├── auth.ts         # Authentication utilities
│   │   └── queryClient.ts  # React Query client config
│   ├── pages/
│   │   ├── auth/           # Login, signup, forgot password
│   │   ├── dashboard/      # Main dashboard
│   │   ├── create-invoice.tsx
│   │   └── reports.tsx
│   └── types/              # TypeScript type definitions
```

## API Endpoints
The app uses the following API modules (defined in `client/src/lib/api.ts`):
- `authApi` - Authentication (signin, signup, countries)
- `usersApi` - User management
- `rolesApi` - Roles management
- `productsApi` - Products CRUD with pagination
- `shopsApi` - Shop management
- `customersApi` - Customer CRUD
- `invoicesApi` - Invoice management with pagination
- `profileApi` - User profile management
- `dashboardApi` - Dashboard statistics
- `staffApi` - Staff management
- `reportsApi` - Various reports (sales, HSN, customer reports)

## Running the Project
```bash
npm run dev
```
The app runs on port 5000.

## Key Features
- User authentication (login/signup)
- Dashboard with statistics
- Invoice creation and management
- Customer management
- Product management
- Shop management
- Staff management
- Reports generation (sales, HSN, customer reports)

## Environment Variables
- `VITE_API_BASE_URL` - Backend API base URL (defaults to `https://billing-backend.serins.in/api`)
