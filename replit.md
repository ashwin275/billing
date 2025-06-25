# Billing Dashboard - Replit Configuration

## Overview

This is a React-based billing dashboard application built for managing invoices, customers, products, and users. The application has been configured as a frontend-only solution that connects to an external API backend hosted at `billing-backend.serins.in`. The project has been optimized for deployment on Replit with proper configuration files and development workflows.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### UI/UX Design System
- **Component Library**: shadcn/ui built on Radix UI primitives
- **Responsive Design**: Mobile-first approach with collapsible sidebar
- **Theme System**: Light/dark mode support with CSS custom properties
- **Icons**: Lucide React icon library

## Key Components

### Authentication System
- JWT-based authentication with token storage
- Protected routes with automatic redirects
- Sign-in, sign-up, and forgot password flows
- Role-based access control integration

### Dashboard Features
- **Invoice Management**: Create, edit, view invoices with PDF generation
- **Customer Management**: CRUD operations for customer data
- **Product Management**: Inventory tracking with pricing (retail/wholesale)
- **User Management**: User roles and permissions
- **Shop Management**: Multi-shop support
- **Reports**: Sales analytics and business insights

### Core Pages
- **Dashboard**: Overview with statistics and quick actions
- **Create Invoice**: Direct editing interface with product selection
- **Edit Invoice**: Pre-filled forms for invoice modifications
- **Reports**: Charts and analytics for business insights
- **Not Found**: Custom 404 page with navigation options

## Data Flow

### API Integration
- **Base URL**: External API at `https://billing-backend.serins.in/api`
- **Authentication**: Bearer token in request headers
- **Error Handling**: Centralized error handling with user-friendly messages
- **Data Fetching**: React Query for caching and synchronization

### State Management
- **Local State**: React useState and useReducer for component state
- **Server State**: React Query for API data with automatic caching
- **Form State**: React Hook Form for complex form management
- **Authentication State**: localStorage with automatic token validation

## External Dependencies

### Core Libraries
- React ecosystem (React, React DOM, React Router alternative)
- TypeScript for type safety
- Vite for development and building
- Tailwind CSS for styling

### UI Components
- @radix-ui/* components for accessible UI primitives
- Lucide React for consistent iconography
- Recharts for data visualization
- Framer Motion for animations

### API and Forms
- @tanstack/react-query for server state management
- React Hook Form with @hookform/resolvers
- Zod for schema validation
- date-fns for date manipulation

## Deployment Strategy

### Replit Configuration
- **Development**: Vite dev server on port 5000
- **Modules**: Node.js 20, web development, PostgreSQL 16 (for future backend)
- **Build**: Optimized production builds with code splitting
- **Deployment Target**: Autoscale deployment ready

### Alternative Deployments
- **Netlify**: Configuration files included for static hosting
- **Frontend-only**: Can run independently with external API
- **Local Development**: Multiple configuration options available

### Environment Configuration
- Development and production environment support
- Configurable API endpoints via environment variables
- Multiple Vite configurations for different deployment targets

## Changelog

- January 25, 2025: Enhanced create invoice page with duplicate bottom buttons, CGST/SGST percentage display, and automatic overall discount calculation
- June 24, 2025: Fixed invoice update functionality with proper total and tax calculations, resolved all TypeScript compilation errors
- June 23, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.