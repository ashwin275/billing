# Invoice Management Dashboard

## Project Overview
A React-based frontend-only invoice management dashboard that connects to external API endpoints for complete billing operations. Built with modern React patterns and comprehensive UI components.

## Project Architecture
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: Wouter for client-side routing
- **State Management**: React Query for API state management
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite
- **API Integration**: External REST API at `billing-backend.serins.in`

## Key Features
- User authentication with JWT tokens
- Invoice creation and management
- Product and customer management
- Dashboard with statistics
- Responsive design for mobile and desktop
- Role-based access control

## User Preferences
- Uses frontend-only architecture (no backend server)
- Connects to external API for data operations
- Prefers modern React patterns with hooks
- Uses TypeScript for type safety

## Technical Stack
- React 18 + TypeScript
- Vite for bundling
- Tailwind CSS + shadcn/ui
- React Query for API state
- Wouter for routing
- React Hook Form + Zod

## Recent Changes
- August 17, 2025: Successfully completed migration from Replit Agent to Replit environment
  - Fixed server configuration to properly serve frontend with allowed hosts
  - Updated server/index.ts to use vite.config.dev.ts for Replit compatibility
  - Configured Vite dev server with host "0.0.0.0" and port 5000
  - Set allowedHosts: true to handle Replit's dynamic host URLs
  - Application now runs smoothly on Replit with all features functional
- Fixed critical invoice calculation bug: CGST and SGST taxes are now properly added to grand total
- Updated both create-invoice.tsx and edit-invoice.tsx with correct tax calculation logic
- Subtotal now shows base amount (qty × rate), taxes are added separately to grand total
- Added product number existence checking feature in add/edit product forms
  - Real-time validation when user moves away from product number field
  - Green checkmark with "Product number is available" message for new numbers
  - Red X with "Product number already exists" message for duplicate numbers
  - Loading spinner during validation process
  - Debounced API calls to prevent excessive requests
  - Automatically retrieves shopId from JWT token for shop-specific validation
- Fixed invoice subtotal calculation bug - subtotal now correctly sums base prices only (without CGST/SGST)
- Updated both InvoiceTemplate component and PDF download functionality
- Verified all calculation logic in create/edit invoice pages works correctly
- Enhanced pagination system with First/Last buttons, smart page numbering, direct page jump input, and items per page selector
- Fixed product search dialog search text persistence issue - search bar now clears when dialog is closed
- Reorganized invoice form layout: moved Invoice Date picker from header to above Due Date field
- Enhanced Payment Status dropdown styling to match Due Date picker styling
- CRITICAL FIX: Fixed invoice date loading issue in edit mode
  - Issue: Edit button from Invoice Management routes to create page in edit mode, but create page wasn't loading invoice date
  - Root cause: form.reset() in create-invoice.tsx was missing invoiceDate field while dueDate was working
  - Solution: Added missing invoiceDate field to form reset in create-invoice.tsx line 475
  - Result: Invoice Date now correctly shows backend date (e.g., "16/08/2025") instead of today's date
- Fixed critical invoice edit data refresh issue (August 17, 2025):
  - Edit button now invalidates query cache before navigation to ensure fresh data
  - Added handleEditInvoice function that clears cache and fetches latest invoice data
  - Updated create-invoice.tsx to always fetch fresh data when in edit mode (staleTime: 0, cacheTime: 0)
  - Removed unused edit-invoice.tsx page to avoid confusion
  - Users now see the most up-to-date invoice information when editing
- Fixed invoice amount paid auto-update in edit mode (August 17, 2025):
  - Amount Paid field now automatically updates to match Grand Total when quantities change in edit mode
  - Previously only worked for new invoices, now works for both create and edit modes
  - Ensures amount paid stays synchronized with total when making edits
- Fixed due date null handling in invoice updates (August 20, 2025):
  - Invoice updates no longer set due date to current timestamp when user leaves due date empty
  - Due date field now properly sends null when not selected instead of defaulting to today's date
  - API payload only includes due date when user explicitly selects a date
- Fixed CGST and SGST display in downloaded invoice PDF (October 6, 2025):
  - Download PDF now shows both percentage (e.g., "9%") and calculated amount (e.g., "₹45.00") for CGST and SGST
  - Previously only showed calculated amounts, now matches the preview/eye view format
  - Updated invoice-management-clean.tsx handleDownloadPDF function to include tax percentage display
