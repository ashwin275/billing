# Contributing to Billing Dashboard

We welcome contributions to the Billing Dashboard project! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a new branch for your feature: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure your environment variables
3. Start the development server: `npm run dev`

## Code Standards

### TypeScript
- Use TypeScript for all new code
- Ensure type safety without `any` types
- Export types from appropriate files

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Include loading and error states
- Follow naming conventions (PascalCase for components)

### Styling
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing using Tailwind scale
- Use shadcn/ui components when available

### API Integration
- Place all API calls in `lib/api.ts`
- Use React Query for state management
- Implement proper error handling
- Type all API responses

## Commit Guidelines

Use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or auxiliary tool changes

Example: `feat: add user profile editing functionality`

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update the README if you've added new features
4. Submit a pull request with:
   - Clear description of changes
   - Screenshots for UI changes
   - Breaking changes noted

## Code Review

- All submissions require review
- Reviewers will check for:
  - Code quality and standards
  - Functionality and testing
  - Documentation updates
  - Performance considerations

## Testing

- Write tests for new features
- Ensure existing tests still pass
- Test responsive design on multiple screen sizes
- Verify API integration works correctly

## Bug Reports

When reporting bugs, include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and device information
- Screenshots if applicable

## Feature Requests

- Check existing issues first
- Provide detailed use case
- Include mockups or examples if helpful
- Discuss implementation approach

## Questions?

- Open an issue for general questions
- Contact maintainers for sensitive issues
- Check existing documentation first

Thank you for contributing!