# Nirvana App - Makefile
# Repository: nirvana-app

.PHONY: help setup dev build start stop clean install test lint

# Default target
help:
	@echo "Nirvana App - Development Commands"
	@echo "=================================="
	@echo "Available targets:"
	@echo "  setup       - Setup development environment"
	@echo "  start-dev   - Start development server with hot reloading (http://localhost:5174)"
	@echo "  start-prod  - Start production server (access via nginx)"
	@echo "  build       - Build production assets"
	@echo "  stop        - Stop all services"
	@echo "  install     - Install dependencies"
	@echo "  test        - Run tests"
	@echo "  lint        - Run linting"
	@echo "  clean       - Clean build artifacts and node_modules"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Docker and Docker Compose installed"
	@echo "  - Backend API running (nirvana_backend)"
	@echo "  - nirvana_network created (run 'make setup' in nginx repo)"

# Setup development environment
setup:
	@echo "=== Setting up Nirvana App ==="
	@if [ ! -f ".env" ]; then \
		echo "Creating .env from template..."; \
		cp .env.template .env; \
		echo "Please edit .env file with your backend API URL"; \
	fi
	@echo "Installing dependencies..."
	@cd spa && npm install
	@echo "Setup complete!"

# Install dependencies
install:
	@echo "=== Installing Dependencies ==="
	@cd spa && npm install

# Start development website (access through nginx only)
start-dev:
	@echo "=== Starting Development App with Hot Reloading ==="
	@docker compose up -d app-dev
	@echo "Development server started with hot reloading:"
	@echo "  - nirvana_app_dev (Vite dev server)"
	@echo "  - Access at: http://localhost:5174"
	@echo "  - Changes will be automatically reflected in the browser"
	@echo ""
	@echo "Access through nginx reverse proxy:"
	@echo "  - Start nginx: cd ../nirvana-nginx && make dev"
	@echo "  - Website via proxy: http://localhost/"

# Start production website (access through nginx only)
start-prod:
	@echo "=== Starting Production App ==="
	@docker compose up -d app
	@echo "Production server started in nirvana_network:"
	@echo "  - nirvana_app (Nginx serving static files)"
	@echo ""
	@echo "Access through nginx reverse proxy:"
	@echo "  - Start nginx: cd ../nirvana-nginx && make prod" 
	@echo "  - Website via proxy: http://localhost/"


# Build production assets
build:
	@echo "=== Building Production Assets ==="
	@cd spa && npm run build
	@echo "Build complete! Assets in spa/dist/"

# Stop all services
stop:
	@echo "=== Stopping Services ==="
	@docker compose down

# Run tests
test:
	@echo "=== Running Tests ==="
	@cd spa && npm run test

# Run linting
lint:
	@echo "=== Running Linting ==="
	@cd spa && npm run lint

# Clean build artifacts and node_modules
clean:
	@echo "=== Cleaning Build Artifacts ==="
	@cd spa && rm -rf dist/ node_modules/
	@docker compose down -v
	@echo "Cleanup complete"

# Build Docker images
docker-build:
	@echo "=== Building Docker Images ==="
	@docker compose build --no-cache

# Show logs
logs:
	@docker compose logs -f frontend

# Development with backend
dev-full:
	@echo "=== Starting Full Development Environment ==="
	@echo "Make sure backend is running on http://localhost:8000"
	@cd spa && npm run dev

# Production build and serve
prod:
	@echo "=== Production Build and Serve ==="
	@cd spa && npm run build
	@cd spa && npm run preview

# Health check
health:
	@echo "=== Frontend Health Check ==="
	@curl -s http://localhost:3000 | head -n 5 || echo "Frontend not responding"

# Update dependencies
update:
	@echo "=== Updating Dependencies ==="
	@cd spa && npm update
	@echo "Dependencies updated"