# Billing Dashboard

A modern, responsive React-based billing dashboard with comprehensive user and product management capabilities. Built with TypeScript, Tailwind CSS, and integrates with a backend API for complete billing operations.

## Features

- **Modern Authentication System**
  - Split-screen login/signup design with branding
  - Secure JWT token management
  - Password reset functionality
  - Protected routes with automatic redirects

- **Responsive Dashboard**
  - Collapsible sidebar navigation (desktop)
  - Mobile-friendly sliding sidebar
  - Organized navigation by categories
  - Real-time statistics overview

- **User Management**
  - View all users with detailed information
  - Role-based access display
  - Secure user deletion with confirmation
  - Responsive user table with mobile optimization

- **Product Management**
  - Complete CRUD operations (Create, Read, Update, Delete)
  - Comprehensive product forms with validation
  - Pricing management (retail, wholesale, our price)
  - Tax calculations (CGST, SGST)
  - Inventory tracking
  - Product categorization

- **Professional UI/UX**
  - Consistent design system with shadcn/ui components
  - Loading states and error handling
  - Toast notifications for user feedback
  - Form validation with detailed error messages
  - Mobile-responsive design

## Tech Stack

- **Frontend:**
  - React 18 with TypeScript
  - Vite for fast development and building
  - Tailwind CSS for styling
  - shadcn/ui components
  - React Query (TanStack Query) for API state management
  - React Hook Form with Zod validation
  - Wouter for routing

- **Backend Integration:**
  - RESTful API integration
  - JWT authentication
  - Error handling with typed responses

## Prerequisites

Before running this project locally, ensure you have:

- **Node.js** (version 20 or higher) - Required for `import.meta.dirname` support
- **npm** or **yarn** package manager
- **Git** for version control

> **Important for Local Development:** This project uses modern Node.js features that require Node.js 20+. If you encounter path resolution errors, ensure you're using the correct Node.js version.

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd billing-dashboard
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using yarn:
```bash
yarn install
```

### 3. Environment Configuration

Create a `.env` file in the root directory and add your API base URL:

```env
VITE_API_BASE_URL=https://billing-backend.serins.in/api
```

### 4. Start Development Server

Using npm:
```bash
npm run dev
```

Or using yarn:
```bash
yarn dev
```

The application will start on `http://localhost:5000`

## API Integration

The application integrates with the following API endpoints:

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `POST /users/forgot-password` - Password reset
- `GET /country/all` - Get countries list

### User Management
- `GET /users/all` - Get all users
- `DELETE /users/delete/{userId}` - Delete user

### Product Management
- `GET /products/all` - Get all products
- `POST /products/add` - Add products (supports bulk creation)
- `PUT /products/update/{productId}` - Update product
- `DELETE /products/delete/{productId}` - Delete product

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              # Authentication components
│   │   │   ├── dashboard/         # Dashboard-specific components
│   │   │   ├── layout/            # Layout components (header, sidebar)
│   │   │   └── ui/                # Reusable UI components (shadcn)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utility functions and API clients
│   │   ├── pages/                 # Page components
│   │   │   ├── auth/              # Authentication pages
│   │   │   └── dashboard/         # Dashboard pages
│   │   ├── types/                 # TypeScript type definitions
│   │   ├── App.tsx               # Main app component with routing
│   │   ├── main.tsx              # Application entry point
│   │   └── index.css             # Global styles
│   └── index.html                # HTML template
├── server/                       # Express server for development
├── shared/                       # Shared types and schemas
├── .env                         # Environment variables
├── package.json                 # Dependencies and scripts
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Key Features & Usage

### Dashboard Navigation
- **Desktop:** Use the collapse button (☰/✕) in the sidebar to toggle between expanded and minimized view
- **Mobile:** Tap the "Menu" button to open the sliding sidebar

### User Management
1. Navigate to "Add Users" section
2. View all users in a responsive table
3. Delete users with confirmation dialog
4. View user roles and status

### Product Management
1. Navigate to "Products" section
2. **Add Products:** Click "Add Product" button and fill the comprehensive form
3. **Edit Products:** Click the edit icon (✏️) on any product row
4. **Delete Products:** Click the delete icon (🗑️) with confirmation
5. **Product Details:** Include pricing, inventory, tax rates, and categorization

### Authentication Flow
1. **Sign Up:** Complete registration with country selection
2. **Sign In:** Login with email/password
3. **Forgot Password:** Reset password via email
4. **Auto-redirect:** Authenticated users are redirected from auth pages

## Responsive Design

The application is fully responsive across all devices:
- **Mobile (< 768px):** Sliding sidebar, stacked layouts, touch-optimized
- **Tablet (768px - 1024px):** Collapsible sidebar, optimized tables
- **Desktop (> 1024px):** Full sidebar, expanded tables with all columns

## Error Handling

- API errors are handled gracefully with toast notifications
- Form validation with real-time feedback
- Loading states for all async operations
- Fallback error boundaries for critical failures

## Security Features

- JWT token management with automatic expiration
- Protected routes requiring authentication
- Secure API communication
- Input validation and sanitization

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Guidelines

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Consistent naming conventions
- Comprehensive commenting

### Component Structure
- Props interfaces for all components
- Error boundaries where needed
- Reusable UI components
- Responsive design patterns

### API Integration
- Centralized API functions in `lib/api.ts`
- React Query for caching and state management
- Proper error handling and retry logic
- TypeScript interfaces for all API responses

## Troubleshooting

### Common Issues

1. **Development server won't start:**
   - **Node.js Version Error:** If you see `TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined`, upgrade to Node.js 20+
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Verify you're using Node.js 20 or higher: `node --version`

2. **API connection errors:**
   - Verify `.env` file has correct `VITE_API_BASE_URL`
   - Check network connectivity to API server

3. **Build failures:**
   - Run type checking: `npm run type-check`
   - Check for TypeScript errors

4. **Styling issues:**
   - Ensure Tailwind CSS is configured properly
   - Check for conflicting CSS classes

5. **Local Development Setup Issues:**
   - This project was initially built for Replit environment
   - Some Replit-specific dependencies might cause warnings locally
   - Focus on Node.js 20+ requirement for modern ES features

### Performance Optimization

- Images are optimized and served via CDN
- Bundle splitting for optimal loading
- React Query caching reduces API calls
- Lazy loading for non-critical components

## Deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Environment Variables for Production

Ensure these environment variables are set in your production environment:
- `VITE_API_BASE_URL` - Your production API URL

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the troubleshooting section above
- Review API documentation
- Ensure all environment variables are correctly configured

---

*Built with ❤️ using modern web technologies for efficient billing management.*