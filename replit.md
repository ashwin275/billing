# Billing Dashboard - Replit Configuration

## Overview

This React-based billing dashboard application is designed for comprehensive management of invoices, customers, products, and users. It functions as a frontend-only solution, connecting to an external API backend at `billing-backend.serins.in`. The project's vision is to provide a robust, scalable, and user-friendly platform for businesses to streamline their billing operations, with high market potential in SME segments seeking efficient financial management tools.

**Migration Status**: Successfully migrated from Replit Agent to standard Replit environment (August 2025) with proper host configuration for seamless deployment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

### UI/UX Design System
- **Component Library**: shadcn/ui (built on Radix UI)
- **Responsive Design**: Mobile-first with collapsible sidebar
- **Theme System**: Light/dark mode support
- **Icons**: Lucide React

### Key Features
- **Authentication**: JWT-based, protected routes, role-based access control.
- **Invoice Management**: Create, edit, view, and PDF generation with detailed tax and discount handling.
- **Customer Management**: CRUD operations with search and inline editing.
- **Product Management**: Inventory, pricing (retail/wholesale), and comprehensive tax configuration.
- **User Management**: User roles and permissions.
- **Shop Management**: Multi-shop support.
- **Reports**: Sales analytics and business insights.

### Core Pages
- **Dashboard**: Overview and quick actions.
- **Create/Edit Invoice**: Direct editing interface with product and customer selection.
- **Reports**: Charts and analytics.
- **Not Found**: Custom 404 page.

### Data Flow
- **API Integration**: External API at `https://billing-backend.serins.in/api` with Bearer token authentication. Centralized error handling.
- **State Management**: React Query for API data, React Hook Form for forms, localStorage for authentication.

### Deployment Strategy
- **Replit**: Vite dev server on port 5000, Node.js 20, autoscale deployment ready.
- **Alternative**: Netlify for static hosting.
- **Environment**: Configurable API endpoints via environment variables.

## External Dependencies

- React
- TypeScript
- Vite
- Tailwind CSS
- @radix-ui/*
- Lucide React
- Recharts
- Framer Motion
- @tanstack/react-query
- React Hook Form
- @hookform/resolvers
- Zod
- date-fns