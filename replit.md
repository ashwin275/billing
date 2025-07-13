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

- June 30, 2025: Increased Invoice Management preview dialog width from max-w-4xl to max-w-6xl for better table visibility with additional columns
- June 30, 2025: Added Product Number column to all invoice tables (preview and download) - added Product Number column displaying productNumber from backend to all invoice tables in create invoice page (3 tables), edit invoice page (3 tables), InvoiceTemplate component, and invoice management components; positioned between Item Description and HSN columns; ensures consistent product identification across all invoice-related PDFs and previews
- June 30, 2025: Added Part Number column to Products Management table - created new sortable column displaying productNumber from backend; positioned between Product Info and Pricing columns; responsive design hides on small screens; includes Hash icon for visual identification
- June 29, 2025: Removed shopId from product update API payload - eliminated shopId field from edit product function as backend doesn't require it for updates; simplified payload structure and removed unnecessary token decoding logic
- June 29, 2025: Fixed product edit API payload to use correct field names - changed CGST/SGST from uppercase to lowercase (cgst/sgst) in edit product function to match backend API expectations; ensures proper tax field updates when editing products
- June 29, 2025: Changed CGST/SGST default values from 9% to 0% - updated all hardcoded tax defaults across products management and invoice editing to use 0 instead of 9 when tax values are not provided or null; ensures accurate tax calculations without assumptions
- June 29, 2025: Fixed edit button functionality for products with minimal data - added null safety checks to handleEditProduct function for hsn, expiry, and all string fields; enhanced search functionality with null-safe string operations; improved formatDate function to handle null/undefined dates; resolved SelectItem crash by filtering empty category values
- June 29, 2025: Updated Products Management forms to make only product name mandatory - modified productSchema to make all fields optional except name; updated ProductInput interface to support optional fields; enhanced add and edit product functions with default value handling; maintained comprehensive backend error response display in UI
- June 29, 2025: Fixed Part Number auto-filling in Products Management edit form - updated handleEditProduct to map productNumber from backend to partNumber field in UI form for proper data display
- June 29, 2025: Increased product dialogue width in create invoice page from 90vw/1200px to 95vw/1600px for better table visibility and user experience
- June 29, 2025: Enhanced product dialogue in create invoice page with sales price column - added "Sales Price" column displaying retailRate; changed "Item Code" to "Product Number" showing productNumber; updated table headers and data display; maintained search functionality by productNumber, name, and part number
- June 29, 2025: Updated backend API calls to use productNumber instead of partNumber while maintaining partNumber in UI - modified ProductInput interface to remove partNumber field; updated add and edit product functions to map partNumber from UI to productNumber for API calls; maintained partNumber display and search functionality in frontend components
- June 29, 2025: Changed "Retail Rate" label to "Sales Price" in Products Management add and edit product dialogs for consistent terminology across the application
- June 28, 2025: Enhanced Profile Settings page with comprehensive error handling for 403 and empty responses - added specific error states for 403 (Access Denied), 401 (Session Expired), 500 (Server Error), and empty responses; implemented user-friendly error messages with action buttons for retry/navigation; enhanced mutation error handling with detailed status-specific messages; added countries dropdown error handling for failed API calls; improved loading states with descriptive text
- June 28, 2025: Updated customer information display in invoices to use dedicated customer fields - added customerPhone and customerLocation fields to Invoice type definition; changed all invoice templates to display actual customer phone and location instead of shop owner data; updated InvoiceTemplate, invoice-management.tsx and invoice-management-clean.tsx components; now properly separates customer information from shop information in PDF generation
- June 28, 2025: Fixed critical customer dialog bugs in create invoice page - removed duplicate "Add Customer" dialog that was causing two popups to appear simultaneously; fixed form submission event bubbling issue where clicking "Add Customer" button inside dialog was triggering invoice creation instead of customer creation; added proper event.preventDefault() and event.stopPropagation() to customer form submission; added type="button" to dialog trigger button to prevent parent form submission
- June 28, 2025: Added comprehensive HSN (Harmonized System of Nomenclature) code support to all PDF functions - fixed HSN column visibility in InvoiceTemplate component with explicit table layout and column widths; added HSN headers and data to all invoice preview and download functions in create-invoice.tsx (3 separate table instances) and edit-invoice.tsx (2 table instances); positioned HSN column between Item Description and Qty with center alignment; ensured HSN codes display properly in all invoice management, create invoice, and edit invoice PDF outputs
- June 27, 2025: Fixed white text visibility in all PDF functions by changing color from white to black; increased blue gradient header height from 120px to 140px across all PDF components; added shop GST and phone information to InvoiceTemplate component for proper display in Invoice Management preview; updated discount display in InvoiceTemplate to show "Total discount:" (sum of item discounts) and "Round off:" (backend discount field) matching other components
- June 27, 2025: Updated discount display logic across all PDF functions - Invoice Management (backend data) now shows "Total discount:" as sum of item discounts and "Round off:" as discount field from backend; Create invoice preview (before creation) shows "Total discount:" as sum of item discounts and "Round off:" as Additional Discount Amount; fixed discount labels in downloadInvoicePDF, invoice-management.tsx, invoice-management-clean.tsx, and create invoice preview functions
- June 27, 2025: Updated Products Management to use purchasePrice field from API response instead of ourPrice for displaying purchase price data; changed all "Our Price" labels to "Purchase Price" throughout the interface
- June 27, 2025: Added customer search functionality to both create and edit invoice pages - replaced basic customer dropdown with advanced search dialog that allows searching by customer name, phone number, and location with pagination (5 customers per page) and real-time filtering
- June 26, 2025: Removed "Type" field from all PDF downloads including All Invoices page by fixing both invoice-management.tsx and invoice-management-clean.tsx components; enhanced PDF styling for maximum print contrast by removing gray backgrounds, using white backgrounds with thick black borders (4-5px), Arial Black fonts for all headings, and ultra-bold font weights (900) throughout for professional black and white printing
- June 26, 2025: Fixed critical invoice creation API payload to send only additional discount amount in discount field instead of combined total (backend handles combining item discounts + additional discount); enhanced PDF text styling with ultra-bold headers (font-weight 900), black background for column headers with white text, and enhanced all text elements for better print visibility without background colors
- June 26, 2025: Fixed CGST/SGST calculation to use actual backend values instead of default 9% - now shows 0 when no tax values provided from backend; removed hardcoded "(9%)" labels from all table headers and totals sections; additional discount field now uses same input pattern as item discounts for consistent user experience
- June 26, 2025: Removed Preview and Download PDF buttons from bottom of create invoice page while keeping Download PDF button in success dialog; fixed button design consistency between top and bottom sections; enhanced PDF text visibility by making all text bold (font-weight: 600-700) and dark black (#000000) for better printing without background colors
- June 26, 2025: Fixed critical JavaScript crashes in create invoice page by adding null safety checks to all .toFixed() operations on potentially undefined values (totals.additionalDiscountAmount, previewData.totals.subtotal, previewData.totals.grandTotal, previewData.amountPaid, previewData.totals.itemDiscounts)
- June 26, 2025: Added additional discount input field to create invoice page with percentage/amount options; business logic combines item-level discounts with additional overall discount for comprehensive discount handling; updated PDF generation and preview to display both discount types separately in totals section
- June 26, 2025: Fixed invoice number display consistency across all PDF functionality - removed auto-generated invoice IDs from create invoice page preview/download; invoice numbers only show when they exist from backend (All Invoices section) or during edit mode with existing invoices
- June 25, 2025: Added totalSpend column to Customers Management with proper null handling and currency formatting
- June 25, 2025: Added pagination to All Invoices and Staff Management sections with 10 items per page, navigation controls, and item count display
- June 25, 2025: Added role-based access control to hide "Add User" functionality from non-admin users in Dashboard Overview
- June 25, 2025: Fixed Dashboard Recent Invoices "View All" button to navigate to Invoice Management and added orange background styling for pending invoices
- June 25, 2025: Removed Invoice ID display from customer section in Invoice Management components for cleaner presentation
- June 25, 2025: Added golden gradient background and crown badge for LIFETIME subscription shops in shop management for premium visual distinction
- June 25, 2025: Removed invoice number field from create invoice page header for cleaner presentation - now only shows Date and Transaction ID
- June 25, 2025: Updated all delete buttons with consistent red styling across entire application for better visual recognition
- June 25, 2025: Removed invoice ID display from all areas - PDFs, previews, dialogs, and templates now show only date without invoice numbers for cleaner presentation
- June 25, 2025: Added post-creation success dialog with PDF download and dashboard navigation options; replaced automatic navigation with user choice popup; implemented complete PDF generation functionality with professional styling and print capability
- June 25, 2025: Enhanced invoice success notifications with custom toast design featuring invoice details, status indicators, action buttons, and automatic navigation; improved error handling with retry functionality; updated both create and edit invoice flows for consistent user experience
- June 25, 2025: Finalized invoice tax display system - added CGST/SGST columns per item with clean labeling; tax amounts calculated and displayed but not added to grand total; corrected "Sub Total" label to reflect actual product prices; default payment status set to "PAID"; removed "Type" field from invoice sections
- June 25, 2025: Updated create invoice totals display to show real-world invoice scenario - displays total before discounts, item discounts, and subtotal after discounts; removed preview button from bottom action area; fixed mutation reference errors
- January 25, 2025: Enhanced create invoice page with duplicate bottom buttons, CGST/SGST percentage display, and automatic overall discount calculation
- June 24, 2025: Fixed invoice update functionality with proper total and tax calculations, resolved all TypeScript compilation errors
- June 23, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.