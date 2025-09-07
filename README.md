# Nirvana Website

Frontend SPA (Single Page Application) for the Nirvana App - a professional fintech application providing CVaR risk analysis and Compass Score recommendations.

## Overview

This repository contains the React-based frontend application built with Vite, providing:
- Interactive CVaR risk analysis interface
- Compass Score recommendations and visualization
- Financial instrument search and filtering
- Portfolio analysis tools
- AI-powered financial assistance interface
- Professional fintech user experience

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running (see nirvana-backend repository)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/nirvana-website.git
   cd nirvana-website
   ```

2. **Configure environment:**
   ```bash
   cp nirvana-website.env.template .env
   # Edit .env to point to your backend API
   ```

3. **Install dependencies and start development:**
   ```bash
   make setup
   make dev
   ```

The application will be available at `http://localhost:5173`

### Available Commands

```bash
make help          # Show all available commands
make setup         # Setup development environment
make dev           # Start development server with hot reload
make build         # Build production assets
make start         # Start production server (Docker)
make dev-docker    # Start development server (Docker)
make stop          # Stop all services
make install       # Install dependencies
make test          # Run tests
make lint          # Run linting
make clean         # Clean build artifacts
make prod          # Production build and serve
make health        # Check frontend health
```

## Configuration

### Environment Variables

Key configuration variables (see `.env.template`):

- `VITE_API_BASE` - Backend API URL (e.g., `http://localhost:8000` or `https://api.nirvana.bm`)
- `VITE_HOST` - Development server host (default: `0.0.0.0`)
- `VITE_PORT` - Development server port (default: `5173`)

### API Integration

The frontend communicates with the backend API through:
- **Base URL**: Configured via `VITE_API_BASE` environment variable
- **Authentication**: Basic Auth or JWT tokens
- **CORS**: Handled by backend configuration

## Project Structure

```
nirvana-website/
├── spa/                    # React application source
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── styles/         # Global styles
│   │   └── assets/         # Static assets
│   ├── public/             # Public static files
│   ├── dist/               # Production build output
│   └── package.json        # Dependencies and scripts
├── Dockerfile              # Production container
├── Dockerfile.dev          # Development container
├── docker-compose.yml      # Container orchestration
└── Makefile               # Development commands
```

## Development

### Local Development

1. **Start backend API** (see nirvana-backend repository)
2. **Configure API URL** in `.env` file
3. **Start development server:**
   ```bash
   make dev
   ```

### Docker Development

```bash
make dev-docker
```

### Key Features

#### CVaR Analysis
- Interactive risk visualization
- Portfolio risk assessment
- Historical risk analysis

#### Compass Score
- AI-powered recommendations
- Loss tolerance configuration
- Risk-adjusted scoring

#### Financial Instruments
- Search and filter capabilities
- Detailed instrument information
- Performance metrics

#### User Interface
- Professional fintech design
- Responsive layout
- Accessibility compliance
- Error handling and loading states

## Building for Production

### Local Build

```bash
make build
```

Assets will be generated in `spa/dist/`

### Docker Build

```bash
make docker-build
make start
```

### Production Considerations

- Set `VITE_API_BASE` to production API URL
- Configure proper CORS settings
- Enable production optimizations
- Set up CDN for static assets

## API Integration

### Service Layer

The frontend uses a service layer (`spa/src/services/`) for API communication:

- `http.ts` - HTTP client configuration
- `cvar.ts` - CVaR data services
- `products.ts` - Financial products
- `symbols.ts` - Market symbols
- `ticker.ts` - Ticker information
- `validation.ts` - Data validation

### Error Handling

- Global error boundary for React errors
- HTTP error handling in service layer
- User-friendly error messages
- Retry mechanisms for failed requests

## Styling

### Tailwind CSS

The application uses Tailwind CSS for styling:
- Utility-first CSS framework
- Custom design system
- Responsive design patterns
- Dark/light theme support

### Custom Components

Reusable components in `spa/src/components/`:
- `ComplianceGate` - Compliance checking
- `EnhancedProductDisplay` - Product visualization
- `ErrorBoundary` - Error handling
- `WeatherWidget` - External integrations

## Testing

```bash
make test
```

Test files are located in the `tests/` directory (to be implemented).

## Deployment

### Static Hosting

The built application can be deployed to any static hosting service:
- AWS S3 + CloudFront
- Netlify
- Vercel
- Azure Static Web Apps

### Docker Deployment

```bash
docker compose up -d
```

### Environment-Specific Builds

- **Development**: `VITE_API_BASE=http://localhost:8000`
- **Staging**: `VITE_API_BASE=https://staging-api.nirvana.bm`
- **Production**: `VITE_API_BASE=https://api.nirvana.bm`

## Performance

### Optimization Features

- Code splitting and lazy loading
- Image optimization
- Bundle size optimization
- Caching strategies
- Service worker (PWA ready)

### Monitoring

- Performance metrics
- Error tracking
- User analytics
- API response times

## Security

- Input validation and sanitization
- XSS protection
- CSRF protection
- Secure API communication
- Content Security Policy

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow React and TypeScript best practices
2. Write tests for new components
3. Update documentation
4. Follow the established code style
5. Ensure responsive design

## License

This project is proprietary software. All rights reserved.

## Support

For technical support or questions, contact the development team.