- Added Tax % display to HSN reports (October 6, 2025):
  - Reports page HSN section now displays Tax % column using taxRate field from backend API
  - Excel export from Reports page HSN section now includes Tax % column
  - Products Management HSN Report dialog now shows Tax % as a card in the UI
  - Excel export from Products Management HSN Report now includes Tax % field
  - Updated HsnReport type to include taxRate field from backend response
- Added location field to Product Management forms (October 6, 2025):
  - Added "Location" input field to Add Product form
  - Added "Location" input field to Edit Product form
  - Updated Product and ProductInput TypeScript interfaces to include location field
  - Location data is now sent to API when creating or updating products
  - Field includes placeholder text "Warehouse A - Shelf 3" as example
- Added part number search to Invoice Management (October 6, 2025):
  - Added toggle button to switch between normal search and part number search
  - When "Part #" toggle is active, search uses new API endpoint: /invoice/partno/<part number>
  - Normal mode searches by invoice number and customer name (existing functionality)
  - Part number mode searches invoices containing products with specific part number
  - Toggle button changes color when active (default/outline variant)
  - Search placeholder text changes based on active mode
  - Icon in search bar changes between Search and Package icon based on mode
  - Search term clears when switching between modes for better UX
  - Added debounce (500ms) to part number search to prevent API calls on every keystroke
  - Moved loading spinner from entire page to only above the invoices table for better UX
- Fixed profile fetch API endpoint (October 7, 2025):
  - Changed from `/users/{userId}` to `/users/me` endpoint
  - Removed userId parameter requirement from getUserProfile function
  - API now automatically gets user info from authentication token
- Cleaned up Products Management table display (October 7, 2025):
  - Removed duplicate part number from Product Info column
  - Product Info now shows only product name and HSN code
  - Part number remains visible in its dedicated "Part Number" column
- Fixed invoice PDF generation layout and page breaks (October 25, 2025):
  - Added proper page margins (15mm top/bottom, 10mm left/right) for A4 paper
  - Implemented page break handling for multi-page invoices with many items
  - Table header now repeats on each page automatically
  - Table rows prevent breaking across pages for better readability
  - Reduced padding and font sizes for better space utilization
  - Prevented page breaks within billing section, totals, and terms & conditions
  - Fixed alignment issues when invoice spans multiple pages
  - Improved spacing between invoice sections
- Added dedicated API endpoints for dashboard statistics (November 23, 2025):
  - Integrated `/invoice/count` API endpoint to get total invoice count
  - Integrated `/invoice/total-amount` API endpoint to get total revenue
  - Updated dashboard to use dedicated APIs instead of calculating from all invoices on frontend
  - Improved dashboard performance by fetching only required statistics
  - Total Revenue and Total Invoices now come from backend APIs
- Added comprehensive Sales/Invoice Report feature (November 23, 2025):
  - Integrated `/sales/report` API endpoint with date range filtering
  - Created new Sales Report Dialog component with professional design
  - Added as a separate top-level "Sales Report" tab on Reports page (alongside Business, Customer, and HSN Reports)
  - Refactored Reports page to use helper functions with switch statements for cleaner code and better maintainability
  - Features included:
    * Summary cards showing Total Revenue, Total Tax, and Invoice Count
    * Payment Status Pie Chart showing distribution of Paid/Pending/Overdue invoices
    * Top 5 Sales Bar Chart displaying highest value invoices
    * Detailed sales table with invoice number, date, customer, amounts, tax, and payment status
    * Excel export functionality with summary and detailed sales sheets
    * Professional PDF download with A4 layout, color-coded summary cards, and complete sales table
    * PDF includes gradient header, status badges, and print-optimized styling
  - Sales report provides comprehensive analytics for invoice performance tracking
- Refactored Sales Report tab to auto-load data (November 23, 2025):
  - Removed welcome page from Sales Report tab - now directly displays sales data on tab click
  - Sales report data automatically loads based on date range (similar to Business, Customer, and HSN reports)
  - Added date range picker in header for Sales Report (previously hidden)
  - Removed Excel export functionality from Sales Report (kept for other report types)
  - PDF download still available for Sales Report
  - Improved user experience - no extra click needed to view sales data
  - Sales report now integrates seamlessly with other report tabs
  - Removed SalesReportDialog component dependency from Reports page
- Application successfully running on Replit with all features functional