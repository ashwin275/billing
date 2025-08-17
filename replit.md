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
- Application successfully running on Replit with all features functional