# Billing Dashboard - Frontend Only

A modern, responsive React billing dashboard that connects to an external API for complete billing operations management.

## Features

- **Modern Authentication System**
  - Secure login/signup with JWT tokens
  - Password reset functionality
  - Protected routes with automatic redirects

- **Responsive Dashboard**
  - Collapsible sidebar navigation (desktop)
  - Mobile-friendly sliding sidebar
  - Real-time statistics overview

- **User Management**
  - View all users with detailed information
  - Role-based access display
  - User deletion with confirmation

- **Product Management**
  - Complete CRUD operations
  - Comprehensive product forms with validation
  - Pricing management (retail, wholesale, our price)
  - Tax calculations (CGST, SGST)
  - Inventory tracking

- **Professional UI/UX**
  - Consistent design system with shadcn/ui
  - Loading states and error handling
  - Toast notifications
  - Form validation with detailed errors
  - Mobile-responsive design

## Tech Stack

- **React 18** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Query** for API state management
- **React Hook Form** with Zod validation
- **Wouter** for routing

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file:
```env
VITE_API_BASE_URL=https://billing-backend.serins.in/api
```

### 3. Run Development Server
```bash
# Use the frontend-only configuration
npm run dev

# Or with custom config
vite --config vite.config.frontend.ts
```

### 4. Access Application
Open your browser to `http://localhost:3000`

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              # Authentication components
│   │   │   ├── dashboard/         # Dashboard features
│   │   │   ├── layout/            # Layout components
│   │   │   └── ui/                # Reusable UI components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utilities and API clients
│   │   ├── pages/                 # Page components
│   │   ├── types/                 # TypeScript definitions
│   │   ├── App.tsx               # Main app with routing
│   │   └── main.tsx              # Application entry point
│   └── index.html                # HTML template
├── attached_assets/              # Static assets
├── .env                         # Environment variables
├── vite.config.frontend.ts      # Frontend Vite config
└── package.json                 # Dependencies
```

## API Integration

The dashboard integrates with these endpoints:

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `POST /users/forgot-password` - Password reset
- `GET /country/all` - Countries list

### User Management
- `GET /users/all` - Get all users
- `DELETE /users/delete/{userId}` - Delete user

### Product Management
- `GET /products/all` - Get all products
- `POST /products/add` - Add products
- `PUT /products/update/{productId}` - Update product
- `DELETE /products/delete/{productId}` - Delete product

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript checking

## Key Features

### Responsive Sidebar
- Desktop: Collapsible with toggle button
- Mobile: Sliding overlay with backdrop
- Smooth animations and transitions

### Authentication Flow
- JWT token management with expiration
- Automatic redirects for protected routes
- Form validation with real-time feedback

### Data Management
- Real-time API integration
- Optimistic updates with error handling
- Caching with React Query
- Loading states throughout

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

### Component Guidelines
- Use TypeScript for all components
- Follow functional component patterns
- Implement proper error boundaries
- Include loading and error states

### Styling
- Use Tailwind CSS utility classes
- Follow responsive design principles
- Maintain consistent spacing and typography
- Use shadcn/ui components when possible

### API Integration
- All API calls in `lib/api.ts`
- Use React Query for state management
- Implement proper error handling
- Type all API responses

## Production Build

```bash
npm run build
```

Built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

*A modern React dashboard for efficient billing management.*