# Local Development Setup Guide

This guide helps you run the Billing Dashboard on your local machine.

## Quick Fix for the Error You're Seeing

The error `TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined` occurs because the project uses Replit-specific configuration.

### Solution Options:

#### Option 1: Use Node.js 20+ (Recommended)
```bash
# Check your Node.js version
node --version

# If below v20, upgrade Node.js to version 20 or higher
# Visit https://nodejs.org/ to download the latest version
```

#### Option 2: Use the Local Configuration File
```bash
# Use the local-specific Vite config
npm run dev:local
```

#### Option 3: Manual Workaround
If you prefer to modify the project:

1. **Temporarily rename the current config:**
```bash
mv vite.config.ts vite.config.replit.ts
```

2. **Use the local config:**
```bash
mv vite.config.local.ts vite.config.ts
```

3. **Run the development server:**
```bash
npm run dev
```

## Complete Local Setup Steps

### 1. Prerequisites
- Node.js 20+ (required for modern ES modules)
- npm or yarn
- Git

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd BillingDashboard

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Environment Configuration
Create a `.env` file with:
```env
VITE_API_BASE_URL=https://billing-backend.serins.in/api
```

### 4. Run Development Server

**If you get "tsx: command not found" error, use these commands instead:**

```bash
# For macOS/Linux
NODE_ENV=development npx tsx server/index.ts

# For Windows
set NODE_ENV=development && npx tsx server/index.ts

# Or simply (will work on all systems)
npx tsx server/index.ts
```

**Original npm script (if tsx is globally installed):**
```bash
npm run dev
```

### 5. Access the Application
Open your browser and navigate to:
```
http://localhost:5000
```

## Project Structure for Local Development

```
BillingDashboard/
├── client/              # Frontend source code
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities and API clients
│   │   └── types/       # TypeScript definitions
├── server/              # Express server
├── shared/              # Shared types/schemas
├── vite.config.ts       # Replit configuration
├── vite.config.local.ts # Local development configuration
└── package.json
```

## Common Local Development Issues

### 1. "tsx: command not found" Error
Use npx to run the locally installed tsx:
```bash
NODE_ENV=development npx tsx server/index.ts
```

### 2. Port Already in Use
If port 5000 is occupied:
```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9

# Or run on different port
PORT=3000 npx tsx server/index.ts
```

### 3. Module Resolution Errors
Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### 4. TypeScript Errors
Run type checking:
```bash
npx tsc --noEmit
```

### 5. API Connection Issues
Ensure your `.env` file contains the correct API URL and you have internet connectivity.

## Features Available Locally

All features work locally:
- Authentication (Sign in, Sign up, Forgot password)
- Dashboard with collapsible sidebar
- User management
- Product management (CRUD operations)
- Responsive design for mobile/tablet/desktop

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run check
```

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Need Help?

If you continue experiencing issues:
1. Ensure Node.js version is 20+
2. Clear node_modules and reinstall
3. Check that all environment variables are set correctly
4. Verify API connectivity

The dashboard should work identically to the Replit version once properly configured.