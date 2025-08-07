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
- January 8, 2025: Completed migration from Replit Agent to Replit environment
- Fixed invoice subtotal calculation bug - subtotal now correctly sums base prices only (without CGST/SGST)
- Updated both InvoiceTemplate component and PDF download functionality
- Verified all calculation logic in create/edit invoice pages works correctly
- Enhanced pagination system with First/Last buttons, smart page numbering, direct page jump input, and items per page selector
- Fixed product search dialog search text persistence issue - search bar now clears when dialog is closed
- Application successfully running on Replit with all features functional